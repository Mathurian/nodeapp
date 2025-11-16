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
    getScoresByCategory(categoryId: string, contestantId?: string): Promise<Score[]>;
    submitScore(data: SubmitScoreDTO, userId: string): Promise<Score>;
    updateScore(scoreId: string, data: UpdateScoreDTO): Promise<Score>;
    deleteScore(scoreId: string): Promise<void>;
    certifyScore(scoreId: string, certifiedBy: string): Promise<Score>;
    certifyScores(categoryId: string, certifiedBy: string): Promise<{
        certified: number;
    }>;
    unsignScore(scoreId: string): Promise<Score>;
    getScoresByJudge(judgeId: string): Promise<Score[]>;
    getScoresByContestant(contestantId: string): Promise<Score[]>;
    getScoresByContest(contestId: string): Promise<Score[]>;
    calculateAverageScore(contestantId: string, categoryId: string): Promise<number>;
    getContestStats(contestId: string): Promise<any>;
}
//# sourceMappingURL=ScoringService.d.ts.map