import { Score } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
export type ScoreWithRelations = any;
export declare class ScoreRepository extends BaseRepository<Score> {
    protected getModelName(): string;
    findByEvent(eventId: string, tenantId: string): Promise<ScoreWithRelations[]>;
    findByContest(contestId: string, tenantId: string): Promise<ScoreWithRelations[]>;
    findByCategory(categoryId: string, tenantId: string): Promise<ScoreWithRelations[]>;
    findByJudge(judgeId: string, tenantId: string): Promise<ScoreWithRelations[]>;
    findByContestant(contestantId: string, tenantId: string): Promise<ScoreWithRelations[]>;
    findByJudgeContestantCategory(judgeId: string, contestantId: string, categoryId: string, tenantId: string): Promise<Score | null>;
    getAverageScoreForContestantInCategory(contestantId: string, categoryId: string, tenantId: string): Promise<number>;
    getTotalScoreForContestantInContest(contestantId: string, contestId: string, tenantId: string): Promise<number>;
    getContestantScoresByCategory(contestantId: string, contestId: string, tenantId: string): Promise<Array<{
        categoryId: string;
        categoryName: string;
        averageScore: number;
        judgeCount: number;
    }>>;
    getJudgeCompletionStatus(contestId: string, tenantId: string): Promise<Array<{
        judgeId: string;
        judgeName: string;
        totalScores: number;
        expectedScores: number;
    }>>;
    bulkCreateScores(scores: Array<{
        judgeId: string;
        contestantId: string;
        categoryId: string;
        contestId: string;
        tenantId: string;
        value: number;
    }>): Promise<number>;
    deleteByContest(contestId: string, tenantId: string): Promise<number>;
    getContestScoreStats(contestId: string, tenantId: string): Promise<{
        totalScores: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
    }>;
}
//# sourceMappingURL=ScoreRepository.d.ts.map