import { Score, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
export type ScoreWithRelations = Prisma.ScoreGetPayload<{
    include: {
        judge: true;
        contestant: true;
        category: true;
        contest: true;
    };
}>;
export declare class ScoreRepository extends BaseRepository<Score> {
    protected getModelName(): string;
    findByEvent(eventId: string): Promise<ScoreWithRelations[]>;
    findByContest(contestId: string): Promise<ScoreWithRelations[]>;
    findByCategory(categoryId: string): Promise<ScoreWithRelations[]>;
    findByJudge(judgeId: string): Promise<ScoreWithRelations[]>;
    findByContestant(contestantId: string): Promise<ScoreWithRelations[]>;
    findByJudgeContestantCategory(judgeId: string, contestantId: string, categoryId: string): Promise<Score | null>;
    getAverageScoreForContestantInCategory(contestantId: string, categoryId: string): Promise<number>;
    getTotalScoreForContestantInContest(contestantId: string, contestId: string): Promise<number>;
    getContestantScoresByCategory(contestantId: string, contestId: string): Promise<Array<{
        categoryId: string;
        categoryName: string;
        averageScore: number;
        judgeCount: number;
    }>>;
    getJudgeCompletionStatus(contestId: string): Promise<Array<{
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
        value: number;
    }>): Promise<number>;
    deleteByContest(contestId: string): Promise<number>;
    getContestScoreStats(contestId: string): Promise<{
        totalScores: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
    }>;
}
//# sourceMappingURL=ScoreRepository.d.ts.map