/**
 * Score Service Interface
 */

import {
  CreateScoreDto,
  UpdateScoreDto,
  BulkCreateScoresDto,
  ScoreResponseDto,
  ScoreSummaryDto,
  CategoryScoresDto,
} from '../dtos/score.dto'

export interface IScoreService {
  /**
   * Create a new score
   */
  createScore(data: CreateScoreDto): Promise<ScoreResponseDto>

  /**
   * Create multiple scores at once
   */
  bulkCreateScores(data: BulkCreateScoresDto): Promise<ScoreResponseDto[]>

  /**
   * Get score by ID
   */
  getScoreById(id: string): Promise<ScoreResponseDto | null>

  /**
   * Get scores by category
   */
  getScoresByCategory(categoryId: string): Promise<CategoryScoresDto>

  /**
   * Get scores by contestant
   */
  getScoresByContestant(contestantId: string): Promise<ScoreResponseDto[]>

  /**
   * Get scores by judge
   */
  getScoresByJudge(judgeId: string): Promise<ScoreResponseDto[]>

  /**
   * Update score
   */
  updateScore(id: string, data: UpdateScoreDto): Promise<ScoreResponseDto>

  /**
   * Delete score
   */
  deleteScore(id: string): Promise<void>

  /**
   * Certify scores for a category
   */
  certifyScores(categoryId: string, userId: string): Promise<void>

  /**
   * Calculate score summary for contestant
   */
  calculateScoreSummary(contestantId: string, categoryId: string): Promise<ScoreSummaryDto>

  /**
   * Calculate rankings for category
   */
  calculateRankings(categoryId: string): Promise<ScoreSummaryDto[]>

  /**
   * Validate score value
   */
  validateScore(categoryId: string, value: number): Promise<boolean>
}
