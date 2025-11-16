/**
 * Score Repository Interface
 */

import { CreateScoreDto, UpdateScoreDto, ScoreResponseDto } from '../dtos/score.dto'
import { IBaseRepository } from './base.repository.interface'

export interface IScoreRepository extends IBaseRepository<ScoreResponseDto, CreateScoreDto, UpdateScoreDto> {
  /**
   * Find scores by category
   */
  findByCategory(categoryId: string): Promise<ScoreResponseDto[]>

  /**
   * Find scores by contestant
   */
  findByContestant(contestantId: string): Promise<ScoreResponseDto[]>

  /**
   * Find scores by judge
   */
  findByJudge(judgeId: string): Promise<ScoreResponseDto[]>

  /**
   * Find score by unique combination
   */
  findByCombination(
    categoryId: string,
    contestantId: string,
    judgeId: string,
    criterionId: string
  ): Promise<ScoreResponseDto | null>

  /**
   * Bulk create scores
   */
  bulkCreate(scores: CreateScoreDto[]): Promise<ScoreResponseDto[]>

  /**
   * Certify scores for category
   */
  certifyScores(categoryId: string): Promise<void>

  /**
   * Find certified scores by category
   */
  findCertifiedByCategory(categoryId: string): Promise<ScoreResponseDto[]>

  /**
   * Find uncertified scores by category
   */
  findUncertifiedByCategory(categoryId: string): Promise<ScoreResponseDto[]>

  /**
   * Calculate total score for contestant in category
   */
  calculateTotalScore(contestantId: string, categoryId: string): Promise<number>

  /**
   * Calculate average score for contestant in category
   */
  calculateAverageScore(contestantId: string, categoryId: string): Promise<number>
}
