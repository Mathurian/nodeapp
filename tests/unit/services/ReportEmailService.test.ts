/**
 * ReportEmailService Unit Tests
 * Comprehensive tests for report email delivery functionality
 */

import 'reflect-metadata';
import { ReportEmailService } from '../../../src/services/ReportEmailService';
import { ReportExportService } from '../../../src/services/ReportExportService';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ValidationError } from '../../../src/services/BaseService';

describe('ReportEmailService', () => {
  let service: ReportEmailService;
  let mockExportService: DeepMockProxy<ReportExportService>;

  const mockReportData = {
    event: { name: 'Test Event' },
    metadata: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      reportType: 'Event Summary'
    }
  };

  beforeEach(() => {
    mockExportService = mockDeep<ReportExportService>();
    service = new ReportEmailService(mockExportService as any);
    jest.clearAllMocks();

    // Default mock implementations
    mockExportService.exportReport.mockResolvedValue(Buffer.from('test content'));
    mockExportService.generateFilename.mockReturnValue('report.pdf');
  });

  afterEach(() => {
    mockReset(mockExportService);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ReportEmailService);
    });
  });

  describe('sendReportEmail', () => {
    const validEmailData = {
      recipients: ['test@example.com'],
      reportData: mockReportData,
      format: 'pdf' as const,
      userId: 'user1'
    };

    it('should send report email with valid data', async () => {
      await service.sendReportEmail(validEmailData);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(
        mockReportData,
        'pdf'
      );
      expect(mockExportService.generateFilename).toHaveBeenCalledWith(
        'Event Summary',
        'pdf'
      );
    });

    it('should validate required fields', async () => {
      const invalidData: any = {
        recipients: []
      };

      await expect(service.sendReportEmail(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid email addresses', async () => {
      const invalidEmailData = {
        ...validEmailData,
        recipients: ['invalid-email', 'also@invalid']
      };

      await expect(service.sendReportEmail(invalidEmailData)).rejects.toThrow(ValidationError);
      await expect(service.sendReportEmail(invalidEmailData)).rejects.toThrow('Invalid email addresses');
    });

    it('should accept multiple valid email addresses', async () => {
      const multipleEmailsData = {
        ...validEmailData,
        recipients: ['user1@example.com', 'user2@example.com', 'user3@example.com']
      };

      await expect(service.sendReportEmail(multipleEmailsData)).resolves.not.toThrow();
    });

    it('should reject email addresses without @ symbol', async () => {
      const noAtSymbol = {
        ...validEmailData,
        recipients: ['invalidemail.com']
      };

      await expect(service.sendReportEmail(noAtSymbol)).rejects.toThrow(ValidationError);
    });

    it('should reject email addresses without domain', async () => {
      const noDomain = {
        ...validEmailData,
        recipients: ['user@']
      };

      await expect(service.sendReportEmail(noDomain)).rejects.toThrow(ValidationError);
    });

    it('should reject email addresses without TLD', async () => {
      const noTLD = {
        ...validEmailData,
        recipients: ['user@domain']
      };

      await expect(service.sendReportEmail(noTLD)).rejects.toThrow(ValidationError);
    });

    it('should handle custom subject', async () => {
      const customSubjectData = {
        ...validEmailData,
        subject: 'Custom Report Subject'
      };

      await expect(service.sendReportEmail(customSubjectData)).resolves.not.toThrow();
    });

    it('should handle custom message', async () => {
      const customMessageData = {
        ...validEmailData,
        message: 'This is a custom message for the report.'
      };

      await expect(service.sendReportEmail(customMessageData)).resolves.not.toThrow();
    });

    it('should generate report in PDF format', async () => {
      await service.sendReportEmail(validEmailData);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(
        mockReportData,
        'pdf'
      );
    });

    it('should generate report in Excel format', async () => {
      const excelData = {
        ...validEmailData,
        format: 'excel' as const
      };

      await service.sendReportEmail(excelData);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(
        mockReportData,
        'excel'
      );
    });

    it('should generate report in CSV format', async () => {
      const csvData = {
        ...validEmailData,
        format: 'csv' as const
      };

      await service.sendReportEmail(csvData);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(
        mockReportData,
        'csv'
      );
    });

    it('should use default report type if not provided', async () => {
      const noMetadataData = {
        ...validEmailData,
        reportData: { event: { name: 'Test' } }
      };

      await service.sendReportEmail(noMetadataData);

      expect(mockExportService.generateFilename).toHaveBeenCalledWith(
        'report',
        'pdf'
      );
    });

    it('should handle export service errors', async () => {
      mockExportService.exportReport.mockRejectedValue(new Error('Export failed'));

      await expect(service.sendReportEmail(validEmailData)).rejects.toThrow();
    });

    it('should handle large report buffers', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockExportService.exportReport.mockResolvedValue(largeBuffer);

      await expect(service.sendReportEmail(validEmailData)).resolves.not.toThrow();
    });

    it('should validate email format with various valid patterns', async () => {
      const validEmails = {
        ...validEmailData,
        recipients: [
          'simple@example.com',
          'user.name@example.com',
          'user+tag@example.co.uk',
          'user_name@example-domain.com'
        ]
      };

      await expect(service.sendReportEmail(validEmails)).resolves.not.toThrow();
    });

    it('should identify multiple invalid emails in the list', async () => {
      const mixedEmails = {
        ...validEmailData,
        recipients: ['valid@example.com', 'invalid1', 'invalid2@']
      };

      await expect(service.sendReportEmail(mixedEmails)).rejects.toThrow('invalid1, invalid2@');
    });
  });

  describe('sendBatchReportEmails', () => {
    const batchEmails = [
      {
        recipients: ['user1@example.com'],
        reportData: mockReportData,
        format: 'pdf' as const,
        userId: 'user1'
      },
      {
        recipients: ['user2@example.com'],
        reportData: mockReportData,
        format: 'excel' as const,
        userId: 'user2'
      },
      {
        recipients: ['user3@example.com'],
        reportData: mockReportData,
        format: 'csv' as const,
        userId: 'user3'
      }
    ];

    it('should send multiple emails successfully', async () => {
      const result = await service.sendBatchReportEmails(batchEmails);

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial batch failures', async () => {
      mockExportService.exportReport
        .mockResolvedValueOnce(Buffer.from('success1'))
        .mockRejectedValueOnce(new Error('Export failed'))
        .mockResolvedValueOnce(Buffer.from('success2'));

      const result = await service.sendBatchReportEmails(batchEmails);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should track error messages for failed sends', async () => {
      mockExportService.exportReport
        .mockRejectedValueOnce(new Error('Network timeout'));

      const result = await service.sendBatchReportEmails([batchEmails[0]]);

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('user1@example.com');
      expect(result.errors[0]).toContain('Network timeout');
    });

    it('should continue processing after individual failures', async () => {
      mockExportService.exportReport
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce(Buffer.from('success'));

      const result = await service.sendBatchReportEmails(batchEmails);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(2);
    });

    it('should handle empty batch', async () => {
      const result = await service.sendBatchReportEmails([]);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle all failures', async () => {
      mockExportService.exportReport.mockRejectedValue(new Error('All fail'));

      const result = await service.sendBatchReportEmails(batchEmails);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('scheduleReportEmail', () => {
    const scheduleData = {
      recipients: ['test@example.com'],
      reportData: mockReportData,
      format: 'pdf' as const,
      userId: 'user1'
    };

    const scheduledTime = new Date('2024-12-31T23:59:59.999Z');

    it('should schedule report email for future delivery', async () => {
      const result = await service.scheduleReportEmail(scheduleData, scheduledTime);

      expect(result.scheduled).toBe(true);
      expect(result.scheduledAt).toEqual(scheduledTime);
    });

    it('should accept past dates for scheduling', async () => {
      const pastDate = new Date('2020-01-01T00:00:00.000Z');

      const result = await service.scheduleReportEmail(scheduleData, pastDate);

      expect(result.scheduled).toBe(true);
      expect(result.scheduledAt).toEqual(pastDate);
    });

    it('should handle scheduling errors gracefully', async () => {
      // Since this is a placeholder implementation, it should not throw
      await expect(
        service.scheduleReportEmail(scheduleData, scheduledTime)
      ).resolves.toBeDefined();
    });
  });

  describe('email template rendering', () => {
    it('should render email with report metadata', async () => {
      const emailData = {
        recipients: ['test@example.com'],
        reportData: {
          ...mockReportData,
          metadata: {
            generatedAt: '2024-01-15T10:30:00.000Z',
            reportType: 'Custom Report'
          }
        },
        format: 'pdf' as const,
        userId: 'user1'
      };

      await expect(service.sendReportEmail(emailData)).resolves.not.toThrow();
    });

    it('should handle missing metadata gracefully', async () => {
      const noMetadataEmail = {
        recipients: ['test@example.com'],
        reportData: { event: { name: 'Event' } },
        format: 'pdf' as const,
        userId: 'user1'
      };

      await expect(service.sendReportEmail(noMetadataEmail)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle validation errors', async () => {
      const invalidData: any = {
        recipients: ['invalid'],
        reportData: mockReportData,
        format: 'pdf',
        userId: 'user1'
      };

      await expect(service.sendReportEmail(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should handle export service failures', async () => {
      mockExportService.exportReport.mockRejectedValue(new Error('Service unavailable'));

      const validData = {
        recipients: ['test@example.com'],
        reportData: mockReportData,
        format: 'pdf' as const,
        userId: 'user1'
      };

      await expect(service.sendReportEmail(validData)).rejects.toThrow();
    });

    it('should handle filename generation failures', async () => {
      mockExportService.generateFilename.mockImplementation(() => {
        throw new Error('Filename generation failed');
      });

      const validData = {
        recipients: ['test@example.com'],
        reportData: mockReportData,
        format: 'pdf' as const,
        userId: 'user1'
      };

      await expect(service.sendReportEmail(validData)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very long recipient lists', async () => {
      const manyRecipients = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);

      const emailData = {
        recipients: manyRecipients,
        reportData: mockReportData,
        format: 'pdf' as const,
        userId: 'user1'
      };

      await expect(service.sendReportEmail(emailData)).resolves.not.toThrow();
    });

    it('should handle special characters in email addresses', async () => {
      const specialChars = {
        recipients: ["user+tag@example.com", "user.name@example.co.uk"],
        reportData: mockReportData,
        format: 'pdf' as const,
        userId: 'user1'
      };

      await expect(service.sendReportEmail(specialChars)).resolves.not.toThrow();
    });

    it('should handle Unicode in report data', async () => {
      const unicodeData = {
        recipients: ['test@example.com'],
        reportData: {
          event: { name: 'Événement Spécial 日本語' },
          metadata: {
            generatedAt: '2024-01-01T00:00:00.000Z',
            reportType: 'Rapport Spécial'
          }
        },
        format: 'pdf' as const,
        userId: 'user1'
      };

      await expect(service.sendReportEmail(unicodeData)).resolves.not.toThrow();
    });
  });
});
