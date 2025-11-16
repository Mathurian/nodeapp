import { BaseEntity } from '../models/base.types';
export interface CreateScoreDto {
    categoryId: string;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    value: number;
    comments?: string;
}
export interface UpdateScoreDto {
    value?: number;
    comments?: string;
}
export interface BulkCreateScoresDto {
    scores: CreateScoreDto[];
}
export interface ScoreResponseDto extends BaseEntity {
    categoryId: string;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    value: number;
    comments: string | null;
    certified: boolean;
    certifiedAt: Date | null;
}
export interface ScoreSummaryDto {
    contestantId: string;
    contestantName: string;
    categoryId: string;
    categoryName: string;
    totalScore: number;
    averageScore: number;
    maxPossibleScore: number;
    scorePercentage: number;
    rank: number;
}
export interface CategoryScoresDto {
    categoryId: string;
    categoryName: string;
    contestants: ContestantScoreDto[];
}
export interface ContestantScoreDto {
    contestantId: string;
    contestantName: string;
    contestantNumber: string | null;
    scores: JudgeScoreDto[];
    totalScore: number;
    averageScore: number;
    rank: number;
}
export interface JudgeScoreDto {
    judgeId: string;
    judgeName: string;
    criterionId: string;
    criterionName: string;
    value: number;
    comments: string | null;
}
//# sourceMappingURL=score.dto.d.ts.map