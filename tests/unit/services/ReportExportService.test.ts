import 'reflect-metadata';

import { ExportFormat, ReportExportService } from '../../../src/services/ReportExportService';
import { ReportData } from '../../../src/services/ReportGenerationService';

jest.mock('pdfkit');
jest.mock('exceljs');

describe('ReportExportService', () => {
  let service: ReportExportService;

  const BASE_METADATA = {
    generatedAt: '2026-02-25T12:00:00.000Z',
    generatedBy: 'user-1',
    reportType: 'event_comprehensive',
  };

  const buildReportData = (overrides: Partial<ReportData> = {}): ReportData => ({
    event: {
      id: 'event-1',
      name: 'Annual Gala',
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-05-03T00:00:00.000Z'),
      contests: [
        {
          id: 'contest-1',
          name: 'Regional Competition',
          eventId: 'event-1',
          event: {
            id: 'event-1',
            name: 'Annual Gala',
            startDate: new Date('2026-05-01T00:00:00.000Z'),
            endDate: new Date('2026-05-03T00:00:00.000Z'),
          },
          categories: [
            {
              id: 'category-1',
              name: 'Solo',
              scoreCap: 100,
              scores: [
                {
                  id: 'score-1',
                  contestantId: 'contestant-1',
                  judgeId: 'judge-1',
                  categoryId: 'category-1',
                  score: 95,
                  contestant: {
                    id: 'contestant-1',
                    name: 'John Doe',
                    contestantNumber: 1,
                  },
                  judge: {
                    id: 'judge-1',
                    name: 'Judge One',
                  },
                  criterion: {
                    id: 'criterion-1',
                    maxScore: 10,
                  },
                },
              ],
            },
          ],
          winners: [
            {
              contestant: {
                id: 'contestant-1',
                name: 'John Doe',
                contestantNumber: 1,
              },
              totalScore: 285,
              totalPossibleScore: 300,
              categoriesParticipated: 3,
            },
          ],
        },
      ],
    },
    contest: {
      id: 'contest-1',
      name: 'Regional Competition',
      eventId: 'event-1',
      event: {
        id: 'event-1',
        name: 'Annual Gala',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-05-03T00:00:00.000Z'),
      },
      categories: [
        {
          id: 'category-1',
          name: 'Solo',
          scoreCap: 100,
          scores: [],
        },
      ],
      winners: [
        {
          contestant: {
            id: 'contestant-1',
            name: 'John Doe',
            contestantNumber: 1,
          },
          totalScore: 285,
          totalPossibleScore: 300,
          categoriesParticipated: 3,
        },
        {
          contestant: {
            id: 'contestant-2',
            name: 'Jane Smith',
            contestantNumber: 2,
          },
          totalScore: 270,
          totalPossibleScore: 300,
          categoriesParticipated: 3,
        },
      ],
    },
    winners: [
      {
        contestant: {
          id: 'contestant-1',
          name: 'John Doe',
          contestantNumber: 1,
        },
        totalScore: 285,
        totalPossibleScore: 300,
        categoriesParticipated: 3,
      },
      {
        contestant: {
          id: 'contestant-2',
          name: 'Jane Smith',
          contestantNumber: 2,
        },
        totalScore: 270,
        totalPossibleScore: 300,
        categoriesParticipated: 3,
      },
    ],
    statistics: {
      totalEvents: 10,
      activeEvents: 5,
      archivedEvents: 5,
      totalContests: 25,
      totalCategories: 50,
      totalScores: 250,
      totalUsers: 40,
      averageScoresPerEvent: 85.5,
      averageContestsPerEvent: 2.5,
    },
    metadata: BASE_METADATA,
    ...overrides,
  });

  beforeEach(() => {
    service = new ReportExportService();
    jest.clearAllMocks();
  });

  describe('exportReport', () => {
    it('exports PDF, Excel, and CSV buffers', async () => {
      const reportData = buildReportData();

      await expect(service.exportReport(reportData, 'pdf')).resolves.toBeInstanceOf(Buffer);
      await expect(service.exportReport(reportData, 'excel')).resolves.toBeInstanceOf(Buffer);
      await expect(service.exportReport(reportData, 'csv')).resolves.toBeInstanceOf(Buffer);
    });

    it('rejects unsupported formats', async () => {
      await expect(
        service.exportReport(buildReportData(), 'xml' as ExportFormat)
      ).rejects.toThrow('Unsupported export format: xml');
    });

    it('handles minimal report data', async () => {
      const minimal: ReportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          reportType: 'minimal',
        },
      };

      await expect(service.exportReport(minimal, 'pdf')).resolves.toBeInstanceOf(Buffer);
    });
  });

  describe('generatePDFBuffer', () => {
    it('renders report content including winners and statistics', async () => {
      const buffer = await service.generatePDFBuffer(buildReportData());

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('handles winners without possible score', async () => {
      const buffer = await service.generatePDFBuffer(
        buildReportData({
          winners: [
            {
              contestant: { id: 'contestant-1', name: 'Winner 1', contestantNumber: 1 },
              totalScore: 95,
              totalPossibleScore: null,
              categoriesParticipated: 2,
            },
          ],
        })
      );

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('ignores object-valued statistics entries', async () => {
      const buffer = await service.generatePDFBuffer(
        buildReportData({
          statistics: {
            totalEvents: 10,
            totalScores: 20,
            averageScore: 85,
          } as any,
        })
      );

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateExcelBuffer', () => {
    it('generates an Excel buffer from current report data', async () => {
      const buffer = await service.generateExcelBuffer(buildReportData());

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('handles undefined contestant names gracefully', async () => {
      const buffer = await service.generateExcelBuffer(
        buildReportData({
          winners: [
            {
              contestant: {
                id: 'contestant-1',
                name: undefined as any,
                contestantNumber: 1,
              },
              totalScore: 95,
              totalPossibleScore: 100,
              categoriesParticipated: 2,
            },
          ],
        })
      );

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateCSVBuffer', () => {
    it('generates CSV content with winners and metadata', async () => {
      const content = (await service.generateCSVBuffer(buildReportData())).toString('utf-8');

      expect(content).toContain('Event Report');
      expect(content).toContain('Generated');
      expect(content).toContain('John Doe');
      expect(content).toContain('Jane Smith');
    });

    it('escapes comma-separated values', async () => {
      const content = (
        await service.generateCSVBuffer(
          buildReportData({
            event: {
              id: 'event-1',
              name: 'Test, Event',
              startDate: new Date('2026-05-01T00:00:00.000Z'),
              endDate: new Date('2026-05-03T00:00:00.000Z'),
              contests: [],
            } as any,
          })
        )
      ).toString('utf-8');

      expect(content).toContain('"Test, Event"');
    });

    it('uses N/A for null possible scores', async () => {
      const content = (
        await service.generateCSVBuffer(
          buildReportData({
            winners: [
              {
                contestant: { id: 'contestant-1', name: 'Test', contestantNumber: 1 },
                totalScore: 95,
                totalPossibleScore: null,
                categoriesParticipated: 2,
              },
            ],
          })
        )
      ).toString('utf-8');

      expect(content).toContain('N/A');
    });
  });

  describe('utility helpers', () => {
    it('returns correct MIME types and extensions', () => {
      expect(service.getMimeType('pdf')).toBe('application/pdf');
      expect(service.getMimeType('excel')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(service.getMimeType('csv')).toBe('text/csv');
      expect(service.getFileExtension('pdf')).toBe('pdf');
      expect(service.getFileExtension('excel')).toBe('xlsx');
      expect(service.getFileExtension('csv')).toBe('csv');
    });

    it('sanitizes generated filenames', () => {
      expect(service.generateFilename('Event Report!@#', 'pdf')).toMatch(
        /^event_report_\d{4}-\d{2}-\d{2}\.pdf$/
      );
      expect(service.generateFilename('report/with\\special:chars', 'csv')).toMatch(
        /^report_with_special_chars_\d{4}-\d{2}-\d{2}\.csv$/
      );
    });
  });
});
