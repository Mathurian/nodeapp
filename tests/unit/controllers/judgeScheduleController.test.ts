import 'reflect-metadata';
import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';
import { JudgeScheduleController } from '../../../src/controllers/judgeScheduleController';
import { JudgeScheduleService } from '../../../src/services/JudgeScheduleService';
import {
  sendError,
  sendSuccess,
  sendUnauthorized,
} from '../../../src/utils/responseHelpers';

jest.mock('../../../src/utils/responseHelpers');

describe('JudgeScheduleController', () => {
  let controller: JudgeScheduleController;
  let mockService: jest.Mocked<JudgeScheduleService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });
    (sendError as jest.Mock).mockImplementation((res, message, status = 400) => {
      return res.status(status).json({ success: false, error: message });
    });
    (sendUnauthorized as jest.Mock).mockImplementation((res, message = 'Unauthorized') => {
      return res.status(401).json({ success: false, error: message });
    });

    mockService = {
      listSchedules: jest.fn(),
      importFromCsvBuffer: jest.fn(),
      getTemplateCsv: jest.fn(),
    } as any;

    (container.resolve as jest.Mock) = jest.fn(() => mockService);

    controller = new JudgeScheduleController();
    (controller as any).judgeScheduleService = mockService;

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: {
        id: 'user-1',
        role: 'ADMIN',
        tenantId: 'tenant-1',
      },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('listSchedules', () => {
    it('allows staff to request a specific judge schedule', async () => {
      mockReq.query = {
        judgeId: 'judge-9',
        eventId: 'event-2',
        includePast: 'true',
      };
      mockService.listSchedules.mockResolvedValue([] as any);

      await controller.listSchedules(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.listSchedules).toHaveBeenCalledWith('tenant-1', {
        judgeId: 'judge-9',
        eventId: 'event-2',
        includePast: true,
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        [],
        'Judge schedules retrieved successfully',
      );
    });

    it('forces judges onto their own schedule even if judgeId is requested', async () => {
      mockReq.user = {
        id: 'user-2',
        role: 'JUDGE',
        tenantId: 'tenant-1',
        judgeId: 'judge-self',
      } as any;
      mockReq.query = {
        judgeId: 'judge-other',
        includePast: 'false',
      };
      mockService.listSchedules.mockResolvedValue([] as any);

      await controller.listSchedules(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.listSchedules).toHaveBeenCalledWith('tenant-1', {
        judgeId: 'judge-self',
        eventId: undefined,
        includePast: false,
      });
    });

    it('returns a 400 when a judge account has no linked judge profile', async () => {
      mockReq.user = {
        id: 'user-3',
        role: 'JUDGE',
        tenantId: 'tenant-1',
      } as any;

      await controller.listSchedules(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.listSchedules).not.toHaveBeenCalled();
      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'Judge account is not linked to a judge profile',
        400,
      );
    });

    it('returns unauthorized when req.user is missing', async () => {
      mockReq.user = undefined;

      await controller.listSchedules(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.listSchedules).not.toHaveBeenCalled();
      expect(sendUnauthorized).toHaveBeenCalledWith(mockRes);
    });
  });

  describe('importSchedules', () => {
    it('requires a file upload', async () => {
      mockReq.file = undefined;

      await controller.importSchedules(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.importFromCsvBuffer).not.toHaveBeenCalled();
      expect(sendError).toHaveBeenCalledWith(mockRes, 'CSV file is required', 400);
    });
  });

  describe('downloadTemplate', () => {
    it('returns the CSV template as a download', async () => {
      mockService.getTemplateCsv.mockReturnValue('judgeEmail,title\n');

      await controller.downloadTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=judge-schedule-template.csv',
      );
      expect(mockRes.send).toHaveBeenCalledWith('judgeEmail,title\n');
    });
  });
});
