"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportHistory = exports.exportSystemAnalyticsToPDF = exports.exportJudgePerformanceToXML = exports.exportContestResultsToCSV = exports.exportEventToExcel = exports.ExportController = void 0;
const container_1 = require("../config/container");
const ExportService_1 = require("../services/ExportService");
const responseHelpers_1 = require("../utils/responseHelpers");
class ExportController {
    exportService;
    constructor() {
        this.exportService = container_1.container.resolve(ExportService_1.ExportService);
    }
    exportEventToExcel = async (req, res, next) => {
        try {
            const { eventId, includeDetails = false } = req.body;
            if (!eventId) {
                res.status(400).json({ error: 'Event ID is required' });
                return;
            }
            const filepath = await this.exportService.exportEventToExcel(eventId, Boolean(includeDetails));
            (0, responseHelpers_1.sendSuccess)(res, { filepath }, 'Event exported to Excel successfully');
        }
        catch (error) {
            next(error);
        }
    };
    exportContestResultsToCSV = async (req, res, next) => {
        try {
            const { contestId } = req.body;
            if (!contestId) {
                res.status(400).json({ error: 'Contest ID is required' });
                return;
            }
            const filepath = await this.exportService.exportContestResultsToCSV(contestId);
            (0, responseHelpers_1.sendSuccess)(res, { filepath }, 'Contest results exported to CSV successfully');
        }
        catch (error) {
            next(error);
        }
    };
    exportJudgePerformanceToXML = async (req, res, next) => {
        try {
            const { judgeId } = req.body;
            if (!judgeId) {
                res.status(400).json({ error: 'Judge ID is required' });
                return;
            }
            const filepath = await this.exportService.exportJudgePerformanceToXML(judgeId);
            (0, responseHelpers_1.sendSuccess)(res, { filepath }, 'Judge performance exported to XML successfully');
        }
        catch (error) {
            next(error);
        }
    };
    exportSystemAnalyticsToPDF = async (req, res, next) => {
        try {
            const { startDate, endDate } = req.body;
            const filepath = await this.exportService.exportSystemAnalyticsToPDF(startDate, endDate);
            (0, responseHelpers_1.sendSuccess)(res, { filepath }, 'System analytics exported to PDF successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getExportHistory = async (req, res, next) => {
        try {
            const user = req.user;
            const { limit } = req.query;
            const result = await this.exportService.getExportHistory(user.id, limit ? Number(limit) : undefined);
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ExportController = ExportController;
const controller = new ExportController();
exports.exportEventToExcel = controller.exportEventToExcel;
exports.exportContestResultsToCSV = controller.exportContestResultsToCSV;
exports.exportJudgePerformanceToXML = controller.exportJudgePerformanceToXML;
exports.exportSystemAnalyticsToPDF = controller.exportSystemAnalyticsToPDF;
exports.getExportHistory = controller.getExportHistory;
//# sourceMappingURL=exportController.js.map