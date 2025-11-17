"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReportEmail = exports.exportToCSV = exports.exportToExcel = exports.exportToPDF = exports.deleteReportInstance = exports.getReportInstances = exports.generateContestantReports = exports.generateReport = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.getTemplates = exports.ReportsController = void 0;
const tsyringe_1 = require("tsyringe");
const ReportGenerationService_1 = require("../services/ReportGenerationService");
const ReportExportService_1 = require("../services/ReportExportService");
const ReportTemplateService_1 = require("../services/ReportTemplateService");
const ReportEmailService_1 = require("../services/ReportEmailService");
const ReportInstanceService_1 = require("../services/ReportInstanceService");
class ReportsController {
    generationService;
    exportService;
    templateService;
    emailService;
    instanceService;
    constructor() {
        this.generationService = tsyringe_1.container.resolve(ReportGenerationService_1.ReportGenerationService);
        this.exportService = tsyringe_1.container.resolve(ReportExportService_1.ReportExportService);
        this.templateService = tsyringe_1.container.resolve(ReportTemplateService_1.ReportTemplateService);
        this.emailService = tsyringe_1.container.resolve(ReportEmailService_1.ReportEmailService);
        this.instanceService = tsyringe_1.container.resolve(ReportInstanceService_1.ReportInstanceService);
    }
    getTemplates = async (_req, res, next) => {
        try {
            const templates = await this.templateService.getAllTemplates();
            res.json({ data: templates });
        }
        catch (error) {
            return next(error);
        }
    };
    createTemplate = async (req, res, next) => {
        try {
            const { name, template, parameters, type } = req.body;
            const reportTemplate = await this.templateService.createTemplate({
                name,
                template: template || '{}',
                parameters: parameters || '{}',
                type: type || 'event'
            });
            res.status(201).json(reportTemplate);
        }
        catch (error) {
            return next(error);
        }
    };
    updateTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            if (!id) {
                res.status(400).json({ error: 'Template ID is required' });
                return;
            }
            const updated = await this.templateService.updateTemplate(id, updates);
            res.json(updated);
        }
        catch (error) {
            return next(error);
        }
    };
    deleteTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Template ID is required' });
                return;
            }
            await this.templateService.deleteTemplate(id);
            res.status(204).send();
        }
        catch (error) {
            return next(error);
        }
    };
    generateReport = async (req, res, next) => {
        try {
            const { type, eventId, contestId } = req.body;
            const userId = req.user?.id;
            let reportData;
            if (type === 'event' && eventId) {
                reportData = await this.generationService.generateEventReportData(eventId, userId);
            }
            else if (type === 'contest' && contestId) {
                reportData = await this.generationService.generateContestResultsData(contestId, userId);
            }
            else if (type === 'system') {
                reportData = await this.generationService.generateSystemAnalyticsData(userId);
            }
            else {
                res.status(400).json({ error: 'Invalid report type or missing parameters' });
                return;
            }
            res.status(201).json(reportData);
        }
        catch (error) {
            return next(error);
        }
    };
    generateContestantReports = async (req, res, next) => {
        try {
            const { contestId } = req.body;
            const userId = req.user?.id;
            const reportData = await this.generationService.generateContestResultsData(contestId, userId);
            res.json({
                message: 'Contest results report generated',
                data: reportData
            });
        }
        catch (error) {
            return next(error);
        }
    };
    getReportInstances = async (req, res, next) => {
        try {
            const { type, format, startDate, endDate } = req.query;
            const instances = await this.instanceService.getInstances({
                type: type,
                format: format,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });
            res.json({ data: instances });
        }
        catch (error) {
            return next(error);
        }
    };
    deleteReportInstance = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Instance ID is required' });
                return;
            }
            await this.instanceService.deleteInstance(id);
            res.status(204).send();
        }
        catch (error) {
            return next(error);
        }
    };
    exportToPDF = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Report ID is required' });
                return;
            }
            const reportData = await this.getReportData(id);
            const buffer = await this.exportService.exportReport(reportData, 'pdf');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${id}.pdf`);
            res.send(buffer);
        }
        catch (error) {
            return next(error);
        }
    };
    exportToExcel = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Report ID is required' });
                return;
            }
            const reportData = await this.getReportData(id);
            const buffer = await this.exportService.exportReport(reportData, 'excel');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=report-${id}.xlsx`);
            res.send(buffer);
        }
        catch (error) {
            return next(error);
        }
    };
    exportToCSV = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Report ID is required' });
                return;
            }
            const reportData = await this.getReportData(id);
            const buffer = await this.exportService.exportReport(reportData, 'csv');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=report-${id}.csv`);
            res.send(buffer);
        }
        catch (error) {
            return next(error);
        }
    };
    async getReportData(instanceId) {
        const prisma = require('../utils/prisma');
        const instance = await prisma.reportInstance.findUnique({
            where: { id: instanceId }
        });
        if (!instance) {
            throw new Error('Report instance not found');
        }
        return typeof instance.data === 'string' ? JSON.parse(instance.data) : instance.data;
    }
    sendReportEmail = async (req, res, next) => {
        try {
            const { reportId, recipients, subject, message, format } = req.body;
            const userId = req.user?.id || 'system';
            const reportData = await this.getReportData(reportId);
            await this.emailService.sendReportEmail({
                recipients,
                subject,
                message,
                reportData,
                format: format || 'pdf',
                userId
            });
            res.json({ message: 'Report emailed successfully' });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.ReportsController = ReportsController;
const controller = new ReportsController();
exports.getTemplates = controller.getTemplates;
exports.createTemplate = controller.createTemplate;
exports.updateTemplate = controller.updateTemplate;
exports.deleteTemplate = controller.deleteTemplate;
exports.generateReport = controller.generateReport;
exports.generateContestantReports = controller.generateContestantReports;
exports.getReportInstances = controller.getReportInstances;
exports.deleteReportInstance = controller.deleteReportInstance;
exports.exportToPDF = controller.exportToPDF;
exports.exportToExcel = controller.exportToExcel;
exports.exportToCSV = controller.exportToCSV;
exports.sendReportEmail = controller.sendReportEmail;
//# sourceMappingURL=reportsController.js.map