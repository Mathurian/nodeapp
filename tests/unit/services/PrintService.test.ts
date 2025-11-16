/**
 * PrintService Unit Tests
 * Comprehensive test coverage for print and report generation functionality
 */

import 'reflect-metadata';
import { PrintService } from '../../../src/services/PrintService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { promises as fs } from 'fs';
import * as handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
}));

describe('PrintService', () => {
  let service: PrintService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new PrintService(mockPrisma as any);

    // Setup puppeteer mocks
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf')),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getPrintTemplates', () => {
    it('should return list of print templates', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        'event-report.hbs',
        'contest-results.hbs',
        'judge-performance.hbs',
        'not-a-template.txt',
      ]);

      const result = await service.getPrintTemplates();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('event-report');
      expect(result[0].filename).toBe('event-report.hbs');
      expect(result[1].name).toBe('contest-results');
      expect(result[2].name).toBe('judge-performance');
    });

    it('should handle empty templates directory', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await service.getPrintTemplates();

      expect(result).toEqual([]);
    });

    it('should filter out non-hbs files', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        'template.hbs',
        'readme.md',
        'config.json',
        'styles.css',
      ]);

      const result = await service.getPrintTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('template');
    });

    it('should ensure templates directory exists', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      await service.getPrintTemplates();

      expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('createPrintTemplate', () => {
    it('should create new print template', async () => {
      const templateData = {
        name: 'custom-report',
        content: '<h1>{{title}}</h1>',
        description: 'Custom report template',
        type: 'PRINT' as const,
      };

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createPrintTemplate(templateData, 'user-1');

      expect(result.name).toBe('custom-report');
      expect(result.content).toBe('<h1>{{title}}</h1>');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should validate template name is required', async () => {
      const templateData = {
        content: '<h1>Test</h1>',
      } as any;

      await expect(service.createPrintTemplate(templateData, 'user-1')).rejects.toThrow();
    });

    it('should validate template content is required', async () => {
      const templateData = {
        name: 'test',
      } as any;

      await expect(service.createPrintTemplate(templateData, 'user-1')).rejects.toThrow();
    });

    it('should validate handlebars syntax', async () => {
      const templateData = {
        name: 'invalid-template',
        content: '{{#each items}}<div>{{name}}</div>',
        description: 'Invalid template',
      };

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await expect(service.createPrintTemplate(templateData, 'user-1')).rejects.toThrow('Invalid template syntax');
    });

    it('should accept valid handlebars syntax', async () => {
      const templateData = {
        name: 'valid-template',
        content: '{{#each items}}<div>{{name}}</div>{{/each}}',
        description: 'Valid template',
      };

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createPrintTemplate(templateData, 'user-1');

      expect(result.name).toBe('valid-template');
    });

    it('should use default type if not provided', async () => {
      const templateData = {
        name: 'test-template',
        content: '<div>{{content}}</div>',
      };

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createPrintTemplate(templateData, 'user-1');

      expect(result.type).toBe('PRINT');
    });
  });

  describe('updatePrintTemplate', () => {
    it('should update existing template', async () => {
      const updateData = {
        content: '<h1>Updated {{title}}</h1>',
        description: 'Updated description',
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updatePrintTemplate('template-1', updateData);

      expect(result.content).toBe('<h1>Updated {{title}}</h1>');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error if template not found', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.updatePrintTemplate('nonexistent', {})).rejects.toThrow('Template not found');
    });

    it('should validate handlebars syntax on update', async () => {
      const updateData = {
        content: '{{#if condition}}<div>No closing tag',
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await expect(service.updatePrintTemplate('template-1', updateData)).rejects.toThrow('Invalid template syntax');
    });

    it('should allow partial updates', async () => {
      const updateData = {
        description: 'Only updating description',
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updatePrintTemplate('template-1', updateData);

      expect(result.description).toBe('Only updating description');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('deletePrintTemplate', () => {
    it('should delete template', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deletePrintTemplate('template-1');

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should throw error if template not found', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.deletePrintTemplate('nonexistent')).rejects.toThrow('Template not found');
    });
  });

  describe('printEventReport', () => {
    it('should generate event report in PDF format', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        status: 'ACTIVE',
        contests: [
          {
            id: 'contest-1',
            name: 'Contest 1',
            categories: [
              { id: 'cat-1', name: 'Category 1' },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.printEventReport(
        { eventId: 'event-1', format: 'pdf' },
        'Test User'
      );

      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toContain('event-report');
      expect(result.filename).toContain('.pdf');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should generate event report in HTML format', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        description: 'Test Description',
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.printEventReport(
        { eventId: 'event-1', format: 'html' },
        'Test User'
      );

      expect(result.contentType).toBe('text/html');
      expect(result.filename).toContain('.html');
      expect(puppeteer.launch).not.toHaveBeenCalled();
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.printEventReport({ eventId: 'nonexistent' }, 'Test User')
      ).rejects.toThrow('Event not found');
    });

    it('should use custom template if provided', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [],
      };

      const customTemplate = '<h1>Custom: {{event.name}}</h1>';

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockResolvedValue(customTemplate);

      const result = await service.printEventReport(
        { eventId: 'event-1', templateName: 'custom-event', format: 'html' },
        'Test User'
      );

      expect(result.content.toString()).toContain('Custom: Test Event');
    });

    it('should include generation metadata', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.printEventReport(
        { eventId: 'event-1', format: 'html' },
        'Test User'
      );

      const html = result.content.toString();
      expect(html).toContain('Test User');
    });
  });

  describe('printContestResults', () => {
    it('should generate contest results report', async () => {
      const mockContest = {
        id: 'contest-1',
        name: 'Test Contest',
        description: 'Test Description',
        event: { id: 'event-1', name: 'Test Event' },
        categories: [
          { id: 'cat-1', name: 'Category 1' },
        ],
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.printContestResults(
        { contestId: 'contest-1', format: 'pdf' },
        'Test User'
      );

      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toContain('contest-results');
    });

    it('should throw error if contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(
        service.printContestResults({ contestId: 'nonexistent' }, 'Test User')
      ).rejects.toThrow('Contest not found');
    });
  });

  describe('printJudgePerformance', () => {
    it('should generate judge performance report', async () => {
      const mockJudge = {
        id: 'judge-1',
        name: 'Test Judge',
        email: 'judge@test.com',
        role: 'JUDGE',
      };

      const mockScores = [
        { id: 'score-1', score: 85, judgeId: 'judge-1', categoryId: 'cat-1', criterion: { id: 'crit-1' }, category: { id: 'cat-1' } },
        { id: 'score-2', score: 90, judgeId: 'judge-1', categoryId: 'cat-2', criterion: { id: 'crit-2' }, category: { id: 'cat-2' } },
        { id: 'score-3', score: 88, judgeId: 'judge-1', categoryId: 'cat-1', criterion: { id: 'crit-3' }, category: { id: 'cat-1' } },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockJudge as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.printJudgePerformance(
        { judgeId: 'judge-1', format: 'pdf' },
        'Test User'
      );

      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toContain('judge-performance');
    });

    it('should calculate performance statistics', async () => {
      const mockJudge = {
        id: 'judge-1',
        name: 'Test Judge',
        email: 'judge@test.com',
      };

      const mockScores = [
        { id: 'score-1', score: 80, judgeId: 'judge-1', categoryId: 'cat-1', criterion: {}, category: {} },
        { id: 'score-2', score: 90, judgeId: 'judge-1', categoryId: 'cat-2', criterion: {}, category: {} },
        { id: 'score-3', score: 85, judgeId: 'judge-1', categoryId: 'cat-1', criterion: {}, category: {} },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockJudge as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.printJudgePerformance(
        { judgeId: 'judge-1', format: 'html' },
        'Test User'
      );

      const html = result.content.toString();
      expect(html).toContain('3'); // totalScores
      expect(html).toContain('2'); // categoriesJudged
    });

    it('should handle judge with no scores', async () => {
      const mockJudge = {
        id: 'judge-1',
        name: 'Test Judge',
        email: 'judge@test.com',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockJudge as any);
      mockPrisma.score.findMany.mockResolvedValue([]);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.printJudgePerformance(
        { judgeId: 'judge-1', format: 'html' },
        'Test User'
      );

      const html = result.content.toString();
      expect(html).toContain('0'); // totalScores or averageScore
    });

    it('should throw error if judge not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.printJudgePerformance({ judgeId: 'nonexistent' }, 'Test User')
      ).rejects.toThrow('Judge not found');
    });
  });

  describe('getContestantReport', () => {
    it('should get contestant report data', async () => {
      const mockContestant = {
        id: 'contestant-1',
        name: 'Test Contestant',
        categoryContestants: [
          {
            category: {
              id: 'cat-1',
              contest: {
                id: 'contest-1',
                event: { id: 'event-1' },
              },
            },
          },
        ],
      };

      mockPrisma.contestant.findUnique.mockResolvedValue(mockContestant as any);

      const result = await service.getContestantReport('contestant-1');

      expect(result.id).toBe('contestant-1');
      expect(result.categoryContestants).toHaveLength(1);
    });

    it('should throw error if contestant not found', async () => {
      mockPrisma.contestant.findUnique.mockResolvedValue(null);

      await expect(service.getContestantReport('nonexistent')).rejects.toThrow('Contestant not found');
    });
  });

  describe('getJudgeReport', () => {
    it('should get judge report data', async () => {
      const mockJudge = {
        id: 'judge-1',
        name: 'Test Judge',
        assignments: [
          {
            category: {
              id: 'cat-1',
              contest: {
                id: 'contest-1',
                event: { id: 'event-1' },
              },
            },
          },
        ],
      };

      mockPrisma.judge.findUnique.mockResolvedValue(mockJudge as any);

      const result = await service.getJudgeReport('judge-1');

      expect(result.id).toBe('judge-1');
      expect(result.assignments).toHaveLength(1);
    });

    it('should throw error if judge not found', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(null);

      await expect(service.getJudgeReport('nonexistent')).rejects.toThrow('Judge not found');
    });
  });

  describe('getCategoryReport', () => {
    it('should get category report data', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Test Category',
        contest: {
          id: 'contest-1',
          event: { id: 'event-1' },
        },
        contestants: [],
        judges: [],
        criteria: [],
        scores: [],
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getCategoryReport('cat-1');

      expect(result.id).toBe('cat-1');
    });

    it('should throw error if category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.getCategoryReport('nonexistent')).rejects.toThrow('Category not found');
    });
  });

  describe('getContestReport', () => {
    it('should get contest report data', async () => {
      const mockContest = {
        id: 'contest-1',
        name: 'Test Contest',
        event: { id: 'event-1' },
        categories: [],
      };

      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getContestReport('contest-1');

      expect(result.id).toBe('contest-1');
    });

    it('should throw error if contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(service.getContestReport('nonexistent')).rejects.toThrow('Contest not found');
    });
  });

  describe('getArchivedContestReport', () => {
    it('should get archived contest report data', async () => {
      const mockContest = {
        id: 'contest-1',
        name: 'Archived Contest',
        archived: true,
        event: { id: 'event-1' },
        categories: [],
      };

      mockPrisma.contest.findFirst.mockResolvedValue(mockContest as any);

      const result = await service.getArchivedContestReport('contest-1');

      expect(result.id).toBe('contest-1');
    });

    it('should throw error if archived contest not found', async () => {
      mockPrisma.contest.findFirst.mockResolvedValue(null);

      await expect(service.getArchivedContestReport('nonexistent')).rejects.toThrow('Archived contest not found');
    });

    it('should only retrieve archived contests', async () => {
      mockPrisma.contest.findFirst.mockResolvedValue(null);

      await service.getArchivedContestReport('contest-1').catch(() => {});

      expect(mockPrisma.contest.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'contest-1',
          archived: true,
        },
        include: expect.any(Object),
      });
    });
  });

  describe('PDF generation', () => {
    it('should configure puppeteer with correct settings', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await service.printEventReport({ eventId: 'event-1', format: 'pdf' }, 'Test User');

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    });

    it('should set A4 format with margins', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await service.printEventReport({ eventId: 'event-1', format: 'pdf' }, 'Test User');

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          printBackground: true,
          margin: expect.any(Object),
        })
      );
    });

    it('should close browser after PDF generation', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await service.printEventReport({ eventId: 'event-1', format: 'pdf' }, 'Test User');

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should accept custom PDF options', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [],
      };

      const customOptions = {
        landscape: true,
        format: 'Letter',
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await service.printEventReport(
        { eventId: 'event-1', format: 'pdf', options: customOptions },
        'Test User'
      );

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          landscape: true,
          format: 'Letter',
        })
      );
    });
  });
});
