import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
interface SubmitScoreData {
    categoryId: string;
    contestantId: string;
    criterionId?: string;
    score?: number;
    comment?: string;
    tenantId: string;
}
export declare class JudgeService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getJudgeIdFromUser(userId: string, tenantId: string): Promise<string | null>;
    getStats(userId: string, tenantId: string): Promise<{
        totalAssignments: number;
        pendingAssignments: number;
        activeAssignments: number;
        completedAssignments: number;
        totalScores: number;
    }>;
    getAssignments(userId: string, userRole: string, tenantId: string): Promise<any>;
    updateAssignmentStatus(assignmentId: string, status: string, userId: string, userRole: string, tenantId: string): Promise<any>;
    getScoringInterface(categoryId: string, userId: string, tenantId: string): Promise<{
        category: {
            id: any;
            name: any;
            description: any;
            scoreCap: any;
        };
        contest: {
            id: any;
            name: any;
            eventName: any;
        };
        criteria: any;
        contestants: any;
        scores: any;
        assignment: {
            id: any;
            status: any;
            assignedAt: any;
        };
    }>;
    submitScore(data: SubmitScoreData, userId: string): Promise<any>;
    getCertificationWorkflow(categoryId: string, userId: string, tenantId: string): Promise<{
        category: any;
        assignment: any;
        certifications: any[];
    }>;
    getContestantBios(categoryId: string, userId: string, tenantId: string): Promise<any>;
    getContestantBio(contestantId: string, userId: string, tenantId: string): Promise<any>;
    getJudgeHistory(userId: string, tenantId: string, query?: any): Promise<{
        scores: {
            id: string;
            contestantId: string;
            comment: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            score: number | null;
            criterionId: string | null;
            judgeId: string;
            categoryId: string;
            allowCommentEdit: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            isCertified: boolean;
            isLocked: boolean;
            lockedAt: Date | null;
            lockedBy: string | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
export {};
//# sourceMappingURL=JudgeService.d.ts.map