import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { BioService } from '../services/BioService';
import { sendSuccess } from '../utils/responseHelpers';

export class BioController {
  private bioService: BioService;

  constructor() {
    this.bioService = container.resolve(BioService);
  }

  getContestantBios = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, contestId, categoryId } = req.query;

      const contestants = await this.bioService.getContestantBios({
        eventId: eventId as string,
        contestId: contestId as string,
        categoryId: categoryId as string
      });

      return sendSuccess(res, contestants);
    } catch (error) {
      next(error);
    }
  };

  getJudgeBios = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, contestId, categoryId } = req.query;

      const judges = await this.bioService.getJudgeBios({
        eventId: eventId as string,
        contestId: contestId as string,
        categoryId: categoryId as string
      });

      return sendSuccess(res, judges);
    } catch (error) {
      next(error);
    }
  };

  updateContestantBio = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { contestantId } = req.params;
      const { bio } = req.body;
      let imagePath = req.body.imagePath || undefined;

      // Handle file upload if present
      if (req.file) {
        imagePath = `/uploads/bios/${req.file.filename}`;
      }

      const contestant = await this.bioService.updateContestantBio(contestantId, {
        bio,
        imagePath
      });

      return sendSuccess(res, contestant, 'Contestant bio updated successfully');
    } catch (error) {
      next(error);
    }
  };

  updateJudgeBio = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId } = req.params;
      const { bio } = req.body;
      let imagePath = req.body.imagePath || undefined;

      // Handle file upload if present
      if (req.file) {
        imagePath = `/uploads/bios/${req.file.filename}`;
      }

      const judge = await this.bioService.updateJudgeBio(judgeId, {
        bio,
        imagePath
      });

      return sendSuccess(res, judge, 'Judge bio updated successfully');
    } catch (error) {
      next(error);
    }
  };
}

const controller = new BioController();
export const getContestantBios = controller.getContestantBios;
export const getJudgeBios = controller.getJudgeBios;
export const updateContestantBio = controller.updateContestantBio;
export const updateJudgeBio = controller.updateJudgeBio;
