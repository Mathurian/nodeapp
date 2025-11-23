const prisma = require('../utils/prisma')
const { createLogger } = require('../utils/logger')

const logger = createLogger('ContestantNumberingService')

/**
 * Service for managing contestant numbering across different modes
 * Supports: MANUAL, AUTO_INDEXED, and OPTIONAL numbering modes
 */
class ContestantNumberingService {
  /**
   * Get the next available contestant number for a contest
   * @param {string} contestId - The contest ID
   * @returns {Promise<number|null>} - Next contestant number or null if not auto-indexed
   */
  async getNextContestantNumber(contestId: string): Promise<number | null> {
    try {
      const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        select: { 
          nextContestantNumber: true, 
          contestantNumberingMode: true,
          event: {
            select: {
              contestantNumberingMode: true
            }
          }
        }
      })

      if (!contest) {
        throw new Error('Contest not found')
      }

      // Check if event-level numbering is auto-indexed
      const numberingMode = contest.contestantNumberingMode || contest.event.contestantNumberingMode

      if (numberingMode !== 'AUTO_INDEXED') {
        return null
      }

      const nextNumber = contest.nextContestantNumber || 1

      // Increment the counter for next time
      await prisma.contest.update({
        where: { id: contestId },
        data: { nextContestantNumber: nextNumber + 1 }
      })

      return nextNumber
    } catch (error) {
      logger.error('Error getting next contestant number', { error })
      throw error
    }
  }

  /**
   * Get the numbering mode for a contest
   * @param {string} contestId - The contest ID
   * @returns {Promise<string>} - The numbering mode (MANUAL, AUTO_INDEXED, OPTIONAL)
   */
  async getNumberingMode(contestId: string): Promise<string> {
    try {
      const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        select: { 
          contestantNumberingMode: true,
          event: {
            select: {
              contestantNumberingMode: true
            }
          }
        }
      })

      if (!contest) {
        throw new Error('Contest not found')
      }

      // Contest-level mode overrides event-level mode
      return contest.contestantNumberingMode || contest.event.contestantNumberingMode
    } catch (error) {
      logger.error('Error getting numbering mode', { error })
      throw error
    }
  }

  /**
   * Validate contestant number based on numbering mode
   * @param {string} contestId - The contest ID
   * @param {number|null} contestantNumber - The contestant number to validate
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validateContestantNumber(contestId: string, contestantNumber: number | null): Promise<{valid: boolean, error?: string}> {
    try {
      const mode = await this.getNumberingMode(contestId)

      if (mode === 'AUTO_INDEXED' && contestantNumber !== null) {
        return { 
          valid: false, 
          error: 'Contestant numbers are auto-assigned for this contest. Do not provide a number.' 
        }
      }

      if (mode === 'MANUAL' && !contestantNumber) {
        return { 
          valid: false, 
          error: 'Contestant number is required for this contest' 
        }
      }

      if (mode === 'OPTIONAL') {
        return { valid: true }
      }

      // Check for duplicate contestant numbers in the same contest
      if (contestantNumber) {
        const existing = await prisma.contestant.findFirst({
          where: {
            contestantNumber: contestantNumber,
            contestContestants: {
              some: {
                contest: {
                  id: contestId
                }
              }
            }
          }
        })

        if (existing) {
          return { 
            valid: false, 
            error: `Contestant number ${contestantNumber} is already assigned in this contest` 
          }
        }
      }

      return { valid: true }
    } catch (error) {
      logger.error('Error validating contestant number', { error })
      return { valid: false, error: 'Error validating contestant number' }
    }
  }

  /**
   * Reset the contestant number counter for a contest
   * @param {string} contestId - The contest ID
   * @param {number} startNumber - Starting number (default: 1)
   */
  async resetContestantNumbering(contestId: string, startNumber: number = 1): Promise<{success: boolean}> {
    try {
      await prisma.contest.update({
        where: { id: contestId },
        data: { nextContestantNumber: startNumber }
      })

      return { success: true }
    } catch (error) {
      logger.error('Error resetting contestant numbering', { error })
      throw error
    }
  }
}

export default new ContestantNumberingService();

