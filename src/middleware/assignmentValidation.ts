import { Request, Response, NextFunction } from 'express';

const prisma = require('../utils/prisma')

// Assignment Validation Middleware Functions

// Validate assignment creation
const validateAssignmentCreation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { judgeId, categoryId, eventId, contestId } = req.body

    // Check if judge exists and has JUDGE role
    const judge = await prisma.user.findUnique({
      where: { id: judgeId },
      include: { judge: true }
    })

    if (!judge) {
      res.status(404).json({ error: 'Judge not found' }); return;
    }

    if (judge.role !== 'JUDGE') {
      res.status(400).json({ error: 'User must have JUDGE role to be assigned' }); return;
    }

    let category = null
    let contest = null
    let currentAssignments = null
    let judgeEventAssignments = null
    
    // If categoryId is provided, validate category
    if (categoryId) {
      category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          contest: {
            include: {
              event: true
            }
          }
        }
      })

      if (!category) {
        res.status(404).json({ error: 'Category not found' }); return;
      }

      // Validate event and contest relationships
      if (eventId && category.contest.eventId !== eventId) {
        res.status(400).json({ error: 'Category does not belong to the specified event' }); return;
      }

      if (contestId && category.contestId !== contestId) {
        res.status(400).json({ error: 'Category does not belong to the specified contest' }); return;
      }
      
      contest = category.contest
    } else if (contestId) {
      // If contestId provided without categoryId, validate contest
      contest = await prisma.contest.findUnique({
        where: { id: contestId },
        include: { event: true }
      })

      if (!contest) {
        res.status(404).json({ error: 'Contest not found' }); return;
      }

      if (eventId && contest.eventId !== eventId) {
        res.status(400).json({ error: 'Contest does not belong to the specified event' }); return;
      }
    } else {
      res.status(400).json({ error: 'Either categoryId or contestId is required' }); return;
    }

    // Check for existing assignment
    // For category-level assignments, check exact match
    // For contest-level assignments, check if judge has ANY assignment to this contest
    let existingAssignment = null
    
    if (category) {
      // Category-level assignment - check for exact category assignment
      existingAssignment = await prisma.assignment.findFirst({
        where: { 
          judgeId, 
          categoryId, 
          status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] } 
        }
      })
    } else if (contestId) {
      // Contest-level assignment - check for contest-level assignment only
      existingAssignment = await prisma.assignment.findFirst({
        where: { 
          judgeId, 
          contestId, 
          categoryId: null,  // Only contest-level
          status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] } 
        }
      })
    }

    if (existingAssignment) {
      res.status(400).json({ error: 'Judge is already assigned to this contest/category' }); return;
    }

    // Check judge availability (no overlapping assignments) - only if contest available
    if (contest) {
      const overlappingAssignments = await prisma.assignment.findMany({
        where: {
          judgeId,
          status: { in: ['ACTIVE'] },
          ...(category 
            ? {
                category: {
                  contest: {
                    event: {
                      startDate: { lte: contest.event.endDate },
                      endDate: { gte: contest.event.startDate }
                    }
                  }
                }
              }
            : {
                contest: {
                  event: {
                    startDate: { lte: contest.event.endDate },
                    endDate: { gte: contest.event.startDate }
                  }
                }
              }
          )
        }
      })

      if (overlappingAssignments.length > 0) {
        res.status(400).json({ 
          error: 'Judge has overlapping assignments during this event period',
          conflictingAssignments: overlappingAssignments.map((a: any) => ({
            id: a.id,
            categoryId: a.categoryId,
            contestId: a.contestId,
            eventName: contest.event.name
          }))
        });
        return;
      }

      // Check category capacity (max judges per category) - only if category
      if (category) {
        currentAssignments = await prisma.assignment.count({
          where: {
            categoryId,
            status: { in: ['ACTIVE'] }
          }
        })

        const maxJudgesPerCategory = 5
        if (currentAssignments >= maxJudgesPerCategory) {
          res.status(400).json({ 
            error: `Category has reached maximum judge capacity (${maxJudgesPerCategory})`,
            currentAssignments,
            maxCapacity: maxJudgesPerCategory
          });
          return;
        }
      }

      // Check judge workload (max assignments per judge per event)
      judgeEventAssignments = await prisma.assignment.count({
        where: {
          judgeId,
          status: { in: ['ACTIVE'] },
          contestId: contest.id
        }
      })

      const maxAssignmentsPerJudge = 3
      if (judgeEventAssignments >= maxAssignmentsPerJudge) {
        res.status(400).json({ 
          error: `Judge has reached maximum assignments for this contest (${maxAssignmentsPerJudge}); return;`,
          currentAssignments: judgeEventAssignments,
          maxCapacity: maxAssignmentsPerJudge
        })
      }
    }

    // Add validation data to request for use in controller
    req.validationData = {
      judge,
      category,
      contest,
      ...(category && { currentAssignments }),
      ...(contest && { judgeEventAssignments })
    }

    next();
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    console.error('Assignment validation error:', errorObj);
    res.status(500).json({ error: 'Internal server error during validation' });
  }
};

