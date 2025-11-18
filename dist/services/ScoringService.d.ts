import { Score, PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
import { ScoreRepository } from '../repositories/ScoreRepository';
export interface SubmitScoreDTO {
    categoryId: string;
    contestantId: string;
    criteriaId?: string;
    score: number;
    comments?: string;
    judgeId?: string;
}
export interface UpdateScoreDTO {
    score?: number;
    comments?: string;
}
export declare class ScoringService extends BaseService {
    private scoreRepository;
    private prisma;
    constructor(scoreRepository: ScoreRepository, prisma: PrismaClient);
    getScoresByCategory(categoryId: string, tenantId: string, contestantId?: string): Promise<Score[]>;
    submitScore(data: SubmitScoreDTO, userId: string, tenantId: string): Promise<Score>;
    updateScore(scoreId: string, data: UpdateScoreDTO, tenantId: string): Promise<Score>;
    deleteScore(scoreId: string, tenantId: string): Promise<void>;
    certifyScore(scoreId: string, certifiedBy: string, tenantId: string): Promise<Score>;
    certifyScores(categoryId: string, certifiedBy: string, tenantId: string): Promise<{
        certified: number;
    }>;
    unsignScore(scoreId: string, tenantId: string): Promise<Score>;
    getScoresByJudge(judgeId: string, tenantId: string): Promise<Score[]>;
    getScoresByContestant(contestantId: string, tenantId: string): Promise<Score[]>;
    getScoresByContest(contestId: string, tenantId: string): Promise<Score[]>;
    calculateAverageScore(contestantId: string, categoryId: string, tenantId: string): Promise<number>;
    getContestStats(contestId: string, tenantId: string): Promise<any>;
}
//# sourceMappingURL=ScoringService.d.ts.map