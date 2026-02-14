import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { BioService } from '../services/BioService';
import { sendSuccess } from '../utils/responseHelpers';
import fs from 'fs';
import path from 'path';

export class BioController {
  private bioService: BioService;

  constructor() {
    this.bioService = container.resolve(BioService);
  }

  getContestantBios = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, contestId, categoryId } = req.query;
      const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';

      const contestants = await this.bioService.getContestantBios({
        eventId: eventId as string,
        contestId: contestId as string,
        categoryId: categoryId as string
      }, tenantId);

      return sendSuccess(res, contestants);
    } catch (error) {
      return next(error);
    }
  };

  getJudgeBios = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, contestId, categoryId } = req.query;
      const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';

      const judges = await this.bioService.getJudgeBios({
        eventId: eventId as string,
        contestId: contestId as string,
        categoryId: categoryId as string
      }, tenantId);

      return sendSuccess(res, judges);
    } catch (error) {
      return next(error);
    }
  };

  getBioDirectory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return sendSuccess(res, { contests: [], contestants: [], judges: [], allUsers: [] });
      }

      const tenantId = req.tenantId || req.user.tenantId || 'default_tenant';
      const { contestId } = req.query;
      const directory = await this.bioService.getBioDirectory(
        req.user.id,
        req.user.role as any,
        tenantId,
        contestId as string | undefined
      );

      return sendSuccess(res, directory);
    } catch (error) {
      return next(error);
    }
  };

  getBioFile = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filename = path.basename(req.params['filename'] || '');
      if (!filename) {
        return res.status(404).json({ success: false, message: 'Bio file not found' });
      }

      const legacyPath = path.resolve(process.cwd(), 'uploads/bios', filename);
      const userBioPath = path.resolve(process.cwd(), 'uploads/users/bios', filename);
      const userRootPath = path.resolve(process.cwd(), 'uploads/users', filename);
      const targetPath = fs.existsSync(userBioPath)
        ? userBioPath
        : fs.existsSync(legacyPath)
          ? legacyPath
          : fs.existsSync(userRootPath)
            ? userRootPath
          : null;

      if (!targetPath) {
        return res.status(404).json({ success: false, message: 'Bio file not found' });
      }

      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(targetPath);
    } catch (error) {
      return next(error);
    }
  };

  updateContestantBio = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { contestantId } = req.params;
      const { bio } = req.body;
      let imagePath = req.body['imagePath'] || undefined;

      // Handle file upload if present
      if (req.file) {
        imagePath = `/uploads/bios/${req.file.filename}`;
      }

      const contestant = await this.bioService.updateContestantBio(contestantId!, {
        bio,
        imagePath
      });

      return sendSuccess(res, contestant, 'Contestant bio updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  updateJudgeBio = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId } = req.params;
      const { bio } = req.body;
      let imagePath = req.body['imagePath'] || undefined;

      // Handle file upload if present
      if (req.file) {
        imagePath = `/uploads/bios/${req.file.filename}`;
      }

      const judge = await this.bioService.updateJudgeBio(judgeId!, {
        bio,
        imagePath
      });

      return sendSuccess(res, judge, 'Judge bio updated successfully');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new BioController();
export const getContestantBios = controller.getContestantBios;
export const getJudgeBios = controller.getJudgeBios;
export const getBioDirectory = controller.getBioDirectory;
export const getBioFile = controller.getBioFile;
export const updateContestantBio = controller.updateContestantBio;
export const updateJudgeBio = controller.updateJudgeBio;
