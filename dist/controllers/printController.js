"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printArchivedContestReport = exports.printContestReport = exports.printCategoryReport = exports.printJudgeReport = exports.printContestantReport = exports.printJudgePerformance = exports.printContestResults = exports.printEventReport = exports.deletePrintTemplate = exports.updatePrintTemplate = exports.createPrintTemplate = exports.getPrintTemplates = exports.PrintController = void 0;
const container_1 = require("../config/container");
const PrintService_1 = require("../services/PrintService");
const responseHelpers_1 = require("../utils/responseHelpers");
class PrintController {
    printService;
    constructor() {
        this.printService = container_1.container.resolve(PrintService_1.PrintService);
    }
    getPrintTemplates = async (req, res, next) => {
        try {
            const templates = await this.printService.getPrintTemplates();
            (0, responseHelpers_1.successResponse)(res, { templates }, 'Print templates retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createPrintTemplate = async (req, res, next) => {
        try {
            const data = req.body;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const template = await this.printService.createPrintTemplate(data, userId);
            (0, responseHelpers_1.successResponse)(res, { template }, 'Print template created successfully', 201);
        }
        catch (error) {
            next(error);
        }
    };
    updatePrintTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            const data = req.body;
            const template = await this.printService.updatePrintTemplate(id, data);
            (0, responseHelpers_1.successResponse)(res, { template }, 'Print template updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deletePrintTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.printService.deletePrintTemplate(id);
            (0, responseHelpers_1.successResponse)(res, null, 'Print template deleted successfully');
        }
        catch (error) {
            next(error);
        }
    };
    printEventReport = async (req, res, next) => {
        try {
            const input = req.body;
            const userName = req.user?.name || 'Unknown';
            const output = await this.printService.printEventReport(input, userName);
            res.setHeader('Content-Type', output.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`);
            res.send(output.content);
        }
        catch (error) {
            next(error);
        }
    };
    printContestResults = async (req, res, next) => {
        try {
            const input = req.body;
            const userName = req.user?.name || 'Unknown';
            const output = await this.printService.printContestResults(input, userName);
            res.setHeader('Content-Type', output.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`);
            res.send(output.content);
        }
        catch (error) {
            next(error);
        }
    };
    printJudgePerformance = async (req, res, next) => {
        try {
            const input = req.body;
            const userName = req.user?.name || 'Unknown';
            const output = await this.printService.printJudgePerformance(input, userName);
            res.setHeader('Content-Type', output.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`);
            res.send(output.content);
        }
        catch (error) {
            next(error);
        }
    };
    printContestantReport = async (req, res, next) => {
        try {
            const { id } = req.params;
            const contestant = await this.printService.getContestantReport(id);
            (0, responseHelpers_1.successResponse)(res, contestant, 'Contestant report retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    printJudgeReport = async (req, res, next) => {
        try {
            const { id } = req.params;
            const judge = await this.printService.getJudgeReport(id);
            (0, responseHelpers_1.successResponse)(res, judge, 'Judge report retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    printCategoryReport = async (req, res, next) => {
        try {
            const { id } = req.params;
            const category = await this.printService.getCategoryReport(id);
            (0, responseHelpers_1.successResponse)(res, category, 'Category report retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    printContestReport = async (req, res, next) => {
        try {
            const { id } = req.params;
            const contest = await this.printService.getContestReport(id);
            (0, responseHelpers_1.successResponse)(res, contest, 'Contest report retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    printArchivedContestReport = async (req, res, next) => {
        try {
            const { id } = req.params;
            const contest = await this.printService.getArchivedContestReport(id);
            (0, responseHelpers_1.successResponse)(res, contest, 'Archived contest report retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.PrintController = PrintController;
const controller = new PrintController();
exports.getPrintTemplates = controller.getPrintTemplates;
exports.createPrintTemplate = controller.createPrintTemplate;
exports.updatePrintTemplate = controller.updatePrintTemplate;
exports.deletePrintTemplate = controller.deletePrintTemplate;
exports.printEventReport = controller.printEventReport;
exports.printContestResults = controller.printContestResults;
exports.printJudgePerformance = controller.printJudgePerformance;
exports.printContestantReport = controller.printContestantReport;
exports.printJudgeReport = controller.printJudgeReport;
exports.printCategoryReport = controller.printCategoryReport;
exports.printContestReport = controller.printContestReport;
exports.printArchivedContestReport = controller.printArchivedContestReport;
//# sourceMappingURL=printController.js.map