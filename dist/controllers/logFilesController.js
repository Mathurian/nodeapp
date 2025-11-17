"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLogFile = exports.cleanupOldLogs = exports.downloadLogFile = exports.getLogFileContents = exports.getLogFiles = exports.LogFilesController = void 0;
const container_1 = require("../config/container");
const LogFilesService_1 = require("../services/LogFilesService");
const responseHelpers_1 = require("../utils/responseHelpers");
class LogFilesController {
    logFilesService;
    constructor() {
        this.logFilesService = container_1.container.resolve(LogFilesService_1.LogFilesService);
    }
    getLogFiles = async (_req, res, next) => {
        try {
            const result = await this.logFilesService.getLogFiles();
            return (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    getLogFileContents = async (req, res, next) => {
        try {
            const { filename } = req.params;
            const { lines } = req.query;
            const result = await this.logFilesService.getLogFileContents(filename, lines ? parseInt(lines) : 500);
            return (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    downloadLogFile = async (req, res, next) => {
        try {
            const { filename } = req.params;
            const filePath = await this.logFilesService.getLogFilePath(filename);
            res.download(filePath, filename);
        }
        catch (error) {
            return next(error);
        }
    };
    cleanupOldLogs = async (req, res, next) => {
        try {
            const { daysToKeep } = req.body;
            const result = await this.logFilesService.cleanupOldLogs(daysToKeep);
            return (0, responseHelpers_1.sendSuccess)(res, result, `Deleted ${result.deletedCount} log file(s)`);
        }
        catch (error) {
            return next(error);
        }
    };
    deleteLogFile = async (req, res, next) => {
        try {
            const { filename } = req.params;
            await this.logFilesService.deleteLogFile(filename);
            return (0, responseHelpers_1.sendSuccess)(res, null, `Log file "${filename}" deleted successfully`);
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.LogFilesController = LogFilesController;
const controller = new LogFilesController();
exports.getLogFiles = controller.getLogFiles;
exports.getLogFileContents = controller.getLogFileContents;
exports.downloadLogFile = controller.downloadLogFile;
exports.cleanupOldLogs = controller.cleanupOldLogs;
exports.deleteLogFile = controller.deleteLogFile;
//# sourceMappingURL=logFilesController.js.map