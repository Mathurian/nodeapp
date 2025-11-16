"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportExportService = void 0;
const tsyringe_1 = require("tsyringe");
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const BaseService_1 = require("./BaseService");
let ReportExportService = class ReportExportService extends BaseService_1.BaseService {
    async exportReport(reportData, format) {
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
        }
        catch (error) {
            this.handleError(error, { method: 'exportReport', format });
        }
    }
    async generatePDFBuffer(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });
                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                doc.fontSize(20).text('Event Report', { align: 'center' });
                doc.moveDown();
                if (reportData.metadata) {
                    doc.fontSize(10);
                    doc.text(`Generated: ${reportData.metadata.generatedAt}`);
                    doc.text(`Report Type: ${reportData.metadata.reportType}`);
                    doc.moveDown();
                }
                if (reportData.event) {
                    doc.fontSize(16).text('Event Information', { underline: true });
                    doc.fontSize(12);
                    doc.text(`Name: ${reportData.event.name}`);
                    if (reportData.event.description) {
                        doc.text(`Description: ${reportData.event.description}`);
                    }
                    doc.moveDown();
                }
                if (reportData.contest) {
                    doc.fontSize(16).text('Contest Information', { underline: true });
                    doc.fontSize(12);
                    doc.text(`Name: ${reportData.contest.name}`);
                    if (reportData.contest.description) {
                        doc.text(`Description: ${reportData.contest.description}`);
                    }
                    doc.moveDown();
                }
                if (reportData.winners && reportData.winners.length > 0) {
                    doc.fontSize(16).text('Winners/Results', { underline: true });
                    doc.fontSize(12);
                    reportData.winners.forEach((winner, index) => {
                        const name = winner.contestant?.name || 'Unknown';
                        doc.text(`${index + 1}. ${name} - Score: ${winner.totalScore}` +
                            (winner.totalPossibleScore ? ` / ${winner.totalPossibleScore}` : ''));
                    });
                    doc.moveDown();
                }
                if (reportData.statistics) {
                    doc.fontSize(16).text('Statistics', { underline: true });
                    doc.fontSize(12);
                    Object.entries(reportData.statistics).forEach(([key, value]) => {
                        if (typeof value !== 'object') {
                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            doc.text(`${label}: ${value}`);
                        }
                    });
                }
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async generateExcelBuffer(reportData) {
        try {
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = 'Event Manager System';
            workbook.created = new Date();
            const worksheet = workbook.addWorksheet('Report');
            worksheet.addRow(['Event Report']);
            worksheet.getCell('A1').font = { size: 16, bold: true };
            worksheet.addRow([]);
            if (reportData.metadata) {
                worksheet.addRow(['Generated:', reportData.metadata.generatedAt]);
                worksheet.addRow(['Report Type:', reportData.metadata.reportType]);
                worksheet.addRow([]);
            }
            if (reportData.event) {
                worksheet.addRow(['Event Information']);
                worksheet.addRow(['Name:', reportData.event.name]);
                if (reportData.event.description) {
                    worksheet.addRow(['Description:', reportData.event.description]);
                }
                worksheet.addRow([]);
            }
            if (reportData.winners && reportData.winners.length > 0) {
                worksheet.addRow(['Winners/Results']);
                worksheet.addRow(['Rank', 'Contestant', 'Score', 'Possible Score']);
                reportData.winners.forEach((winner, index) => {
                    worksheet.addRow([
                        index + 1,
                        winner.contestant?.name || 'Unknown',
                        winner.totalScore,
                        winner.totalPossibleScore || 'N/A'
                    ]);
                });
                worksheet.addRow([]);
            }
            if (reportData.statistics) {
                worksheet.addRow(['Statistics']);
                Object.entries(reportData.statistics).forEach(([key, value]) => {
                    if (typeof value !== 'object') {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        worksheet.addRow([label, value]);
                    }
                });
            }
            if (worksheet.columns) {
                worksheet.columns.forEach((column) => {
                    if (column && column.values) {
                        const lengths = column.values.map((v) => v ? v.toString().length : 10);
                        const maxLength = Math.max(...lengths);
                        column.width = maxLength < 10 ? 10 : maxLength + 2;
                    }
                });
            }
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        }
        catch (error) {
            this.handleError(error, { method: 'generateExcelBuffer' });
        }
    }
    async generateCSVBuffer(reportData) {
        try {
            const rows = [];
            rows.push({ field: 'Event Report', value: '' });
            rows.push({ field: '', value: '' });
            if (reportData.metadata) {
                rows.push({ field: 'Generated', value: reportData.metadata.generatedAt });
                rows.push({ field: 'Report Type', value: reportData.metadata.reportType });
                rows.push({ field: '', value: '' });
            }
            if (reportData.event) {
                rows.push({ field: 'Event Information', value: '' });
                rows.push({ field: 'Name', value: reportData.event.name });
                if (reportData.event.description) {
                    rows.push({ field: 'Description', value: reportData.event.description });
                }
                rows.push({ field: '', value: '' });
            }
            if (reportData.winners && reportData.winners.length > 0) {
                rows.push({ field: 'Winners/Results', value: '' });
                rows.push({ field: 'Rank', value: 'Contestant,Score,Possible Score' });
                reportData.winners.forEach((winner, index) => {
                    const name = winner.contestant?.name || 'Unknown';
                    const score = winner.totalScore;
                    const possible = winner.totalPossibleScore || 'N/A';
                    rows.push({ field: index + 1, value: `${name},${score},${possible}` });
                });
                rows.push({ field: '', value: '' });
            }
            if (reportData.statistics) {
                rows.push({ field: 'Statistics', value: '' });
                Object.entries(reportData.statistics).forEach(([key, value]) => {
                    if (typeof value !== 'object') {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        rows.push({ field: label, value });
                    }
                });
            }
            const csvContent = rows.map(row => `"${row.field}","${row.value}"`).join('\n');
            return Buffer.from(csvContent, 'utf-8');
        }
        catch (error) {
            this.handleError(error, { method: 'generateCSVBuffer' });
        }
    }
    getMimeType(format) {
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
    getFileExtension(format) {
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
    generateFilename(reportType, format) {
        const timestamp = new Date().toISOString().split('T')[0];
        const sanitizedType = reportType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `${sanitizedType}_${timestamp}.${this.getFileExtension(format)}`;
    }
};
exports.ReportExportService = ReportExportService;
exports.ReportExportService = ReportExportService = __decorate([
    (0, tsyringe_1.injectable)()
], ReportExportService);
//# sourceMappingURL=ReportExportService.js.map