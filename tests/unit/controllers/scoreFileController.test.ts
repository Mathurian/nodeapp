import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ScoreFileController } from '../../../src/controllers/scoreFileController';
import { ScoreFileService } from '../../../src/services/ScoreFileService';
import { ScoreDelegationService } from '../../../src/services/ScoreDelegationService';
import { ScoreSheetImportService } from '../../../src/services/ScoreSheetImportService';

jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
    clearInstances: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  createRequestLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('ScoreFileController', () => {
  let controller: ScoreFileController;
  let mockScoreFileService: any;
  let mockScoreDelegationService: any;
  let mockScoreSheetImportService: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockScoreFileService = {};
    mockScoreDelegationService = {
      resolveActingJudgeContext: jest.fn().mockResolvedValue({
        judgeId: 'judge-1',
        entryMode: 'SELF',
        delegationGrantId: null,
      }),
    };
    mockScoreSheetImportService = {
      evaluateScoresheetImportUat: jest.fn().mockResolvedValue({
        templateKey: 'education_omr_v3',
        comparison: { exactRowCount: 10, rowCount: 10 },
        routingRecommendation: { decision: 'accepted_for_review' },
      }),
    };
    (container.resolve as jest.Mock).mockImplementation((token) => {
      if (token === ScoreFileService) return mockScoreFileService;
      if (token === ScoreDelegationService) return mockScoreDelegationService;
      if (token === ScoreSheetImportService) return mockScoreSheetImportService;
      return {};
    });
    controller = new ScoreFileController();

    req = {
      body: {
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'category-1',
        contestantId: 'contestant-1',
        templateKey: 'education_omr_v3',
      },
      params: {},
      query: {},
      user: { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' },
      file: {
        originalname: 'scoresheet.png',
        mimetype: 'image/png',
        buffer: Buffer.from('scoresheet image'),
      } as Express.Multer.File,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('evaluateScoresheetImportUat', () => {
    it('passes a memory upload and resolved judge context to the parse-only service', async () => {
      await controller.evaluateScoresheetImportUat(
        req as Request,
        res as Response,
        next,
      );

      expect(mockScoreDelegationService.resolveActingJudgeContext).toHaveBeenCalledWith(
        req.user,
        'tenant-1',
        'category-1',
        undefined,
      );
      expect(mockScoreSheetImportService.evaluateScoresheetImportUat).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          eventId: 'event-1',
          contestId: 'contest-1',
          categoryId: 'category-1',
          judgeId: 'judge-1',
          contestantId: 'contestant-1',
          templateKey: 'education_omr_v3',
          fileName: 'scoresheet.png',
          fileType: 'image/png',
          fileBuffer: Buffer.from('scoresheet image'),
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ templateKey: 'education_omr_v3' }),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects missing files before calling the parse-only service', async () => {
      delete req.file;

      await controller.evaluateScoresheetImportUat(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'File is required for scoresheet import UAT',
      }));
      expect(mockScoreSheetImportService.evaluateScoresheetImportUat).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
