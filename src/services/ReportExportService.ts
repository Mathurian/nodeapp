/**
 * Report Export Service
 * Handles PDF, Excel, and CSV export generation
 */

import { injectable } from 'tsyringe';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { BaseService } from './BaseService';
import { ReportData } from './ReportGenerationService';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  metadata?: Record<string, unknown>;
}

interface CSVRow {
  field: string;
  value: string | number;
}

interface ContestSummary {
  contestName: string;
  categoryCount: number;
  scoreCount: number;
  winnerCount: number;
}

interface WinnerSummary {
  contestName?: string;
  contestantName: string;
  totalScore: number;
  totalPossibleScore: number | null;
}

interface ContestantExportRow {
  section: string;
  label: string;
  value: string | number;
}

@injectable()
export class ReportExportService extends BaseService {
  /**
   * Export report to specified format
   */
  async exportReport(
    reportData: ReportData,
    format: ExportFormat
  ): Promise<Buffer> {
    try {
      switch (format) {
        case 'pdf':
          return this.generatePDFBuffer(reportData);
        case 'excel':
          return this.generateExcelBuffer(reportData);
        case 'csv':
          return this.generateCSVBuffer(reportData);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.handleError(error, { method: 'exportReport', format });
    }
  }

  /**
   * Generate PDF buffer from report data
   */
  async generatePDFBuffer(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text(reportData.contestantReport ? 'Contestant Report' : 'Event Report', { align: 'center' });
        doc.moveDown();

        // Metadata
        if (reportData.metadata) {
          doc.fontSize(10);
          doc.text(`Generated: ${reportData.metadata.generatedAt}`);
          doc.text(`Report Type: ${reportData.metadata.reportType}`);
          const scopeLabel = this.getScopeLabel(reportData);
          if (scopeLabel) {
            doc.text(`Scope: ${scopeLabel}`);
          }
          doc.moveDown();
        }

        // Event Information
        if (reportData.event) {
          doc.fontSize(16).text('Event Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Name: ${reportData.event.name}`);
          if ('description' in reportData.event && reportData.event.description) {
            doc.text(`Description: ${String(reportData.event.description)}`);
          }
          doc.moveDown();

          const contestSummaries = this.getContestSummaries(reportData);
          if (contestSummaries.length > 0) {
            doc.fontSize(14).text('Event Summary', { underline: true });
            doc.fontSize(11);
            contestSummaries.forEach((summary) => {
              doc.text(
                `${summary.contestName}: ${summary.categoryCount} categories, ${summary.scoreCount} scores, ${summary.winnerCount} winners`
              );
            });
            doc.moveDown();
          }
        }

        // Contest Information
        if (reportData.contest) {
          doc.fontSize(16).text('Contest Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Name: ${reportData.contest.name}`);
          if ('description' in reportData.contest && reportData.contest.description) {
            doc.text(`Description: ${String(reportData.contest.description)}`);
          }
          doc.moveDown();
        }

        if (reportData.contestantReport) {
          const contestantReport = reportData.contestantReport;
          doc.fontSize(16).text('Contestant Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Contestant: ${contestantReport.contestant.name}`);
          if (contestantReport.contestant.contestantNumber !== null) {
            doc.text(`Contestant Number: ${contestantReport.contestant.contestantNumber}`);
          }
          doc.text(`Event: ${contestantReport.event.name}`);
          doc.text(`Contest: ${contestantReport.contest.name}`);
          doc.text(
            `Total Score: ${contestantReport.totalScore}` +
              (contestantReport.totalPossibleScore !== null
                ? ` / ${contestantReport.totalPossibleScore}`
                : ''),
          );
          doc.moveDown();

          if (contestantReport.generalCommentary.length > 0) {
            doc.fontSize(14).text('General Commentary', { underline: true });
            doc.fontSize(11);
            contestantReport.generalCommentary.forEach((commentary) => {
              doc.text(`${commentary.scopeLabel} - ${commentary.judgeName}`);
              doc.text(commentary.comment, { indent: 12 });
              doc.moveDown(0.5);
            });
            doc.moveDown();
          }

          contestantReport.categories.forEach((category) => {
            doc.fontSize(14).text(category.categoryName, { underline: true });
            doc.fontSize(11);
            doc.text(
              `Score: ${category.totalScore}` +
                (category.totalPossibleScore !== null ? ` / ${category.totalPossibleScore}` : ''),
            );
            if (category.generalCommentary.length > 0) {
              category.generalCommentary.forEach((commentary) => {
                doc.text(`Scoped Commentary - ${commentary.judgeName}: ${commentary.comment}`);
              });
            }
            category.judges.forEach((judge) => {
              doc.moveDown(0.5);
              doc.text(
                `${judge.judgeName}: ${judge.totalScore}` +
                  (judge.totalPossibleScore !== null ? ` / ${judge.totalPossibleScore}` : ''),
              );
              judge.categories.forEach((judgeCategory) => {
                if (judgeCategory.commentary) {
                  doc.text(`Judge Commentary: ${judgeCategory.commentary}`, { indent: 12 });
                }
                judgeCategory.criteria.forEach((criterion) => {
                  const criterionScore =
                    criterion.score === null
                      ? 'No score'
                      : `${criterion.score}${criterion.maxScore !== null ? ` / ${criterion.maxScore}` : ''}`;
                  doc.text(`${criterion.criterionName}: ${criterionScore}`, { indent: 12 });
                  if (criterion.commentary) {
                    doc.text(`Comment: ${criterion.commentary}`, { indent: 24 });
                  }
                });
              });
            });
            doc.moveDown();
          });
        }

        // Winners/Results
        const winnerRows = this.getWinnerSummaries(reportData);
        if (winnerRows.length > 0) {
          doc.fontSize(16).text('Winners/Results', { underline: true });
          doc.fontSize(12);

          winnerRows.forEach((winner, index) => {
            const contestLabel = winner.contestName ? ` (${winner.contestName})` : '';
            doc.text(
              `${index + 1}. ${winner.contestantName}${contestLabel} - Score: ${winner.totalScore}` +
              (winner.totalPossibleScore ? ` / ${winner.totalPossibleScore}` : '')
            );
          });
          doc.moveDown();
        }

        // Statistics
        const statisticsRows = this.getStatisticsRows(reportData);
        if (statisticsRows.length > 0) {
          doc.fontSize(16).text('Statistics', { underline: true });
          doc.fontSize(12);

          statisticsRows.forEach(({ field, value }) => {
            doc.text(`${field}: ${value}`);
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel buffer from report data
   */
  async generateExcelBuffer(reportData: ReportData): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Event Manager System';
      workbook.created = new Date();

      // Main sheet
      const worksheet = workbook.addWorksheet('Report');

      // Header
      worksheet.addRow(['Event Report']);
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.addRow([]);

      // Metadata
      if (reportData.metadata) {
        worksheet.addRow(['Generated:', reportData.metadata.generatedAt]);
        worksheet.addRow(['Report Type:', reportData.metadata.reportType]);
        const scopeLabel = this.getScopeLabel(reportData);
        if (scopeLabel) {
          worksheet.addRow(['Scope:', scopeLabel]);
        }
        worksheet.addRow([]);
      }

      // Event Information
      if (reportData.event) {
        worksheet.addRow(['Event Information']);
        worksheet.addRow(['Name:', reportData.event.name]);
        if ('description' in reportData.event && reportData.event.description) {
          worksheet.addRow(['Description:', String(reportData.event.description)]);
        }
        const contestSummaries = this.getContestSummaries(reportData);
        if (contestSummaries.length > 0) {
          worksheet.addRow(['Contest', 'Categories', 'Scores', 'Winners']);
          contestSummaries.forEach((summary) => {
            worksheet.addRow([
              summary.contestName,
              summary.categoryCount,
              summary.scoreCount,
              summary.winnerCount,
            ]);
          });
        }
        worksheet.addRow([]);
      }

      if (reportData.contestantReport) {
        const contestantReport = reportData.contestantReport;
        worksheet.addRow(['Contestant Information']);
        worksheet.addRow(['Contestant', contestantReport.contestant.name]);
        if (contestantReport.contestant.contestantNumber !== null) {
          worksheet.addRow(['Contestant Number', contestantReport.contestant.contestantNumber]);
        }
        worksheet.addRow(['Event', contestantReport.event.name]);
        worksheet.addRow(['Contest', contestantReport.contest.name]);
        worksheet.addRow([
          'Total Score',
          contestantReport.totalPossibleScore !== null
            ? `${contestantReport.totalScore} / ${contestantReport.totalPossibleScore}`
            : `${contestantReport.totalScore}`,
        ]);
        worksheet.addRow([]);

        if (contestantReport.generalCommentary.length > 0) {
          worksheet.addRow(['General Commentary']);
          worksheet.addRow(['Scope', 'Judge', 'Comment']);
          contestantReport.generalCommentary.forEach((commentary) => {
            worksheet.addRow([commentary.scopeLabel, commentary.judgeName, commentary.comment]);
          });
          worksheet.addRow([]);
        }

        worksheet.addRow(['Category', 'Judge', 'Criterion', 'Score', 'Scoped Commentary', 'Criterion Commentary']);
        contestantReport.categories.forEach((category) => {
          category.judges.forEach((judge) => {
            judge.categories.forEach((judgeCategory) => {
              judgeCategory.criteria.forEach((criterion) => {
                worksheet.addRow([
                  category.categoryName,
                  judge.judgeName,
                  criterion.criterionName,
                  criterion.score === null
                    ? 'No score'
                    : criterion.maxScore !== null
                      ? `${criterion.score} / ${criterion.maxScore}`
                      : criterion.score,
                  judgeCategory.commentary || '',
                  criterion.commentary || '',
                ]);
              });
            });
          });
        });
        worksheet.addRow([]);
      }

      // Winners
      const winnerRows = this.getWinnerSummaries(reportData);
      if (winnerRows.length > 0) {
        worksheet.addRow(['Winners/Results']);
        worksheet.addRow(['Rank', 'Contest', 'Contestant', 'Score', 'Possible Score']);

        winnerRows.forEach((winner, index) => {
          worksheet.addRow([
            index + 1,
            winner.contestName || 'N/A',
            winner.contestantName,
            winner.totalScore,
            winner.totalPossibleScore || 'N/A',
          ]);
        });
        worksheet.addRow([]);
      }

      // Statistics
      const statisticsRows = this.getStatisticsRows(reportData);
      if (statisticsRows.length > 0) {
        worksheet.addRow(['Statistics']);
        statisticsRows.forEach(({ field, value }) => {
          worksheet.addRow([field, value]);
        });
      }

      // Auto-fit columns
      if (worksheet.columns) {
        worksheet.columns.forEach((column) => {
          if (column && 'values' in column && Array.isArray(column.values)) {
            const lengths = column.values.map((v) => v ? v.toString().length : 10);
            const maxLength = Math.max(...lengths);
            column.width = maxLength < 10 ? 10 : maxLength + 2;
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      this.handleError(error, { method: 'generateExcelBuffer' });
    }
  }

  /**
   * Generate CSV buffer from report data
   */
  async generateCSVBuffer(reportData: ReportData): Promise<Buffer> {
    try {
      const rows: CSVRow[] = [];

      // Header
      rows.push({ field: 'Event Report', value: '' });
      rows.push({ field: '', value: '' });

      // Metadata
      if (reportData.metadata) {
        rows.push({ field: 'Generated', value: reportData.metadata.generatedAt });
        rows.push({ field: 'Report Type', value: reportData.metadata.reportType });
        const scopeLabel = this.getScopeLabel(reportData);
        if (scopeLabel) {
          rows.push({ field: 'Scope', value: scopeLabel });
        }
        rows.push({ field: '', value: '' });
      }

      // Event Information
      if (reportData.event) {
        rows.push({ field: 'Event Information', value: '' });
        rows.push({ field: 'Name', value: reportData.event.name });
        if ('description' in reportData.event && reportData.event.description) {
          rows.push({ field: 'Description', value: String(reportData.event.description) });
        }
        const contestSummaries = this.getContestSummaries(reportData);
        if (contestSummaries.length > 0) {
          rows.push({ field: 'Contest Summary', value: 'Contest,Categories,Scores,Winners' });
          contestSummaries.forEach((summary) => {
            rows.push({
              field: summary.contestName,
              value: `${summary.categoryCount},${summary.scoreCount},${summary.winnerCount}`,
            });
          });
        }
        rows.push({ field: '', value: '' });
      }

      if (reportData.contestantReport) {
        this.getContestantExportRows(reportData).forEach((row) => {
          rows.push({ field: `${row.section} ${row.label}`.trim(), value: row.value });
        });
        rows.push({ field: '', value: '' });
      }

      // Winners
      const winnerRows = this.getWinnerSummaries(reportData);
      if (winnerRows.length > 0) {
        rows.push({ field: 'Winners/Results', value: '' });
        rows.push({ field: 'Rank', value: 'Contest,Contestant,Score,Possible Score' });

        winnerRows.forEach((winner, index) => {
          const contestName = winner.contestName || 'N/A';
          const score = winner.totalScore;
          const possible = winner.totalPossibleScore || 'N/A';
          rows.push({ field: String(index + 1), value: `${contestName},${winner.contestantName},${score},${possible}` });
        });
        rows.push({ field: '', value: '' });
      }

      // Statistics
      const statisticsRows = this.getStatisticsRows(reportData);
      if (statisticsRows.length > 0) {
        rows.push({ field: 'Statistics', value: '' });
        statisticsRows.forEach(({ field, value }) => {
          rows.push({ field, value });
        });
      }

      // Convert to CSV string
      const csvContent = rows.map(row => `"${row.field}","${row.value}"`).join('\n');
      return Buffer.from(csvContent, 'utf-8');
    } catch (error) {
      this.handleError(error, { method: 'generateCSVBuffer' });
    }
  }

  private toReadableLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  }

  private getScopeLabel(reportData: ReportData): string | null {
    const scope = reportData.metadata?.scope;
    if (scope) {
      if (scope.filterMode === 'system') {
        return 'System-wide';
      }

      if (scope.filterMode === 'single_contestant' && scope.contestantName) {
        const eventLabel = scope.eventName || 'Event scope';
        const contestLabel = Array.isArray(scope.contestNames) && scope.contestNames.length > 0
          ? scope.contestNames[0]
          : 'Contest';
        return `${eventLabel} • ${contestLabel} • ${scope.contestantName}`;
      }

      const eventLabel = scope.eventName || (scope.eventId ? 'Event scope' : '');
      if (Array.isArray(scope.contestNames) && scope.contestNames.length > 0) {
        return `${eventLabel || 'Event scope'} • ${scope.contestNames.join(', ')}`;
      }

      if (eventLabel) {
        return `${eventLabel} • all contests`;
      }
    }

    if (reportData.contest?.id) {
      const eventLabel = reportData.contest.event?.name || 'Event scope';
      return `${eventLabel} • ${reportData.contest.name}`;
    }

    if (reportData.event?.id) {
      return `${reportData.event.name} • all contests`;
    }

    return null;
  }

  private getContestantExportRows(reportData: ReportData): ContestantExportRow[] {
    const contestantReport = reportData.contestantReport;
    if (!contestantReport) {
      return [];
    }

    const rows: ContestantExportRow[] = [
      { section: 'Contestant', label: 'Name', value: contestantReport.contestant.name },
      {
        section: 'Contestant',
        label: 'Number',
        value: contestantReport.contestant.contestantNumber ?? 'N/A',
      },
      { section: 'Contestant', label: 'Event', value: contestantReport.event.name },
      { section: 'Contestant', label: 'Contest', value: contestantReport.contest.name },
      {
        section: 'Contestant',
        label: 'Total Score',
        value:
          contestantReport.totalPossibleScore !== null
            ? `${contestantReport.totalScore} / ${contestantReport.totalPossibleScore}`
            : `${contestantReport.totalScore}`,
      },
    ];

    contestantReport.generalCommentary.forEach((commentary) => {
      rows.push({
        section: 'General Commentary',
        label: `${commentary.scopeLabel} - ${commentary.judgeName}`,
        value: commentary.comment,
      });
    });

    contestantReport.categories.forEach((category) => {
      category.judges.forEach((judge) => {
        judge.categories.forEach((judgeCategory) => {
          if (judgeCategory.commentary) {
            rows.push({
              section: category.categoryName,
              label: `${judge.judgeName} Commentary`,
              value: judgeCategory.commentary,
            });
          }

          judgeCategory.criteria.forEach((criterion) => {
            rows.push({
              section: category.categoryName,
              label: `${judge.judgeName} - ${criterion.criterionName}`,
              value:
                criterion.score === null
                  ? 'No score'
                  : criterion.maxScore !== null
                    ? `${criterion.score} / ${criterion.maxScore}`
                    : criterion.score,
            });
            if (criterion.commentary) {
              rows.push({
                section: category.categoryName,
                label: `${judge.judgeName} - ${criterion.criterionName} Commentary`,
                value: criterion.commentary,
              });
            }
          });
        });
      });
    });

    return rows;
  }

  private getContestSummaries(reportData: ReportData): ContestSummary[] {
    const contests = Array.isArray(reportData.event?.contests) ? reportData.event.contests : [];
    return contests.map((contest: any) => {
      const categories = Array.isArray(contest?.categories) ? contest.categories : [];
      const scoreCount = categories.reduce((total: number, category: any) => {
        const scores = Array.isArray(category?.scores) ? category.scores : [];
        return total + scores.length;
      }, 0);
      const winnerCount = Array.isArray(contest?.winners) ? contest.winners.length : 0;

      return {
        contestName: String(contest?.name || 'Unnamed Contest'),
        categoryCount: categories.length,
        scoreCount,
        winnerCount,
      };
    });
  }

  private getWinnerSummaries(reportData: ReportData): WinnerSummary[] {
    if (Array.isArray(reportData.winners) && reportData.winners.length > 0) {
      return reportData.winners.map((winner) => ({
        contestantName: winner.contestant?.name || 'Unknown',
        totalScore: Number(winner.totalScore || 0),
        totalPossibleScore: winner.totalPossibleScore ?? null,
      }));
    }

    const eventContests = Array.isArray(reportData.event?.contests) ? reportData.event.contests : [];
    const winnerRows: WinnerSummary[] = [];
    eventContests.forEach((contest: any) => {
      const winners = Array.isArray(contest?.winners) ? contest.winners : [];
      winners.forEach((winner: any) => {
        winnerRows.push({
          contestName: String(contest?.name || ''),
          contestantName: String(winner?.contestant?.name || 'Unknown'),
          totalScore: Number(winner?.totalScore || 0),
          totalPossibleScore: winner?.totalPossibleScore ?? null,
        });
      });
    });

    return winnerRows.sort((a, b) => b.totalScore - a.totalScore);
  }

  private getStatisticsRows(reportData: ReportData): CSVRow[] {
    const rows: CSVRow[] = [];
    const existingLabels = new Set<string>();

    if (reportData.statistics) {
      Object.entries(reportData.statistics).forEach(([key, value]) => {
        if (typeof value === 'object') return;
        const label = this.toReadableLabel(key);
        existingLabels.add(label.toLowerCase());
        rows.push({ field: label, value });
      });
    }

    const contestSummaries = this.getContestSummaries(reportData);
    if (contestSummaries.length > 0) {
      const totalCategories = contestSummaries.reduce((sum, contest) => sum + contest.categoryCount, 0);
      const totalScores = contestSummaries.reduce((sum, contest) => sum + contest.scoreCount, 0);
      const totalWinners = contestSummaries.reduce((sum, contest) => sum + contest.winnerCount, 0);

      const derivedRows: CSVRow[] = [
        { field: 'Total Contests', value: contestSummaries.length },
        { field: 'Total Categories', value: totalCategories },
        { field: 'Total Scores', value: totalScores },
        { field: 'Total Winners', value: totalWinners },
      ];

      derivedRows.forEach((row) => {
        const key = row.field.toLowerCase();
        if (!existingLabels.has(key)) {
          rows.push(row);
        }
      });
    }

    return rows;
  }

  /**
   * Get MIME type for export format
   */
  getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Get file extension for export format
   */
  getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'pdf';
      case 'excel':
        return 'xlsx';
      case 'csv':
        return 'csv';
      default:
        return 'bin';
    }
  }

  /**
   * Generate filename for export
   */
  generateFilename(reportType: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedType = reportType
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/_+$/g, '')
      .toLowerCase();
    return `${sanitizedType}_${timestamp}.${this.getFileExtension(format)}`;
  }
}
