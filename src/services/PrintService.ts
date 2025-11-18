import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
import { BaseService } from './BaseService';
import {
  PrintTemplate,
  PrintTemplateInput,
  PrintEventReportInput,
  PrintContestResultsInput,
  PrintJudgePerformanceInput,
  PrintFormat,
  PrintOutput,
} from '../types/print.types';

@injectable()
export class PrintService extends BaseService {
  private readonly templatesDir: string;

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
    this.templatesDir = path.join(__dirname, '../templates/print');
  }

  /**
   * Ensure templates directory exists
   */
  private async ensureTemplatesDir(): Promise<void> {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      this.logError('Error creating templates directory', error as Error);
    }
  }

  /**
   * Get all available print templates
   */
  async getPrintTemplates(): Promise<PrintTemplate[]> {
    await this.ensureTemplatesDir();

    const files = await fs.readdir(this.templatesDir);
    const templates = files
      .filter((file) => file.endsWith('.hbs'))
      .map((file) => ({
        name: file.replace('.hbs', ''),
        filename: file,
        path: path.join(this.templatesDir, file),
      }));

    return templates;
  }

  /**
   * Create custom print template
   */
  async createPrintTemplate(
    data: PrintTemplateInput,
    userId: string
  ): Promise<any> {
    this.validateRequired(data, ['name', 'content']);

    await this.ensureTemplatesDir();

    // Validate handlebars template syntax
    try {
      handlebars.compile(data.content);
    } catch (error) {
      throw this.createBadRequestError(
        `Invalid template syntax: ${(error as Error).message}`
      );
    }

    const templatePath = path.join(this.templatesDir, `${data.name}.hbs`);
    await fs.writeFile(templatePath, data.content, 'utf8');

    const template = {
      name: data.name,
      description: data.description || '',
      type: data.type || 'PRINT',
      content: data.content,
      path: templatePath,
    };

    return template;
  }

  /**
   * Update print template
   */
  async updatePrintTemplate(
    id: string,
    data: Partial<PrintTemplateInput>
  ): Promise<any> {
    const templatePath = path.join(this.templatesDir, `${id}.hbs`);

    try {
      await fs.access(templatePath);
    } catch {
      throw this.createNotFoundError('Template not found');
    }

    if (data.content) {
      try {
        handlebars.compile(data.content);
      } catch (error) {
        throw this.createBadRequestError(
          `Invalid template syntax: ${(error as Error).message}`
        );
      }

      await fs.writeFile(templatePath, data.content, 'utf8');
    }

    return {
      id,
      name: data.name || id,
      content: data.content,
      description: data.description,
      type: data.type || 'PRINT',
    };
  }

  /**
   * Delete print template
   */
  async deletePrintTemplate(id: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, `${id}.hbs`);

    try {
      await fs.unlink(templatePath);
    } catch (error) {
      throw this.createNotFoundError('Template not found');
    }
  }

  /**
   * Print event report
   */
  async printEventReport(
    input: PrintEventReportInput,
    userName: string
  ): Promise<PrintOutput> {
    const event = await this.prisma.event.findUnique({
      where: { id: input.eventId },
      include: {
        contests: {
          include: {
            categories: true,
          } as any,
        },
      },
    });

    if (!event) {
      throw this.createNotFoundError('Event not found');
    }

    const templateContent = await this.getTemplateContent(
      input.templateName || 'event-report',
      this.getDefaultEventTemplate()
    );

    return await this.generateReport(
      templateContent,
      { event, generatedAt: new Date().toISOString(), generatedBy: userName, options: input.options },
      input.format || 'pdf',
      `event-report-${event.name}-${Date.now()}`,
      input.options
    );
  }

  /**
   * Print contest results
   */
  async printContestResults(
    input: PrintContestResultsInput,
    userName: string
  ): Promise<PrintOutput> {
    const contest = await this.prisma.contest.findUnique({
      where: { id: input.contestId },
      include: {
        event: true,
        categories: true,
      } as any,
    });

    if (!contest) {
      throw this.createNotFoundError('Contest not found');
    }

    const templateContent = await this.getTemplateContent(
      input.templateName || 'contest-results',
      this.getDefaultContestTemplate()
    );

    return await this.generateReport(
      templateContent,
      { contest, generatedAt: new Date().toISOString(), generatedBy: userName, options: input.options },
      input.format || 'pdf',
      `contest-results-${contest.name}-${Date.now()}`,
      input.options
    );
  }

  /**
   * Print judge performance report
   */
  async printJudgePerformance(
    input: PrintJudgePerformanceInput,
    userName: string
  ): Promise<PrintOutput> {
    const judge = await this.prisma.user.findUnique({
      where: { id: input.judgeId },
    });

    if (!judge) {
      throw this.createNotFoundError('Judge not found');
    }

    // Get scores for this judge
    const scores = await this.prisma.score.findMany({
      where: { judgeId: input.judgeId },
      include: {
        category: true,
        criterion: true,
      } as any,
    });

    const performanceStats = {
      totalScores: scores.length,
      averageScore: scores.length > 0
        ? scores.reduce((sum, score) => sum + score.score!, 0) / scores.length
        : 0,
      scoreDistribution: this.calculateScoreDistribution(scores),
      categoriesJudged: [...new Set(scores.map((score) => score.categoryId))].length,
    };

    const templateContent = await this.getTemplateContent(
      input.templateName || 'judge-performance',
      this.getDefaultJudgeTemplate()
    );

    return await this.generateReport(
      templateContent,
      {
        judge: { ...judge, scores },
        performanceStats,
        generatedAt: new Date().toISOString(),
        generatedBy: userName,
        options: input.options,
      },
      input.format || 'pdf',
      `judge-performance-${judge.name}-${Date.now()}`,
      input.options
    );
  }

  /**
   * Get contestant report data
   */
  async getContestantReport(id: string): Promise<any> {
    const contestant = await this.prisma.contestant.findUnique({
      where: { id },
      include: {
        categoryContestants: {
          include: {
            category: {
              include: {
                contest: {
                  include: {
                    event: true,
                  } as any,
                },
              },
            },
          },
        },
      },
    });

    if (!contestant) {
      throw this.createNotFoundError('Contestant not found');
    }

    return contestant;
  }

  /**
   * Get judge report data
   */
  async getJudgeReport(id: string): Promise<any> {
    const judge = await this.prisma.judge.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            category: {
              include: {
                contest: {
                  include: {
                    event: true,
                  } as any,
                },
              },
            },
          },
        },
      },
    });

    if (!judge) {
      throw this.createNotFoundError('Judge not found');
    }

    return judge;
  }

  /**
   * Get category report data
   */
  async getCategoryReport(id: string): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        contest: {
          include: {
            event: true,
          } as any,
        },
        contestants: {
          include: {
            contestant: true,
          } as any,
        },
        judges: {
          include: {
            judge: true,
          } as any,
        },
        criteria: {
          orderBy: { createdAt: 'asc' },
        },
        scores: {
          include: {
            criterion: true,
          } as any,
        },
      },
    });

    if (!category) {
      throw this.createNotFoundError('Category not found');
    }

    return category;
  }

  /**
   * Get contest report data
   */
  async getContestReport(id: string): Promise<any> {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: {
        event: true,
        categories: {
          include: {
            contestants: {
              include: {
                contestant: true,
              } as any,
            },
            judges: {
              include: {
                judge: true,
              } as any,
            },
            criteria: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!contest) {
      throw this.createNotFoundError('Contest not found');
    }

    return contest;
  }

  /**
   * Get archived contest report data
   */
  async getArchivedContestReport(id: string): Promise<any> {
    const contest = await this.prisma.contest.findFirst({
      where: {
        id,
        archived: true,
      },
      include: {
        event: true,
        categories: {
          include: {
            contestants: {
              include: {
                contestant: true,
              } as any,
            },
            judges: {
              include: {
                judge: true,
              } as any,
            },
            criteria: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!contest) {
      throw this.createNotFoundError('Archived contest not found');
    }

    return contest;
  }

  /**
   * Helper: Get template content
   */
  private async getTemplateContent(
    templateName: string,
    defaultTemplate: string
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    try {
      return await fs.readFile(templatePath, 'utf8');
    } catch {
      return defaultTemplate;
    }
  }

  /**
   * Helper: Generate report (PDF or HTML)
   */
  private async generateReport(
    templateContent: string,
    data: any,
    format: PrintFormat,
    filename: string,
    options: any = {}
  ): Promise<PrintOutput> {
    const template = handlebars.compile(templateContent);
    const html = template(data);

    if (format === 'html') {
      return {
        content: Buffer.from(html),
        contentType: 'text/html',
        filename: `${filename}.html`,
      };
    }

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
      ...options,
    });

    await browser.close();

    return {
      content: pdfBuffer,
      contentType: 'application/pdf',
      filename: `${filename}.pdf`,
    };
  }

  /**
   * Helper: Calculate score distribution
   */
  private calculateScoreDistribution(scores: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    scores.forEach((score) => {
      const range = Math.floor(score.score! / 10) * 10;
      const key = `${range}-${range + 9}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Default event template
   */
  private getDefaultEventTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Event Report - {{event.name}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .event-info { margin-bottom: 20px; }
        .contest-section { margin-bottom: 30px; page-break-inside: avoid; }
        .contest-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .category-section { margin-left: 20px; margin-bottom: 15px; }
        .category-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
        .stats { background-color: #f5f5f5; padding: 10px; margin-bottom: 20px; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Event Report</h1>
        <h2>{{event.name}}</h2>
    </div>

    <div class="event-info">
        <p><strong>Description:</strong> {{event.description}}</p>
        <p><strong>Location:</strong> {{event.location}}</p>
        <p><strong>Status:</strong> {{event.status}}</p>
    </div>

    <div class="stats">
        <h3>Event Statistics</h3>
        <p>Total Contests: {{event.contests.length}}</p>
    </div>

    {{#each event.contests}}
    <div class="contest-section">
        <div class="contest-title">{{name}}</div>
        <p>{{description}}</p>

        {{#each categories}}
        <div class="category-section">
            <div class="category-title">{{name}}</div>
            <p>{{description}}</p>
        </div>
        {{/each}}
    </div>
    {{/each}}

    <div class="footer">
        <p>Generated on {{generatedAt}} by {{generatedBy}}</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Default contest template
   */
  private getDefaultContestTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Contest Results - {{contest.name}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .contest-info { margin-bottom: 20px; }
        .category-section { margin-bottom: 30px; page-break-inside: avoid; }
        .category-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .results-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .results-table th, .results-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .results-table th { background-color: #f2f2f2; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Contest Results</h1>
        <h2>{{contest.name}}</h2>
    </div>

    <div class="contest-info">
        <p><strong>Event:</strong> {{contest.event.name}}</p>
        <p><strong>Description:</strong> {{contest.description}}</p>
    </div>

    {{#each contest.categories}}
    <div class="category-section">
        <div class="category-title">{{name}}</div>
        <p>{{description}}</p>
    </div>
    {{/each}}

    <div class="footer">
        <p>Generated on {{generatedAt}} by {{generatedBy}}</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Default judge template
   */
  private getDefaultJudgeTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Judge Performance Report - {{judge.name}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .judge-info { margin-bottom: 20px; }
        .stats-section { margin-bottom: 30px; }
        .stat-card { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 10px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; }
        .stat-label { font-size: 14px; color: #666; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Judge Performance Report</h1>
        <h2>{{judge.name}}</h2>
    </div>

    <div class="judge-info">
        <p><strong>Email:</strong> {{judge.email}}</p>
        <p><strong>Role:</strong> {{judge.role}}</p>
    </div>

    <div class="stats-section">
        <h3>Performance Statistics</h3>
        <div class="stat-card">
            <div class="stat-value">{{performanceStats.totalScores}}</div>
            <div class="stat-label">Total Scores</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{{performanceStats.averageScore}}</div>
            <div class="stat-label">Average Score</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{{performanceStats.categoriesJudged}}</div>
            <div class="stat-label">Categories Judged</div>
        </div>
    </div>

    <div class="footer">
        <p>Generated on {{generatedAt}} by {{generatedBy}}</p>
    </div>
</body>
</html>
    `;
  }
}
