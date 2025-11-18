import { PrismaClient, AssignmentStatus } from '@prisma/client';
import { BaseService } from './BaseService';
export interface CreateAssignmentInput {
    judgeId: string;
    categoryId?: string;
    contestId?: string;
    eventId?: string;
    notes?: string;
    priority?: number;
}
export interface UpdateAssignmentInput {
    status?: AssignmentStatus;
    notes?: string;
    priority?: number;
}
export interface AssignmentFilters {
    status?: string;
    judgeId?: string;
    categoryId?: string;
    contestId?: string;
    eventId?: string;
}
export declare class AssignmentService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getAllAssignments(filters: AssignmentFilters): Promise<any[]>;
    createAssignment(data: CreateAssignmentInput, userId: string): Promise<any>;
    getAssignmentById(id: string): Promise<any>;
    updateAssignment(id: string, data: UpdateAssignmentInput): Promise<any>;
    deleteAssignment(id: string): Promise<void>;
    getAssignmentsForJudge(judgeId: string): Promise<any[]>;
    getAssignmentsForCategory(categoryId: string): Promise<any[]>;
    bulkAssignJudges(categoryId: string, judgeIds: string[], userId: string): Promise<number>;
    getJudges(): Promise<any[]>;
    getContestants(): Promise<any[]>;
    getCategories(): Promise<any[]>;
    getAllContestantAssignments(filters?: {
        categoryId?: string;
        contestId?: string;
    }): Promise<any[]>;
    getCategoryContestants(categoryId: string): Promise<any[]>;
    assignContestantToCategory(categoryId: string, contestantId: string): Promise<any>;
    removeContestantFromCategory(categoryId: string, contestantId: string): Promise<void>;
    createJudge(data: Partial<any>): Promise<any>;
    updateJudge(id: string, data: Partial<any>): Promise<any>;
    deleteJudge(id: string): Promise<void>;
    createContestant(data: Partial<any>): Promise<any>;
    updateContestant(id: string, data: Partial<any>): Promise<any>;
    deleteContestant(id: string): Promise<void>;
    bulkDeleteJudges(judgeIds: string[]): Promise<{
        deletedCount: number;
    }>;
    bulkDeleteContestants(contestantIds: string[]): Promise<{
        deletedCount: number;
    }>;
    removeAllAssignmentsForCategory(categoryId: string): Promise<number>;
}
//# sourceMappingURL=AssignmentService.d.ts.map