import { CreateScoreDto, UpdateScoreDto, BulkCreateScoresDto, ScoreResponseDto, ScoreSummaryDto, CategoryScoresDto } from '../dtos/score.dto';
export interface IScoreService {
    createScore(data: CreateScoreDto): Promise<ScoreResponseDto>;
    bulkCreateScores(data: BulkCreateScoresDto): Promise<ScoreResponseDto[]>;
    getScoreById(id: string): Promise<ScoreResponseDto | null>;
    getScoresByCategory(categoryId: string): Promise<CategoryScoresDto>;
    getScoresByContestant(contestantId: string): Promise<ScoreResponseDto[]>;
    getScoresByJudge(judgeId: string): Promise<ScoreResponseDto[]>;
    updateScore(id: string, data: UpdateScoreDto): Promise<ScoreResponseDto>;
    deleteScore(id: string): Promise<void>;
    certifyScores(categoryId: string, userId: string): Promise<void>;
    calculateScoreSummary(contestantId: string, categoryId: string): Promise<ScoreSummaryDto>;
    calculateRankings(categoryId: string): Promise<ScoreSummaryDto[]>;
    validateScore(categoryId: string, value: number): Promise<boolean>;
}
//# sourceMappingURL=score.service.interface.d.ts.map