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
    getAssignments(userId: string, userRole: string, tenantId: string): Promise<{
        status: import(".prisma/client").$Enums.AssignmentStatus;
        id: string;
        judgeId: string;
        tenantId: string;
        eventId: string;
        categoryId: string | null;
        contestId: string;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
        priority: number;
    }[]>;
    updateAssignmentStatus(assignmentId: string, status: string, userId: string, userRole: string, tenantId: string): Promise<{
        status: import(".prisma/client").$Enums.AssignmentStatus;
        id: string;
        judgeId: string;
        tenantId: string;
        eventId: string;
        categoryId: string | null;
        contestId: string;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
        priority: number;
    }>;
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
            id: string;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            assignedAt: Date;
        };
    }>;
    submitScore(data: SubmitScoreData, userId: string): Promise<any>;
    getCertificationWorkflow(categoryId: string, userId: string, tenantId: string): Promise<{
        category: any;
        assignment: {
            status: import(".prisma/client").$Enums.AssignmentStatus;
            id: string;
            judgeId: string;
            tenantId: string;
            eventId: string;
            categoryId: string | null;
            contestId: string;
            assignedAt: Date;
            assignedBy: string;
            notes: string | null;
            priority: number;
        };
        certifications: any[];
    }>;
    getContestantBios(categoryId: string, userId: string, tenantId: string): Promise<any>;
    getContestantBio(contestantId: string, userId: string, tenantId: string): Promise<any>;
    getJudgeHistory(userId: string, tenantId: string, query?: any): Promise<{
        scores: ({
            category: never;
            contestant: never;
            criterion: never;
        } & {
            score: number | null;
            id: string;
            judgeId: string;
            contestantId: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isLocked: boolean;
            lockedAt: Date | null;
            categoryId: string;
            criterionId: string | null;
            allowCommentEdit: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            comment: string | null;
            isCertified: boolean;
            lockedBy: string | null;
        })[];
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