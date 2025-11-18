/**
 * Utility functions for validating RoleAssignment records
 * Used to ensure users with scoped roles (TALLY_MASTER, AUDITOR, BOARD)
 * can only access resources they are assigned to.
 */

import { PrismaClient } from '@prisma/client';

const prisma: PrismaClient = require('./prisma');

/**
 * Check if a user has a RoleAssignment for a specific category
 */
export const hasCategoryAssignment = async (userId: string, role: string, categoryId: string): Promise<boolean> => {
  // ADMIN bypass
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || user.role === 'ADMIN') {
    return true
  }

  // Get category to find contest and event IDs
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      contestId: true
    }
  })

  if (!category) {
    return false
  }

  // Get contest to find event ID
  const contest = await prisma.contest.findUnique({
    where: { id: category.contestId },
    select: { eventId: true }
  })

  if (!contest) {
    return false
  }

  // Check for RoleAssignment at category, contest, or event level
  const assignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      role,
      isActive: true,
      OR: [
        { categoryId },
        { contestId: category.contestId },
        { eventId: contest.eventId }
      ]
    }
  })

  return !!assignment
}

/**
 * Check if a user has a RoleAssignment for a specific contest
 */
export const hasContestAssignment = async (userId: string, role: string, contestId: string): Promise<boolean> => {
  // ADMIN bypass
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || user.role === 'ADMIN') {
    return true
  }

  // Get contest to find event ID
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      eventId: true
    }
  })

  if (!contest) {
    return false
  }

  // Check for RoleAssignment at contest or event level
  const assignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      role,
      isActive: true,
      OR: [
        { contestId },
        { eventId: contest.eventId }
      ]
    }
  })

  return !!assignment
}

/**
 * Check if a user has a RoleAssignment for a specific event
 */
export const hasEventAssignment = async (userId: string, role: string, eventId: string): Promise<boolean> => {
  // ADMIN bypass
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || user.role === 'ADMIN') {
    return true
  }

  // Check for RoleAssignment at event level
  const assignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      role,
      isActive: true,
      eventId
    }
  })

  return !!assignment
}

/**
 * Validate RoleAssignment before allowing access to a category
 * Throws an error if validation fails
 */
export const validateCategoryAssignment = async (userId: string, userRole: string, categoryId: string): Promise<void> => {
  // Only validate for scoped roles
  const scopedRoles = ['TALLY_MASTER', 'AUDITOR', 'BOARD']
  if (!scopedRoles.includes(userRole)) {
    return // Not a scoped role, no validation needed
  }

  const hasAssignment = await hasCategoryAssignment(userId, userRole, categoryId)
  if (!hasAssignment) {
    throw new Error('Not assigned to this category')
  }
}

/**
 * Validate RoleAssignment before allowing access to a contest
 * Throws an error if validation fails
 */
export const validateContestAssignment = async (userId: string, userRole: string, contestId: string): Promise<void> => {
  // Only validate for scoped roles
  const scopedRoles = ['TALLY_MASTER', 'AUDITOR', 'BOARD']
  if (!scopedRoles.includes(userRole)) {
    return // Not a scoped role, no validation needed
  }

  const hasAssignment = await hasContestAssignment(userId, userRole, contestId)
  if (!hasAssignment) {
    throw new Error('Not assigned to this contest')
  }
}


