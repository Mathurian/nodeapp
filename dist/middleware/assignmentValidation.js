"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAssignmentQuery = exports.validateBulkAssignmentOperation = exports.validateAssignmentDeletion = exports.validateAssignmentUpdate = exports.validateAssignmentCreation = void 0;
const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/prisma');
const validateAssignmentCreation = async (req, res, next) => {
    try {
        const { judgeId, categoryId, eventId, contestId } = req.body;
        const judge = await prisma.user.findUnique({
            where: { id: judgeId },
            include: { judge: true }
        });
        if (!judge) {
            res.status(404).json({ error: 'Judge not found' });
            return;
        }
        if (judge.role !== 'JUDGE') {
            res.status(400).json({ error: 'User must have JUDGE role to be assigned' });
            return;
        }
        let category = null;
        let contest = null;
        let currentAssignments = null;
        let judgeEventAssignments = null;
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
            });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            if (eventId && category.contest.eventId !== eventId) {
                res.status(400).json({ error: 'Category does not belong to the specified event' });
                return;
            }
            if (contestId && category.contestId !== contestId) {
                res.status(400).json({ error: 'Category does not belong to the specified contest' });
                return;
            }
            contest = category.contest;
        }
        else if (contestId) {
            contest = await prisma.contest.findUnique({
                where: { id: contestId },
                include: { event: true }
            });
            if (!contest) {
                res.status(404).json({ error: 'Contest not found' });
                return;
            }
            if (eventId && contest.eventId !== eventId) {
                res.status(400).json({ error: 'Contest does not belong to the specified event' });
                return;
            }
        }
        else {
            res.status(400).json({ error: 'Either categoryId or contestId is required' });
            return;
        }
        let existingAssignment = null;
        if (category) {
            existingAssignment = await prisma.assignment.findFirst({
                where: {
                    judgeId,
                    categoryId,
                    status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
                }
            });
        }
        else if (contestId) {
            existingAssignment = await prisma.assignment.findFirst({
                where: {
                    judgeId,
                    contestId,
                    categoryId: null,
                    status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
                }
            });
        }
        if (existingAssignment) {
            res.status(400).json({ error: 'Judge is already assigned to this contest/category' });
            return;
        }
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
                        })
                }
            });
            if (overlappingAssignments.length > 0) {
                res.status(400).json({
                    error: 'Judge has overlapping assignments during this event period',
                    conflictingAssignments: overlappingAssignments.map((a) => ({
                        id: a.id,
                        categoryId: a.categoryId,
                        contestId: a.contestId,
                        eventName: contest.event.name
                    }))
                });
                return;
            }
            if (category) {
                currentAssignments = await prisma.assignment.count({
                    where: {
                        categoryId,
                        status: { in: ['ACTIVE'] }
                    }
                });
                const maxJudgesPerCategory = 5;
                if (currentAssignments >= maxJudgesPerCategory) {
                    res.status(400).json({
                        error: `Category has reached maximum judge capacity (${maxJudgesPerCategory})`,
                        currentAssignments,
                        maxCapacity: maxJudgesPerCategory
                    });
                    return;
                }
            }
            judgeEventAssignments = await prisma.assignment.count({
                where: {
                    judgeId,
                    status: { in: ['ACTIVE'] },
                    contestId: contest.id
                }
            });
            const maxAssignmentsPerJudge = 3;
            if (judgeEventAssignments >= maxAssignmentsPerJudge) {
                res.status(400).json({
                    error: `Judge has reached maximum assignments for this contest (${maxAssignmentsPerJudge}); return;`,
                    currentAssignments: judgeEventAssignments,
                    maxCapacity: maxAssignmentsPerJudge
                });
            }
        }
        req.validationData = {
            judge,
            category,
            contest,
            ...(category && { currentAssignments }),
            ...(contest && { judgeEventAssignments })
        };
        next();
    }
    catch (error) {
        const errorObj = error;
        console.error('Assignment validation error:', errorObj);
        res.status(500).json({ error: 'Internal server error during validation' });
    }
};
exports.validateAssignmentCreation = validateAssignmentCreation;
const validateAssignmentUpdate = async (req, res, next) => {
    try {
        const assignmentId = req.params.id || req.params.assignmentId;
        const { status, notes } = req.body;
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
        });
        if (!assignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        const validTransitions = {
            'PENDING': ['ACTIVE', 'CANCELLED'],
            'ACTIVE': ['COMPLETED', 'CANCELLED'],
            'COMPLETED': [],
            'CANCELLED': []
        };
        if (status && typeof status === 'string' && !(validTransitions[assignment.status]?.includes(status))) {
            res.status(400).json({
                error: `Invalid status transition from ${assignment.status} to ${status}`,
                validTransitions: validTransitions[assignment.status] || []
            });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const userRole = req.user.role;
        const allowedStatusChanges = {
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
        if (userRole === 'JUDGE' && assignment.judgeId !== req.user.id) {
            res.status(403).json({
                error: 'Judges can only modify their own assignments'
            });
            return;
        }
        if (status === 'COMPLETED') {
            const requiredScores = await prisma.score.count({
                where: {
                    categoryId: assignment.categoryId,
                    judgeId: assignment.judgeId
                }
            });
            const totalContestants = await prisma.categoryContestant.count({
                where: {
                    categoryId: assignment.categoryId
                }
            });
            if (requiredScores < totalContestants) {
                res.status(400).json({
                    error: 'Cannot complete assignment: not all scores have been submitted',
                    submittedScores: requiredScores,
                    requiredScores: totalContestants
                });
                return;
            }
        }
        req.validationData = {
            assignment,
            validTransitions: validTransitions[assignment.status],
            allowedChanges: allowedStatusChanges[userRole]
        };
        next();
    }
    catch (error) {
        const errorObj = error;
        console.error('Assignment update validation error:', errorObj);
        res.status(500).json({ error: 'Internal server error during validation' });
    }
};
exports.validateAssignmentUpdate = validateAssignmentUpdate;
const validateAssignmentDeletion = async (req, res, next) => {
    try {
        const id = req.params.id || req.params.assignmentId;
        if (!id) {
            res.status(400).json({ error: 'Assignment ID is required' });
            return;
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
        });
        if (!assignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        const deletableStatuses = ['PENDING', 'CANCELLED'];
        if (!deletableStatuses.includes(assignment.status)) {
            res.status(400).json({
                error: `Cannot delete assignment with status ${assignment.status}`,
                deletableStatuses
            });
            return;
        }
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
        if (assignment.categoryId) {
            const dependentScores = await prisma.score.count({
                where: {
                    categoryId: assignment.categoryId,
                    judgeId: assignment.judgeId
                }
            });
            if (dependentScores > 0) {
                res.status(400).json({
                    error: 'Cannot delete assignment: scores have been submitted',
                    dependentScores
                });
                return;
            }
        }
        req.validationData = { assignment };
        next();
    }
    catch (error) {
        console.error('Assignment deletion validation error:', error);
        res.status(500).json({ error: 'Internal server error during validation' });
    }
};
exports.validateAssignmentDeletion = validateAssignmentDeletion;
const validateBulkAssignmentOperation = async (req, res, next) => {
    try {
        const { operation, assignmentIds, data } = req.body;
        if (!operation || !assignmentIds || !Array.isArray(assignmentIds)) {
            res.status(400).json({ error: 'Invalid bulk operation parameters' });
            return;
        }
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
        });
        if (assignments.length !== assignmentIds.length) {
            res.status(400).json({
                error: 'Some assignments not found',
                requested: assignmentIds.length,
                found: assignments.length
            });
            return;
        }
        switch (operation) {
            case 'updateStatus':
                if (!data.status) {
                    res.status(400).json({ error: 'Status is required for update operation' });
                    return;
                }
                break;
            case 'delete':
                const nonDeletable = assignments.filter((a) => !['PENDING', 'CANCELLED'].includes(a.status));
                if (nonDeletable.length > 0) {
                    res.status(400).json({
                        error: 'Some assignments cannot be deleted due to their status',
                        nonDeletable: nonDeletable.map((a) => ({ id: a.id, status: a.status }))
                    });
                    return;
                }
                break;
            default:
                res.status(400).json({ error: 'Invalid bulk operation' });
                return;
        }
        req.validationData = { assignments };
        next();
    }
    catch (error) {
        const errorObj = error;
        console.error('Bulk assignment validation error:', errorObj);
        res.status(500).json({ error: 'Internal server error during validation' });
    }
};
exports.validateBulkAssignmentOperation = validateBulkAssignmentOperation;
const validateAssignmentQuery = async (req, res, next) => {
    try {
        const { status, judgeId, categoryId, eventId, contestId, sortBy, sortOrder } = req.query;
        if (status && !['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
            res.status(400).json({
                error: 'Invalid status filter',
                validStatuses: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']
            });
            return;
        }
        const validSortFields = ['createdAt', 'updatedAt', 'status', 'judgeId', 'categoryId'];
        if (sortBy && typeof sortBy === 'string' && !validSortFields.includes(sortBy)) {
            res.status(400).json({
                error: 'Invalid sort field',
                validFields: validSortFields
            });
            return;
        }
        if (sortOrder && typeof sortOrder === 'string' && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
            res.status(400).json({
                error: 'Invalid sort order',
                validOrders: ['asc', 'desc']
            });
            return;
        }
        if (judgeId) {
            const judge = await prisma.user.findUnique({ where: { id: judgeId } });
            if (!judge) {
                res.status(404).json({ error: 'Judge not found' });
                return;
            }
        }
        if (categoryId) {
            const category = await prisma.category.findUnique({ where: { id: categoryId } });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
        }
        if (eventId) {
            const event = await prisma.event.findUnique({ where: { id: eventId } });
            if (!event) {
                res.status(404).json({ error: 'Event not found' });
                return;
            }
        }
        if (contestId) {
            const contest = await prisma.contest.findUnique({ where: { id: contestId } });
            if (!contest) {
                res.status(404).json({ error: 'Contest not found' });
                return;
            }
        }
        next();
    }
    catch (error) {
        console.error('Assignment query validation error:', error);
        res.status(500).json({ error: 'Internal server error during validation' });
    }
};
exports.validateAssignmentQuery = validateAssignmentQuery;
//# sourceMappingURL=assignmentValidation.js.map