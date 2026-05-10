import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { BioService } from '../services/BioService';
import { sendSuccess } from '../utils/responseHelpers';
import fs from 'fs';
import path from 'path';
import { resolveRequestTenantId } from '../utils/tenantContext';
import { buildDocxPreviewHtml } from '../utils/docxPreview';

export class BioController {
  private bioService: BioService;

  constructor() {
    this.bioService = container.resolve(BioService);
  }

  getContestantBios = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, contestId, categoryId } = req.query;
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant context required' });
      }

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
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant context required' });
      }

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
        return sendSuccess(res, { events: [], contests: [], contestants: [], judges: [], allUsers: [] });
      }

      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant context required' });
      }
      const { contestId, eventId } = req.query;
      const directory = await this.bioService.getBioDirectory(
        req.user.id,
        req.user.role as any,
        tenantId,
        contestId as string | undefined,
        eventId as string | undefined
      );

      return sendSuccess(res, directory);
    } catch (error) {
      return next(error);
    }
  };

  getBioFile = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filename = path.basename(req.params['filename'] || '');
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!filename) {
        return res.status(404).json({ success: false, message: 'Bio file not found' });
      }
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant context required' });
      }
      if (!req.prisma) {
        return res.status(500).json({ success: false, message: 'Tenant database context unavailable' });
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

      const pathCandidates = [
        filename,
        `/uploads/users/bios/${filename}`,
        `uploads/users/bios/${filename}`,
        `/uploads/bios/${filename}`,
        `uploads/bios/${filename}`,
        `/uploads/users/${filename}`,
        `uploads/users/${filename}`
      ];

      const [fileRef, userRef, contestantRef, judgeRef] = await Promise.all([
        req.prisma.file.findFirst({
          where: {
            tenantId,
            OR: [
              { filename },
              { path: { in: pathCandidates } },
              { path: { endsWith: `/users/bios/${filename}` } },
              { path: { endsWith: `/bios/${filename}` } }
            ]
          },
          select: { id: true }
        }),
        req.prisma.user.findFirst({
          where: {
            tenantId,
            OR: [
              ...pathCandidates.map((candidate) => ({ bio: { contains: candidate } })),
              { imagePath: { in: pathCandidates } }
            ]
          },
          select: { id: true }
        }),
        req.prisma.contestant.findFirst({
          where: {
            tenantId,
            OR: [
              ...pathCandidates.map((candidate) => ({ bio: { contains: candidate } })),
              { imagePath: { in: pathCandidates } }
            ]
          },
          select: { id: true }
        }),
        req.prisma.judge.findFirst({
          where: {
            tenantId,
            OR: [
              ...pathCandidates.map((candidate) => ({ bio: { contains: candidate } })),
              { imagePath: { in: pathCandidates } }
            ]
          },
          select: { id: true }
        })
      ]);

      if (!fileRef && !userRef && !contestantRef && !judgeRef) {
        return res.status(404).json({ success: false, message: 'Bio file not found' });
      }

      const extension = path.extname(targetPath).toLowerCase();
      const wantsDocxPreview = extension === '.docx' && String(req.query['preview'] || '').toLowerCase() === 'html';
      if (wantsDocxPreview) {
        const previewHtml = await buildDocxPreviewHtml(targetPath, filename);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(previewHtml);
      }

      if (extension === '.doc') {
        res.setHeader('Content-Type', 'application/msword');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      } else if (extension === '.docx') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      } else if (extension === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      } else if (extension === '.txt') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
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
