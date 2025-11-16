"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContestAssignment = exports.validateCategoryAssignment = exports.hasEventAssignment = exports.hasContestAssignment = exports.hasCategoryAssignment = void 0;
const prisma = require('./prisma');
const hasCategoryAssignment = async (userId, role, categoryId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    if (!user || user.role === 'ADMIN') {
        return true;
    }
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: {
            id: true,
            contestId: true,
            contest: {
                select: {
                    id: true,
                    eventId: true,
                    event: {
                        select: {
                            id: true
                        }
                    }
                }
            }
        }
    });
    if (!category) {
        return false;
    }
    const assignment = await prisma.roleAssignment.findFirst({
        where: {
            userId,
            role,
            isActive: true,
            OR: [
                { categoryId },
                { contestId: category.contestId },
                { eventId: category.contest.eventId }
            ]
        }
    });
    return !!assignment;
};
exports.hasCategoryAssignment = hasCategoryAssignment;
const hasContestAssignment = async (userId, role, contestId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    if (!user || user.role === 'ADMIN') {
        return true;
    }
    const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        include: {
            event: true
        }
    });
    if (!contest) {
        return false;
    }
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
    });
    return !!assignment;
};
exports.hasContestAssignment = hasContestAssignment;
const hasEventAssignment = async (userId, role, eventId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    if (!user || user.role === 'ADMIN') {
        return true;
    }
    const assignment = await prisma.roleAssignment.findFirst({
        where: {
            userId,
            role,
            isActive: true,
            eventId
        }
    });
    return !!assignment;
};
exports.hasEventAssignment = hasEventAssignment;
const validateCategoryAssignment = async (userId, userRole, categoryId) => {
    const scopedRoles = ['TALLY_MASTER', 'AUDITOR', 'BOARD'];
    if (!scopedRoles.includes(userRole)) {
        return;
    }
    const hasAssignment = await (0, exports.hasCategoryAssignment)(userId, userRole, categoryId);
    if (!hasAssignment) {
        throw new Error('Not assigned to this category');
    }
};
exports.validateCategoryAssignment = validateCategoryAssignment;
const validateContestAssignment = async (userId, userRole, contestId) => {
    const scopedRoles = ['TALLY_MASTER', 'AUDITOR', 'BOARD'];
    if (!scopedRoles.includes(userRole)) {
        return;
    }
    const hasAssignment = await (0, exports.hasContestAssignment)(userId, userRole, contestId);
    if (!hasAssignment) {
        throw new Error('Not assigned to this contest');
    }
};
exports.validateContestAssignment = validateContestAssignment;
//# sourceMappingURL=roleAssignmentCheck.js.map