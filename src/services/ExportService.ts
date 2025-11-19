import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
import { promises as fs } from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
// @ts-ignore - pdfkit types not available
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

const EXPORT_DIR = path.join(__dirname, '../exports');

interface ScoreCSVRow {
  'Contest Name': string;
  'Category': string;
  'Contestant Number': string | number;
  'Contestant Name': string;
  'Judge Name': string;
  'Criterion': string;
  'Max Score': number | string;
  'Score': number;
  'Deduction': number;
  'Scored At': string;
}

@injectable()
export class ExportService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Ensure export directory exists
   */
  private async ensureExportDir(): Promise<void> {
    try {
      await fs.mkdir(EXPORT_DIR, { recursive: true });
    } catch (error) {
      this.logError('Error creating export directory', error);
    }
  }

  /**
   * Export event data to Excel
   */
  async exportEventToExcel(eventId: string, includeDetails = false): Promise<string> {
    await this.ensureExportDir();

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        contests: {
          include: {
            categories: {
              include: {
                criteria: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw this.notFoundError('Event', eventId);
    }

    // Create workbook and worksheets
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Event Manager System';
    workbook.created = new Date();

    // Event Summary Sheet
    const summarySheet = workbook.addWorksheet('Event Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 40 },
    ];

    summarySheet.addRows([
      { field: 'Event Name', value: event.name },
      { field: 'Event Date', value: (event as any).eventDate ? new Date((event as any).eventDate).toLocaleDateString() : 'N/A' },
      { field: 'Location', value: event.location || 'N/A' },
      { field: 'Status', value: (event as any).status || 'N/A' },
      { field: 'Total Contests', value: event.contests?.length || 0 },
    ]);

    // Style header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Contests Sheet
    if (event.contests && event.contests.length > 0) {
      const contestsSheet = workbook.addWorksheet('Contests');
      contestsSheet.columns = [
        { header: 'Contest Name', key: 'name', width: 30 },
        { header: 'Categories', key: 'categories', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      for (const contest of event.contests) {
        contestsSheet.addRow({
          name: contest.name,
          categories: contest.categories?.length || 0,
          status: (contest as any).status || 'N/A',
        });
      }

      contestsSheet.getRow(1).font = { bold: true };
      contestsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
    }

    // Detailed Information (if requested)
    if (includeDetails && event.contests) {
      for (const contest of event.contests) {
        if (contest.categories && contest.categories.length > 0) {
          const categoriesSheet = workbook.addWorksheet(`${contest.name.substring(0, 25)} - Categories`);
          categoriesSheet.columns = [
            { header: 'Category Name', key: 'name', width: 30 },
            { header: 'Max Contestants', key: 'maxContestants', width: 18 },
            { header: 'Criteria Count', key: 'criteriaCount', width: 18 },
          ];

          for (const category of contest.categories) {
            categoriesSheet.addRow({
              name: category.name,
              maxContestants: (category as any).maxContestants || 'N/A',
              criteriaCount: category.criteria?.length || 0,
            });
          }

          categoriesSheet.getRow(1).font = { bold: true };
          categoriesSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
          };
        }
      }
    }

    // Save workbook
    const filename = `event_${eventId}_${Date.now()}_${includeDetails ? 'detailed' : 'summary'}.xlsx`;
    const filepath = path.join(EXPORT_DIR, filename);

    await workbook.xlsx.writeFile(filepath);

    return filepath;
  }

  /**
   * Export contest results to CSV
   */
  async exportContestResultsToCSV(contestId: string): Promise<string> {
    await this.ensureExportDir();

    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        event: true,
        categories: {
          include: {
            criteria: true,
          },
        },
      },
    });

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    // Get all scores for this contest
    const scores = await this.prisma.score.findMany({
      where: {
        category: {
          contestId: contestId,
        },
        score: { not: null },
      },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            contestantNumber: true,
          },
        },
        judge: {
          select: {
            id: true,
            name: true,
          },
        },
        criterion: {
          select: {
            id: true,
            name: true,
            maxScore: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { category: { name: 'asc' } },
        { contestant: { contestantNumber: 'asc' } },
      ],
    });

    // Prepare CSV data
    const csvData: ScoreCSVRow[] = scores.map((score) => ({
      'Contest Name': contest.name,
      'Category': score.category?.name || 'N/A',
      'Contestant Number': score.contestant?.contestantNumber || 'N/A',
      'Contestant Name': score.contestant?.name || 'N/A',
      'Judge Name': score.judge?.name || 'N/A',
      'Criterion': score.criterion?.name || 'N/A',
      'Max Score': score.criterion?.maxScore || 'N/A',
      'Score': score.score,
      'Deduction': score.deduction || 0,
      'Scored At': score.createdAt ? new Date(score.createdAt).toISOString() : 'N/A',
    }));

    // Convert to CSV
    const csvString = stringify(csvData, {
      header: true,
      columns: [
        'Contest Name',
        'Category',
        'Contestant Number',
        'Contestant Name',
        'Judge Name',
        'Criterion',
        'Max Score',
        'Score',
        'Deduction',
        'Scored At',
      ],
    });

    const filename = `contest_${contestId}_${Date.now()}.csv`;
    const filepath = path.join(EXPORT_DIR, filename);

    await fs.writeFile(filepath, csvString);

    return filepath;
  }

  /**
   * Export judge performance to XML
   */
  async exportJudgePerformanceToXML(judgeId: string): Promise<string> {
    await this.ensureExportDir();

    const judge = await this.prisma.judge.findUnique({
      where: { id: judgeId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!judge) {
      throw this.notFoundError('Judge', judgeId);
    }

    // Get judge's scoring activity
    const scores = await this.prisma.score.findMany({
      where: {
        judgeId: judgeId,
        score: { not: null },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        criterion: {
          select: {
            name: true,
            maxScore: true,
          },
        },
        contestant: {
          select: {
            name: true,
            contestantNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to recent 100 scores
    });

    // Calculate statistics
    const totalScores = scores.length;
    const categoriesJudged = new Set(scores.map((s) => s.category?.id)).size;
    const averageScore = totalScores > 0
      ? scores.reduce((sum: number, s) => sum + (s.score || 0), 0) / totalScores
      : 0;

    // Build XML
    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<judge-performance-report>\n';
    xml += '  <judge>\n';
    xml += `    <id>${escapeXml(judge.id)}</id>\n`;
    xml += `    <name>${escapeXml((judge as any).user?.name || 'Unknown')}</name>\n`;
    xml += `    <email>${escapeXml((judge as any).user?.email || 'N/A')}</email>\n`;
    xml += '  </judge>\n';
    xml += '  <statistics>\n';
    xml += `    <total-scores>${totalScores}</total-scores>\n`;
    xml += `    <categories-judged>${categoriesJudged}</categories-judged>\n`;
    xml += `    <average-score>${averageScore.toFixed(2)}</average-score>\n`;
    xml += `    <report-generated>${new Date().toISOString()}</report-generated>\n`;
    xml += '  </statistics>\n';
    xml += '  <scores>\n';

    for (const score of scores) {
      xml += '    <score>\n';
      xml += `      <category>${escapeXml(score.category?.name || 'N/A')}</category>\n`;
      xml += `      <contestant>${escapeXml(score.contestant?.name || 'N/A')}</contestant>\n`;
      xml += `      <contestant-number>${escapeXml(String(score.contestant?.contestantNumber || 'N/A'))}</contestant-number>\n`;
      xml += `      <criterion>${escapeXml(score.criterion?.name || 'N/A')}</criterion>\n`;
      xml += `      <max-score>${score.criterion?.maxScore || 0}</max-score>\n`;
      xml += `      <score-value>${score.score}</score-value>\n`;
      xml += `      <deduction>${score.deduction || 0}</deduction>\n`;
      xml += `      <scored-at>${new Date(score.createdAt).toISOString()}</scored-at>\n`;
      xml += '    </score>\n';
    }

    xml += '  </scores>\n';
    xml += '</judge-performance-report>\n';

    const filename = `judge_${judgeId}_${Date.now()}.xml`;
    const filepath = path.join(EXPORT_DIR, filename);

    await fs.writeFile(filepath, xml);

    return filepath;
  }

  /**
   * Export system analytics to PDF
   */
  async exportSystemAnalyticsToPDF(startDate?: string, endDate?: string): Promise<string> {
    await this.ensureExportDir();

    // Gather analytics data between startDate and endDate
    const whereClause: {
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Get analytics data
    const totalEvents = await this.prisma.event.count({ where: whereClause });
    const totalContests = await this.prisma.contest.count({ where: whereClause });
    const totalCategories = await this.prisma.category.count({ where: whereClause });
    const totalScores = await this.prisma.score.count({
      where: {
        ...whereClause,
        score: { not: null },
      },
    });
    const totalJudges = await this.prisma.judge.count({ where: whereClause });
    const totalContestants = await this.prisma.contestant.count({ where: whereClause });

    // Get recent events
    const recentEvents = await this.prisma.event.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        name: true,
        startDate: true,
        createdAt: true,
      },
    });

    // Create PDF
    const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_time';
    const filename = `analytics_${dateRange}_${Date.now()}.pdf`;
    const filepath = path.join(EXPORT_DIR, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = createWriteStream(filepath);

        doc.pipe(stream);

        // Title
        doc.fontSize(20).text('System Analytics Report', { align: 'center' });
        doc.moveDown();

        // Date Range
        doc.fontSize(12).text(
          `Date Range: ${startDate || 'All Time'} to ${endDate || 'Present'}`,
          { align: 'center' }
        );
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary Statistics
        doc.fontSize(16).text('Summary Statistics', { underline: true });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Total Events: ${totalEvents}`);
        doc.text(`Total Contests: ${totalContests}`);
        doc.text(`Total Categories: ${totalCategories}`);
        doc.text(`Total Scores Recorded: ${totalScores}`);
        doc.text(`Total Judges: ${totalJudges}`);
        doc.text(`Total Contestants: ${totalContestants}`);
        doc.moveDown(2);

        // Recent Events
        if (recentEvents.length > 0) {
          doc.fontSize(16).text('Recent Events', { underline: true });
          doc.moveDown();

          doc.fontSize(10);
          recentEvents.forEach((event) => {
            doc.text(`• ${event.name}`, { continued: true });
            doc.text(` - ${(event as any).status || 'N/A'}`, { continued: true });
            doc.text(
              ` (${(event as any).eventDate ? new Date((event as any).eventDate).toLocaleDateString() : 'No date'})`,
              { align: 'left' }
            );
          });
          doc.moveDown();
        }

        // Performance Metrics
        doc.addPage();
        doc.fontSize(16).text('Performance Metrics', { underline: true });
        doc.moveDown();

        doc.fontSize(12);
        const avgScoresPerCategory = totalCategories > 0 ? (totalScores / totalCategories).toFixed(2) : 0;
        const avgCategoriesPerContest = totalContests > 0 ? (totalCategories / totalContests).toFixed(2) : 0;
        const avgContestsPerEvent = totalEvents > 0 ? (totalContests / totalEvents).toFixed(2) : 0;

        doc.text(`Average Scores per Category: ${avgScoresPerCategory}`);
        doc.text(`Average Categories per Contest: ${avgCategoriesPerContest}`);
        doc.text(`Average Contests per Event: ${avgContestsPerEvent}`);
        doc.moveDown(2);

        // Footer
        doc.fontSize(8).text(
          'Generated by Event Manager System',
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get export history for a user
   */
  async getExportHistory(userId: string, limit = 50) {
    // Check if reportInstance table exists in schema
    const exports = 'reportInstance' in this.prisma
      ? await this.prisma.reportInstance.findMany({
          where: {
            generatedById: userId,
          },
          orderBy: { generatedAt: 'desc' },
          take: limit,
        })
      : [];

    return {
      exports,
      message: 'Export history retrieved successfully',
    };
  }
}
