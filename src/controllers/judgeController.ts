import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { JudgeService } from '../services/JudgeService';
import { sendSuccess } from '../utils/responseHelpers';

export class JudgeController {
  private judgeService: JudgeService;

  constructor() {
    this.judgeService = container.resolve(JudgeService);
  }

  /**
   * Get judge dashboard statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const stats = await this.judgeService.getStats(user.id);
      sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get assignments for judge
   */
  getAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const assignments = await this.judgeService.getAssignments(
        user.id,
        user.role
      );
      sendSuccess(res, assignments);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update assignment status
   */
  updateAssignmentStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = (req as any).user;

      if (!id) {
        res.status(400).json({ error: 'Assignment ID is required' });
        return;
      }

      const assignment = await this.judgeService.updateAssignmentStatus(
        id,
        status,
        user.id,
        user.role
      );

      sendSuccess(res, assignment, 'Assignment status updated');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get scoring interface for a category
   */
  getScoringInterface = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const user = (req as any).user;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const scoringData = await this.judgeService.getScoringInterface(
        categoryId,
        user.id
      );

      sendSuccess(res, scoringData);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Submit a score
   */
  submitScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const { categoryId, contestantId, criterionId, score, comment } = req.body;

      const scoreRecord = await this.judgeService.submitScore(
        {
          categoryId,
          contestantId,
          criterionId,
          score,
          comment,
        },
        user.id
      );

      sendSuccess(res, scoreRecord, 'Score submitted successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get certification workflow
   */
  getCertificationWorkflow = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const user = (req as any).user;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const certificationData = await this.judgeService.getCertificationWorkflow(
        categoryId,
        user.id
      );

      sendSuccess(res, certificationData);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contestant bios for a category
   */
  getContestantBios = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const user = (req as any).user;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const contestants = await this.judgeService.getContestantBios(
        categoryId,
        user.id
      );

      sendSuccess(res, contestants);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get single contestant bio
   */
  getContestantBio = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { contestantId } = req.params;
      const user = (req as any).user;

      if (!contestantId) {
        res.status(400).json({ error: 'Contestant ID is required' });
        return;
      }

      const contestant = await this.judgeService.getContestantBio(
        contestantId,
        user.id
      );

      sendSuccess(res, contestant);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get judge scoring history
   */
  getJudgeHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const result = await this.judgeService.getJudgeHistory(user.id, req.query);
      sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };
}

// Export controller instance and methods
const controller = new JudgeController();
export const getStats = controller.getStats;
export const getAssignments = controller.getAssignments;
export const updateAssignmentStatus = controller.updateAssignmentStatus;
export const getScoringInterface = controller.getScoringInterface;
export const submitScore = controller.submitScore;
export const getCertificationWorkflow = controller.getCertificationWorkflow;
export const getContestantBios = controller.getContestantBios;
export const getContestantBio = controller.getContestantBio;
export const getJudgeHistory = controller.getJudgeHistory;
