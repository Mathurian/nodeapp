import { CreateScoreDto, UpdateScoreDto, ScoreResponseDto } from '../dtos/score.dto';
import { IBaseRepository } from './base.repository.interface';
export interface IScoreRepository extends IBaseRepository<ScoreResponseDto, CreateScoreDto, UpdateScoreDto> {
    findByCategory(categoryId: string): Promise<ScoreResponseDto[]>;
    findByContestant(contestantId: string): Promise<ScoreResponseDto[]>;
    findByJudge(judgeId: string): Promise<ScoreResponseDto[]>;
    findByCombination(categoryId: string, contestantId: string, judgeId: string, criterionId: string): Promise<ScoreResponseDto | null>;
    bulkCreate(scores: CreateScoreDto[]): Promise<ScoreResponseDto[]>;
    certifyScores(categoryId: string): Promise<void>;
    findCertifiedByCategory(categoryId: string): Promise<ScoreResponseDto[]>;
    findUncertifiedByCategory(categoryId: string): Promise<ScoreResponseDto[]>;
    calculateTotalScore(contestantId: string, categoryId: string): Promise<number>;
    calculateAverageScore(contestantId: string, categoryId: string): Promise<number>;
}
//# sourceMappingURL=score.repository.interface.d.ts.map