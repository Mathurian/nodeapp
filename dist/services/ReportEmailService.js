"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportEmailService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const ReportExportService_1 = require("./ReportExportService");
let ReportEmailService = class ReportEmailService extends BaseService_1.BaseService {
    exportService;
    constructor(exportService) {
        super();
        this.exportService = exportService;
    }
    async sendReportEmail(data) {
        try {
            this.validateRequired(data, ['recipients', 'reportData', 'format', 'userId']);
            const invalidEmails = data.recipients.filter(email => !this.isValidEmail(email));
            if (invalidEmails.length > 0) {
                throw new BaseService_1.ValidationError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
            }
            const buffer = await this.exportService.exportReport(data.reportData, data.format);
            const filename = this.exportService.generateFilename(data.reportData.metadata?.reportType || 'report', data.format);
            const emailTemplate = this.renderEmailTemplate({
                reportType: data.reportData.metadata?.reportType || 'Report',
                message: data.message || 'Please find the attached report.',
                generatedAt: data.reportData.metadata?.generatedAt || new Date().toISOString()
            });
            this.logInfo('Report email prepared', {
                recipients: data.recipients,
                format: data.format,
                filename,
                bufferSize: buffer.length
            });
            console.log(`[EMAIL] Would send ${data.format} report to: ${data.recipients.join(', ')}`);
            console.log(`[EMAIL] Subject: ${data.subject || emailTemplate.subject}`);
            console.log(`[EMAIL] Attachment: ${filename} (${buffer.length} bytes)`);
        }
        catch (error) {
            this.handleError(error, { method: 'sendReportEmail', recipients: data.recipients });
        }
    }
    renderEmailTemplate(variables) {
        const subject = `${variables.reportType} - Generated ${new Date(variables.generatedAt).toLocaleDateString()}`;
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .button { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${variables.reportType}</h1>
          </div>
          <div class="content">
            <p>${variables.message}</p>
            <p><strong>Generated:</strong> ${new Date(variables.generatedAt).toLocaleString()}</p>
            <p>The report is attached to this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Event Manager System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const text = `
${variables.reportType}

${variables.message}

Generated: ${new Date(variables.generatedAt).toLocaleString()}

The report is attached to this email.

---
This is an automated message from the Event Manager System.
Please do not reply to this email.
    `.trim();
        return { subject, html, text };
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    async sendBatchReportEmails(emails) {
        const results = {
            sent: 0,
            failed: 0,
            errors: []
        };
        for (const emailData of emails) {
            try {
                await this.sendReportEmail(emailData);
                results.sent++;
            }
            catch (error) {
                results.failed++;
                results.errors.push(`Failed to send to ${emailData.recipients.join(', ')}: ${error.message}`);
                this.logError('Batch email failed', { error, recipients: emailData.recipients });
            }
        }
        this.logInfo('Batch email report completed', results);
        return results;
    }
    async scheduleReportEmail(data, scheduledAt) {
        try {
            this.logInfo('Report email scheduled', {
                recipients: data.recipients,
                scheduledAt: scheduledAt.toISOString()
            });
            return {
                scheduled: true,
                scheduledAt
            };
        }
        catch (error) {
            this.handleError(error, { method: 'scheduleReportEmail' });
        }
    }
};
exports.ReportEmailService = ReportEmailService;
exports.ReportEmailService = ReportEmailService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(ReportExportService_1.ReportExportService)),
    __metadata("design:paramtypes", [ReportExportService_1.ReportExportService])
], ReportEmailService);
//# sourceMappingURL=ReportEmailService.js.map