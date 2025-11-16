"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const puppeteer = __importStar(require("puppeteer"));
const handlebars = __importStar(require("handlebars"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const BaseService_1 = require("./BaseService");
let PrintService = class PrintService extends BaseService_1.BaseService {
    prisma;
    templatesDir;
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.templatesDir = path.join(__dirname, '../templates/print');
    }
    async ensureTemplatesDir() {
        try {
            await fs_1.promises.mkdir(this.templatesDir, { recursive: true });
        }
        catch (error) {
            this.logError('Error creating templates directory', error);
        }
    }
    async getPrintTemplates() {
        await this.ensureTemplatesDir();
        const files = await fs_1.promises.readdir(this.templatesDir);
        const templates = files
            .filter((file) => file.endsWith('.hbs'))
            .map((file) => ({
            name: file.replace('.hbs', ''),
            filename: file,
            path: path.join(this.templatesDir, file),
        }));
        return templates;
    }
    async createPrintTemplate(data, userId) {
        this.validateRequired(data, ['name', 'content']);
        await this.ensureTemplatesDir();
        try {
            handlebars.compile(data.content);
        }
        catch (error) {
            throw this.createBadRequestError(`Invalid template syntax: ${error.message}`);
        }
        const templatePath = path.join(this.templatesDir, `${data.name}.hbs`);
        await fs_1.promises.writeFile(templatePath, data.content, 'utf8');
        const template = {
            name: data.name,
            description: data.description || '',
            type: data.type || 'PRINT',
            content: data.content,
            path: templatePath,
        };
        return template;
    }
    async updatePrintTemplate(id, data) {
        const templatePath = path.join(this.templatesDir, `${id}.hbs`);
        try {
            await fs_1.promises.access(templatePath);
        }
        catch {
            throw this.createNotFoundError('Template not found');
        }
        if (data.content) {
            try {
                handlebars.compile(data.content);
            }
            catch (error) {
                throw this.createBadRequestError(`Invalid template syntax: ${error.message}`);
            }
            await fs_1.promises.writeFile(templatePath, data.content, 'utf8');
        }
        return {
            id,
            name: data.name || id,
            content: data.content,
            description: data.description,
            type: data.type || 'PRINT',
        };
    }
    async deletePrintTemplate(id) {
        const templatePath = path.join(this.templatesDir, `${id}.hbs`);
        try {
            await fs_1.promises.unlink(templatePath);
        }
        catch (error) {
            throw this.createNotFoundError('Template not found');
        }
    }
    async printEventReport(input, userName) {
        const event = await this.prisma.event.findUnique({
            where: { id: input.eventId },
            include: {
                contests: {
                    include: {
                        categories: true,
                    },
                },
            },
        });
        if (!event) {
            throw this.createNotFoundError('Event not found');
        }
        const templateContent = await this.getTemplateContent(input.templateName || 'event-report', this.getDefaultEventTemplate());
        return await this.generateReport(templateContent, { event, generatedAt: new Date().toISOString(), generatedBy: userName, options: input.options }, input.format || 'pdf', `event-report-${event.name}-${Date.now()}`, input.options);
    }
    async printContestResults(input, userName) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: input.contestId },
            include: {
                event: true,
                categories: true,
            },
        });
        if (!contest) {
            throw this.createNotFoundError('Contest not found');
        }
        const templateContent = await this.getTemplateContent(input.templateName || 'contest-results', this.getDefaultContestTemplate());
        return await this.generateReport(templateContent, { contest, generatedAt: new Date().toISOString(), generatedBy: userName, options: input.options }, input.format || 'pdf', `contest-results-${contest.name}-${Date.now()}`, input.options);
    }
    async printJudgePerformance(input, userName) {
        const judge = await this.prisma.user.findUnique({
            where: { id: input.judgeId },
        });
        if (!judge) {
            throw this.createNotFoundError('Judge not found');
        }
        const scores = await this.prisma.score.findMany({
            where: { judgeId: input.judgeId },
            include: {
                category: true,
                criterion: true,
            },
        });
        const performanceStats = {
            totalScores: scores.length,
            averageScore: scores.length > 0
                ? scores.reduce((sum, score) => sum + score.score, 0) / scores.length
                : 0,
            scoreDistribution: this.calculateScoreDistribution(scores),
            categoriesJudged: [...new Set(scores.map((score) => score.categoryId))].length,
        };
        const templateContent = await this.getTemplateContent(input.templateName || 'judge-performance', this.getDefaultJudgeTemplate());
        return await this.generateReport(templateContent, {
            judge: { ...judge, scores },
            performanceStats,
            generatedAt: new Date().toISOString(),
            generatedBy: userName,
            options: input.options,
        }, input.format || 'pdf', `judge-performance-${judge.name}-${Date.now()}`, input.options);
    }
    async getContestantReport(id) {
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
                                    },
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
    async getJudgeReport(id) {
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
                                    },
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
    async getCategoryReport(id) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
                contestants: {
                    include: {
                        contestant: true,
                    },
                },
                judges: {
                    include: {
                        judge: true,
                    },
                },
                criteria: {
                    orderBy: { createdAt: 'asc' },
                },
                scores: {
                    include: {
                        criterion: true,
                    },
                },
            },
        });
        if (!category) {
            throw this.createNotFoundError('Category not found');
        }
        return category;
    }
    async getContestReport(id) {
        const contest = await this.prisma.contest.findUnique({
            where: { id },
            include: {
                event: true,
                categories: {
                    include: {
                        contestants: {
                            include: {
                                contestant: true,
                            },
                        },
                        judges: {
                            include: {
                                judge: true,
                            },
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
    async getArchivedContestReport(id) {
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
                            },
                        },
                        judges: {
                            include: {
                                judge: true,
                            },
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
    async getTemplateContent(templateName, defaultTemplate) {
        const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
        try {
            return await fs_1.promises.readFile(templatePath, 'utf8');
        }
        catch {
            return defaultTemplate;
        }
    }
    async generateReport(templateContent, data, format, filename, options = {}) {
        const template = handlebars.compile(templateContent);
        const html = template(data);
        if (format === 'html') {
            return {
                content: Buffer.from(html),
                contentType: 'text/html',
                filename: `${filename}.html`,
            };
        }
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
    calculateScoreDistribution(scores) {
        const distribution = {};
        scores.forEach((score) => {
            const range = Math.floor(score.score / 10) * 10;
            const key = `${range}-${range + 9}`;
            distribution[key] = (distribution[key] || 0) + 1;
        });
        return distribution;
    }
    getDefaultEventTemplate() {
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
    getDefaultContestTemplate() {
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
    getDefaultJudgeTemplate() {
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
};
exports.PrintService = PrintService;
exports.PrintService = PrintService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], PrintService);
//# sourceMappingURL=PrintService.js.map