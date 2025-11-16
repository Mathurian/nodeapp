/**
 * EmailController Unit Tests
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { EmailController } from '../../../src/controllers/emailController';
import { EmailService } from '../../../src/services/EmailService';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/EmailService');

describe('EmailController', () => {
  let controller: EmailController;
  let mockService: jest.Mocked<EmailService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });

    mockService = {
      getConfig: jest.fn(),
      sendEmail: jest.fn(),
      sendBulkEmail: jest.fn(),
    } as any;

    mockPrisma = mockDeep<PrismaClient>();

    (container.resolve as jest.Mock) = jest.fn((service) => {
      if (service === 'PrismaClient') return mockPrisma;
      return mockService;
    });

    controller = new EmailController();

    mockReq = {
      params: {},
      body: {},
      query: {},
      user: { id: 'user-1', role: 'ADMIN' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getConfig', () => {
    it('should return email configuration', async () => {
      const mockConfig = { host: 'smtp.example.com', port: 587 };
      mockService.getConfig.mockResolvedValue(mockConfig as any);

      await controller.getConfig(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getConfig).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockConfig);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Config error');
      mockService.getConfig.mockRejectedValue(error);

      await controller.getConfig(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockReq.body = { to: 'test@example.com', subject: 'Test', body: 'Hello' };
      const mockResult = { messageId: 'msg-1', status: 'sent' };
      mockService.sendEmail.mockResolvedValue(mockResult as any);

      await controller.sendEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.sendEmail).toHaveBeenCalledWith('test@example.com', 'Test', 'Hello');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Email sent');
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { to: 'test@example.com', subject: 'Test', body: 'Hello' };
      const error = new Error('Send failed');
      mockService.sendEmail.mockRejectedValue(error);

      await controller.sendEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk email successfully', async () => {
      mockReq.body = {
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Newsletter',
        body: 'Content'
      };
      const mockResults = [{ status: 'sent' }, { status: 'sent' }];
      mockService.sendBulkEmail.mockResolvedValue(mockResults as any);

      await controller.sendBulkEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.sendBulkEmail).toHaveBeenCalledWith(
        ['user1@example.com', 'user2@example.com'],
        'Newsletter',
        'Content'
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResults, 'Bulk email sent');
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { recipients: ['test@example.com'], subject: 'Test', body: 'Hello' };
      const error = new Error('Bulk send failed');
      mockService.sendBulkEmail.mockRejectedValue(error);

      await controller.sendBulkEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getTemplates', () => {
    it('should return paginated templates with default pagination', async () => {
      const mockTemplates = [{ id: 'tpl-1', name: 'Welcome' }];
      mockPrisma.emailTemplate.findMany.mockResolvedValue(mockTemplates as any);
      mockPrisma.emailTemplate.count.mockResolvedValue(1);

      await controller.getTemplates(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ templates: mockTemplates })
      );
    });

    it('should filter by type and eventId', async () => {
      mockReq.query = { type: 'NOTIFICATION', eventId: 'event-1', page: '2', limit: '10' };
      mockPrisma.emailTemplate.findMany.mockResolvedValue([]);
      mockPrisma.emailTemplate.count.mockResolvedValue(0);

      await controller.getTemplates(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'NOTIFICATION', eventId: 'event-1' },
          skip: 10,
          take: 10
        })
      );
    });

    it('should call next with error when query fails', async () => {
      const error = new Error('Query error');
      mockPrisma.emailTemplate.findMany.mockRejectedValue(error);

      await controller.getTemplates(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      mockReq.body = {
        name: 'Welcome Email',
        subject: 'Welcome!',
        body: 'Welcome to our platform',
        type: 'WELCOME',
        eventId: 'event-1',
        variables: ['name', 'email']
      };
      const mockTemplate = { id: 'tpl-1', name: 'Welcome Email' };
      mockPrisma.emailTemplate.create.mockResolvedValue(mockTemplate as any);

      await controller.createTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Welcome Email',
            createdBy: 'user-1'
          })
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockTemplate, 'Template created successfully', 201);
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = undefined;

      await controller.createTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'User not authenticated', 401);
    });

    it('should call next with error when creation fails', async () => {
      mockReq.body = { name: 'Test' };
      const error = new Error('Creation failed');
      mockPrisma.emailTemplate.create.mockRejectedValue(error);

      await controller.createTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      mockReq.params = { id: 'tpl-1' };
      mockReq.body = { name: 'Updated Name', subject: 'New Subject' };

      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ id: 'tpl-1', name: 'Old' } as any);
      mockPrisma.emailTemplate.update.mockResolvedValue({ id: 'tpl-1', name: 'Updated Name' } as any);

      await controller.updateTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tpl-1' },
          data: expect.objectContaining({ name: 'Updated Name' })
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, expect.anything(), 'Template updated successfully');
    });

    it('should return 404 when template not found', async () => {
      mockReq.params = { id: 'missing' };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await controller.updateTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Template not found', 404);
    });

    it('should call next with error when update fails', async () => {
      mockReq.params = { id: 'tpl-1' };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ id: 'tpl-1' } as any);
      const error = new Error('Update failed');
      mockPrisma.emailTemplate.update.mockRejectedValue(error);

      await controller.updateTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      mockReq.params = { id: 'tpl-1' };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ id: 'tpl-1' } as any);
      mockPrisma.emailTemplate.delete.mockResolvedValue({ id: 'tpl-1' } as any);

      await controller.deleteTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tpl-1' } });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Template deleted successfully');
    });

    it('should return 404 when template not found', async () => {
      mockReq.params = { id: 'missing' };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await controller.deleteTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Template not found', 404);
    });

    it('should call next with error when delete fails', async () => {
      mockReq.params = { id: 'tpl-1' };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ id: 'tpl-1' } as any);
      const error = new Error('Delete failed');
      mockPrisma.emailTemplate.delete.mockRejectedValue(error);

      await controller.deleteTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCampaigns', () => {
    it('should return campaigns from email logs', async () => {
      const mockLogs = [{ id: 'log-1', status: 'SENT' }];
      mockPrisma.emailLog.findMany.mockResolvedValue(mockLogs as any);

      await controller.getCampaigns(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { campaigns: mockLogs });
    });

    it('should filter by status', async () => {
      mockReq.query = { status: 'SENT', limit: '25' };
      mockPrisma.emailLog.findMany.mockResolvedValue([]);

      await controller.getCampaigns(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'SENT' }, take: 25 })
      );
    });

    it('should call next with error when query fails', async () => {
      const error = new Error('Query error');
      mockPrisma.emailLog.findMany.mockRejectedValue(error);

      await controller.getCampaigns(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createCampaign', () => {
    it('should create campaign successfully', async () => {
      mockReq.body = {
        name: 'Monthly Newsletter',
        templateId: 'tpl-1',
        recipientList: ['user1@example.com', 'user2@example.com']
      };

      await controller.createCampaign(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          name: 'Monthly Newsletter',
          recipientCount: 2,
          status: 'CREATED'
        }),
        'Campaign created successfully',
        201
      );
    });

    it('should call next with error when creation fails', async () => {
      const error = new Error('Creation failed');
      mockReq.body = { name: 'Test' };
      (sendSuccess as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await controller.createCampaign(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendCampaign', () => {
    it('should send campaign emails successfully', async () => {
      mockReq.params = { campaignId: 'camp-1' };
      mockReq.body = {
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Newsletter',
        body: 'Content'
      };
      mockService.sendEmail.mockResolvedValue({ messageId: 'msg-1' } as any);

      await controller.sendCampaign(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.sendEmail).toHaveBeenCalledTimes(2);
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ sent: 2, failed: 0, total: 2 }),
        'Campaign sent'
      );
    });

    it('should return 400 when recipients missing', async () => {
      mockReq.params = { campaignId: 'camp-1' };
      mockReq.body = { subject: 'Test', body: 'Content' };

      await controller.sendCampaign(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Recipients list is required', 400);
    });

    it('should handle partial failures', async () => {
      mockReq.params = { campaignId: 'camp-1' };
      mockReq.body = {
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Test',
        body: 'Content'
      };
      mockService.sendEmail
        .mockResolvedValueOnce({ messageId: 'msg-1' } as any)
        .mockRejectedValueOnce(new Error('Send failed'));

      await controller.sendCampaign(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ sent: 1, failed: 1 }),
        'Campaign sent'
      );
    });

    it('should call next with error when campaign send fails', async () => {
      mockReq.params = { campaignId: 'camp-1' };
      const error = new Error('Campaign error');
      (sendSuccess as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await controller.sendCampaign(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getLogs', () => {
    it('should return paginated email logs', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      mockPrisma.emailLog.findMany.mockResolvedValue(mockLogs as any);
      mockPrisma.emailLog.count.mockResolvedValue(2);

      await controller.getLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ logs: mockLogs })
      );
    });

    it('should filter by status with custom pagination', async () => {
      mockReq.query = { status: 'FAILED', page: '2', limit: '25' };
      mockPrisma.emailLog.findMany.mockResolvedValue([]);
      mockPrisma.emailLog.count.mockResolvedValue(0);

      await controller.getLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'FAILED' },
          skip: 25,
          take: 25
        })
      );
    });

    it('should call next with error when query fails', async () => {
      const error = new Error('Query error');
      mockPrisma.emailLog.findMany.mockRejectedValue(error);

      await controller.getLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendMultipleEmails', () => {
    it('should send multiple emails successfully', async () => {
      mockReq.body = {
        emails: [
          { to: 'user1@example.com', subject: 'Test 1', body: 'Body 1' },
          { to: 'user2@example.com', subject: 'Test 2', body: 'Body 2' }
        ]
      };
      mockService.sendEmail.mockResolvedValue({ messageId: 'msg-1' } as any);

      await controller.sendMultipleEmails(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.sendEmail).toHaveBeenCalledTimes(2);
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ sent: 2, failed: 0, total: 2 }),
        'Multiple emails sent'
      );
    });

    it('should return 400 when emails array missing', async () => {
      mockReq.body = {};

      await controller.sendMultipleEmails(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Emails array is required', 400);
    });

    it('should call next with error when send fails', async () => {
      mockReq.body = { emails: [] };
      const error = new Error('Send failed');
      (sendSuccess as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await controller.sendMultipleEmails(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendEmailByRole', () => {
    it('should send email to all users with role', async () => {
      mockReq.body = { role: 'JUDGE', subject: 'Important Update', body: 'Please review...' };
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'judge1@example.com' },
        { email: 'judge2@example.com' }
      ] as any);
      mockService.sendEmail.mockResolvedValue({ messageId: 'msg-1' } as any);

      await controller.sendEmailByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'JUDGE' } })
      );
      expect(mockService.sendEmail).toHaveBeenCalledTimes(2);
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ sent: 2, role: 'JUDGE' }),
        'Emails sent to users with role: JUDGE'
      );
    });

    it('should return 400 when role missing', async () => {
      mockReq.body = { subject: 'Test', body: 'Content' };

      await controller.sendEmailByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Role is required', 400);
    });

    it('should handle no users found', async () => {
      mockReq.body = { role: 'UNKNOWN', subject: 'Test', body: 'Content' };
      mockPrisma.user.findMany.mockResolvedValue([]);

      await controller.sendEmailByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { sent: 0 }, 'No users found with that role');
    });

    it('should call next with error when send fails', async () => {
      mockReq.body = { role: 'JUDGE', subject: 'Test', body: 'Content' };
      const error = new Error('Query failed');
      mockPrisma.user.findMany.mockRejectedValue(error);

      await controller.sendEmailByRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
