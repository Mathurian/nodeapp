"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require('../utils/prisma');
class ContestantNumberingService {
    async getNextContestantNumber(contestId) {
        try {
            const contest = await prisma.contest.findUnique({
                where: { id: contestId },
                select: {
                    nextContestantNumber: true,
                    contestantNumberingMode: true,
                    event: {
                        select: {
                            contestantNumberingMode: true
                        }
                    }
                }
            });
            if (!contest) {
                throw new Error('Contest not found');
            }
            const numberingMode = contest.contestantNumberingMode || contest.event.contestantNumberingMode;
            if (numberingMode !== 'AUTO_INDEXED') {
                return null;
            }
            const nextNumber = contest.nextContestantNumber || 1;
            await prisma.contest.update({
                where: { id: contestId },
                data: { nextContestantNumber: nextNumber + 1 }
            });
            return nextNumber;
        }
        catch (error) {
            console.error('Error getting next contestant number:', error);
            throw error;
        }
    }
    async getNumberingMode(contestId) {
        try {
            const contest = await prisma.contest.findUnique({
                where: { id: contestId },
                select: {
                    contestantNumberingMode: true,
                    event: {
                        select: {
                            contestantNumberingMode: true
                        }
                    }
                }
            });
            if (!contest) {
                throw new Error('Contest not found');
            }
            return contest.contestantNumberingMode || contest.event.contestantNumberingMode;
        }
        catch (error) {
            console.error('Error getting numbering mode:', error);
            throw error;
        }
    }
    async validateContestantNumber(contestId, contestantNumber) {
        try {
            const mode = await this.getNumberingMode(contestId);
            if (mode === 'AUTO_INDEXED' && contestantNumber !== null) {
                return {
                    valid: false,
                    error: 'Contestant numbers are auto-assigned for this contest. Do not provide a number.'
                };
            }
            if (mode === 'MANUAL' && !contestantNumber) {
                return {
                    valid: false,
                    error: 'Contestant number is required for this contest'
                };
            }
            if (mode === 'OPTIONAL') {
                return { valid: true };
            }
            if (contestantNumber) {
                const existing = await prisma.contestant.findFirst({
                    where: {
                        contestantNumber: contestantNumber,
                        contestContestants: {
                            some: {
                                contest: {
                                    id: contestId
                                }
                            }
                        }
                    }
                });
                if (existing) {
                    return {
                        valid: false,
                        error: `Contestant number ${contestantNumber} is already assigned in this contest`
                    };
                }
            }
            return { valid: true };
        }
        catch (error) {
            console.error('Error validating contestant number:', error);
            return { valid: false, error: 'Error validating contestant number' };
        }
    }
    async resetContestantNumbering(contestId, startNumber = 1) {
        try {
            await prisma.contest.update({
                where: { id: contestId },
                data: { nextContestantNumber: startNumber }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error resetting contestant numbering:', error);
            throw error;
        }
    }
}
exports.default = new ContestantNumberingService();
//# sourceMappingURL=contestantNumberingService.js.map