// Validate assignment update
const validateAssignmentUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = req.params.id || req.params.assignmentId
    const { status, notes } = req.body

    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        judge: {
          include: {
            user: true
          }
        },
        category: {
          include: {
            contest: {
              include: {
                event: true
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' }); return;
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['ACTIVE', 'CANCELLED'],
      'ACTIVE': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // No transitions from completed
      'CANCELLED': [] // No transitions from cancelled
    };

    if (status && typeof status === 'string' && !(validTransitions[assignment.status]?.includes(status))) {
      res.status(400).json({ 
        error: `Invalid status transition from ${assignment.status} to ${status}`,
        validTransitions: validTransitions[assignment.status] || []
      });
      return;
    }

    // Validate user permissions for status changes
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const userRole = req.user.role;
    const allowedStatusChanges: Record<string, string[]> = {
      'JUDGE': ['ACTIVE', 'COMPLETED'],
      'ORGANIZER': ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      'BOARD': ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      'ADMIN': ['ACTIVE', 'COMPLETED', 'CANCELLED']
    };

    if (status && !(allowedStatusChanges[userRole]?.includes(status))) {
      res.status(403).json({ 
        error: `User role ${userRole} is not authorized to change status to ${status}`,
        allowedChanges: allowedStatusChanges[userRole]
      });
      return;
    }

    // Special validation for judge accepting/rejecting their own assignment
    if (userRole === 'JUDGE' && assignment.judgeId !== req.user.id) {
      res.status(403).json({ 
        error: 'Judges can only modify their own assignments' 
      });
      return;
    }

    // Validate completion requirements
    if (status === 'COMPLETED') {
      // Check if all required scores are submitted
      const requiredScores = await prisma.score.count({
        where: {
          categoryId: assignment.categoryId,
          judgeId: assignment.judgeId
        }
      })

      const totalContestants = await prisma.categoryContestant.count({
        where: {
          categoryId: assignment.categoryId
        }
      })

      if (requiredScores < totalContestants) {
        res.status(400).json({ 
          error: 'Cannot complete assignment: not all scores have been submitted',
          submittedScores: requiredScores,
          requiredScores: totalContestants
        });
        return;
      }
    }

    // Add validation data to request
    req.validationData = {
      assignment,
      validTransitions: validTransitions[assignment.status as keyof typeof validTransitions],
      allowedChanges: allowedStatusChanges[userRole]
    };

    next();
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    console.error('Assignment update validation error:', errorObj);
    res.status(500).json({ error: 'Internal server error during validation' });
  }
};

// Validate assignment deletion
const validateAssignmentDeletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id || req.params.assignmentId

    if (!id) {
      res.status(400).json({ error: 'Assignment ID is required' }); return;
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        judge: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        category: {
          include: {
            contest: {
              include: {
                event: true
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' }); return;
    }

    // Check if assignment can be deleted
    const deletableStatuses = ['PENDING', 'CANCELLED']
    if (!deletableStatuses.includes(assignment.status)) {
      res.status(400).json({ 
        error: `Cannot delete assignment with status ${assignment.status}`,
        deletableStatuses
      });
      return;
    }

    // Check user permissions
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const userRole = req.user.role;
    const canDelete = ['ORGANIZER', 'BOARD', 'ADMIN'].includes(userRole) || 
                     (userRole === 'JUDGE' && assignment.judgeId === req.user.id);

    if (!canDelete) {
      res.status(403).json({ 
        error: 'Insufficient permissions to delete this assignment' 
      });
      return;
    }

    // Check for dependent data (only if category-level assignment)
    if (assignment.categoryId) {
      const dependentScores = await prisma.score.count({
        where: {
          categoryId: assignment.categoryId,
          judgeId: assignment.judgeId
        }
      })

      if (dependentScores > 0) {
        res.status(400).json({ 
          error: 'Cannot delete assignment: scores have been submitted',
          dependentScores
        }); return;
      }
    }

    req.validationData = { assignment }
    next()
  } catch (error) {
    console.error('Assignment deletion validation error:', error)
    res.status(500).json({ error: 'Internal server error during validation' })
  }
}

// Validate bulk assignment operations
const validateBulkAssignmentOperation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { operation, assignmentIds, data } = req.body

    if (!operation || !assignmentIds || !Array.isArray(assignmentIds)) {
      res.status(400).json({ error: 'Invalid bulk operation parameters' });
      return;
    }

    // Check if all assignments exist
    const assignments = await prisma.assignment.findMany({
      where: {
        id: { in: assignmentIds }
      },
      include: {
        judge: {
          include: {
            user: true
          }
        },
        category: {
          include: {
            contest: {
              include: {
                event: true
              }
            }
          }
        }
      }
    })

    if (assignments.length !== assignmentIds.length) {
      res.status(400).json({ 
        error: 'Some assignments not found',
        requested: assignmentIds.length,
        found: assignments.length
      }); return;
    }

    // Validate operation-specific requirements
    switch (operation) {
      case 'updateStatus':
        if (!data.status) {
          res.status(400).json({ error: 'Status is required for update operation' }); return;
        }
        break
      case 'delete':
        // Check if all assignments can be deleted
        const nonDeletable = assignments.filter((a: any) => 
          !['PENDING', 'CANCELLED'].includes(a.status)
        );
        if (nonDeletable.length > 0) {
          res.status(400).json({ 
            error: 'Some assignments cannot be deleted due to their status',
            nonDeletable: nonDeletable.map((a: any) => ({ id: a.id, status: a.status }))
          });
          return;
        }
        break
      default:
        res.status(400).json({ error: 'Invalid bulk operation' });
        return;
    }

    req.validationData = { assignments };
    next();
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    console.error('Bulk assignment validation error:', errorObj);
    res.status(500).json({ error: 'Internal server error during validation' });
  }
};

// Validate assignment query parameters
const validateAssignmentQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, judgeId, categoryId, eventId, contestId, sortBy, sortOrder } = req.query

    // Validate status filter
    if (status && !['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status as string)) {
      res.status(400).json({ 
        error: 'Invalid status filter',
        validStatuses: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']
      });
      return;
    }

    // Validate sort parameters
    const validSortFields = ['createdAt', 'updatedAt', 'status', 'judgeId', 'categoryId'];
    if (sortBy && typeof sortBy === 'string' && !validSortFields.includes(sortBy)) {
      res.status(400).json({ 
        error: 'Invalid sort field',
        validFields: validSortFields
      }); return;
    }

    if (sortOrder && typeof sortOrder === 'string' && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
      res.status(400).json({ 
        error: 'Invalid sort order',
        validOrders: ['asc', 'desc']
      }); return;
    }

    // Validate ID parameters exist
    if (judgeId) {
      const judge = await prisma.user.findUnique({ where: { id: judgeId } })
      if (!judge) {
        res.status(404).json({ error: 'Judge not found' }); return;
      }
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        res.status(404).json({ error: 'Category not found' }); return;
      }
    }

    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } })
      if (!event) {
        res.status(404).json({ error: 'Event not found' }); return;
      }
    }

    if (contestId) {
      const contest = await prisma.contest.findUnique({ where: { id: contestId } })
      if (!contest) {
        res.status(404).json({ error: 'Contest not found' }); return;
      }
    }

    next()
  } catch (error) {
    console.error('Assignment query validation error:', error)
    res.status(500).json({ error: 'Internal server error during validation' })
  }
}

export { 
  validateAssignmentCreation,
  validateAssignmentUpdate,
  validateAssignmentDeletion,
  validateBulkAssignmentOperation,
  validateAssignmentQuery
 }
