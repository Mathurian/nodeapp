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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeReportWorker = exports.ReportJobProcessor = void 0;
const BaseJobProcessor_1 = require("./BaseJobProcessor");
const QueueService_1 = __importDefault(require("../services/QueueService"));
const logger_1 = require("../utils/logger");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
class ReportJobProcessor extends BaseJobProcessor_1.BaseJobProcessor {
    reportsDir;
    constructor() {
        super('report-job-processor');
        this.reportsDir = path.join(process.cwd(), 'generated-reports');
    }
    validate(data) {
        super.validate(data);
        if (!data.reportType) {
            throw new Error('Report type is required');
        }
        if (!data.format) {
            throw new Error('Report format is required');
        }
        if (!data.requestedBy) {
            throw new Error('Requested by user ID is required');
        }
        const validFormats = ['pdf', 'csv', 'xlsx', 'html'];
        if (!validFormats.includes(data.format)) {
            throw new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
        }
    }
    async process(job) {
        this.validate(job.data);
        const { reportType, format, parameters, requestedBy, notifyEmail } = job.data;
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
            await job.updateProgress(10);
            this.logger.info('Fetching report data', { reportType, parameters });
            const data = await this.fetchReportData(reportType, parameters);
            await job.updateProgress(40);
            this.logger.info('Generating report file', { reportType, format });
            const filename = `report-${reportType}-${Date.now()}.${format}`;
            const filePath = path.join(this.reportsDir, filename);
            await this.generateReportFile(data, format, filePath, job);
            await job.updateProgress(80);
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;
            const report = await prisma.report.create({
                data: {
                    tenantId: job.data.tenantId || 'default_tenant',
                    name: `${reportType} Report`,
                    type: reportType,
                    parameters: JSON.stringify(parameters),
                    format,
                    filePath: filePath || '',
                    fileSize: fileSize || 0,
                    generatedBy: requestedBy
                },
            });
            await job.updateProgress(90);
            if (notifyEmail) {
                await QueueService_1.default.addJob('email', 'send-email', {
                    to: notifyEmail,
                    subject: 'Your Report is Ready',
                    html: `
            <p>Your ${reportType} report has been generated successfully.</p>
            <p>Report ID: ${report.id}</p>
            <p>Format: ${format.toUpperCase()}</p>
            <p>File Size: ${this.formatFileSize(fileSize)}</p>
            <p>You can download it from the reports section.</p>
          `,
                });
            }
            await job.updateProgress(100);
            return {
                success: true,
                reportId: report.id,
                filePath,
                fileSize,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            this.logger.error('Failed to generate report', {
                jobId: job.id,
                reportType,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async fetchReportData(reportType, parameters) {
        switch (reportType) {
            case 'event':
                return await this.fetchEventReportData(parameters);
            case 'scoring':
                return await this.fetchScoringReportData(parameters);
            case 'audit':
                return await this.fetchAuditReportData(parameters);
            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }
    }
    async fetchEventReportData(parameters) {
        const { eventId } = parameters;
        if (!eventId) {
            throw new Error('Event ID is required for event report');
        }
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                contests: {
                    include: {
                        categories: true,
                    },
                },
            },
        });
        if (!event) {
            throw new Error(`Event not found: ${eventId}`);
        }
        return event;
    }
    async fetchScoringReportData(parameters) {
        const { categoryId, _contestId } = parameters;
        if (!categoryId) {
            throw new Error('Category ID is required for scoring report');
        }
        const scores = await prisma.score.findMany({
            where: { categoryId },
            include: {
                judge: true,
                contestant: true,
                criterion: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return scores;
    }
    async fetchAuditReportData(parameters) {
        const { startDate, endDate, userId } = parameters;
        const where = {};
        if (startDate) {
            where.createdAt = { gte: new Date(startDate) };
        }
        if (endDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        }
        if (userId) {
            where.userId = userId;
        }
        const logs = await prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 10000,
        });
        return logs;
    }
    async generateReportFile(data, format, filePath, job) {
        switch (format) {
            case 'csv':
                await this.generateCSV(data, filePath);
                break;
            case 'html':
                await this.generateHTML(data, filePath);
                break;
            case 'pdf':
                throw new Error('PDF generation not yet implemented');
            case 'xlsx':
                throw new Error('Excel generation not yet implemented');
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    async generateCSV(data, filePath) {
        let csv = '';
        if (Array.isArray(data)) {
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                csv += headers.join(',') + '\n';
                data.forEach((row) => {
                    const values = headers.map((header) => {
                        const value = row[header];
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    });
                    csv += values.join(',') + '\n';
                });
            }
        }
        else {
            const headers = Object.keys(data);
            csv += headers.join(',') + '\n';
            csv += headers.map((h) => data[h]).join(',') + '\n';
        }
        await fs.writeFile(filePath, csv, 'utf-8');
    }
    async generateHTML(data, filePath) {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Report</h1>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
    `;
        await fs.writeFile(filePath, html, 'utf-8');
    }
    formatFileSize(bytes) {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
}
exports.ReportJobProcessor = ReportJobProcessor;
const initializeReportWorker = (concurrency = 2) => {
    const processor = new ReportJobProcessor();
    const worker = QueueService_1.default.createWorker('reports', async (job) => await processor.handle(job), concurrency);
    const initLogger = new logger_1.Logger('ReportWorker');
    initLogger.info('Report worker initialized', { concurrency });
    return worker;
};
exports.initializeReportWorker = initializeReportWorker;
exports.default = ReportJobProcessor;
//# sourceMappingURL=ReportJobProcessor.js.map