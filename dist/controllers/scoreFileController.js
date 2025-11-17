"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadScoreFile = exports.deleteScoreFile = exports.updateScoreFile = exports.getAllScoreFiles = exports.getScoreFilesByContestant = exports.getScoreFilesByJudge = exports.getScoreFilesByCategory = exports.getScoreFileById = exports.uploadScoreFile = exports.ScoreFileController = void 0;
const tsyringe_1 = require("tsyringe");
const ScoreFileService_1 = require("../services/ScoreFileService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
const fs_1 = require("fs");
class ScoreFileController {
    scoreFileService;
    constructor() {
        this.scoreFileService = tsyringe_1.container.resolve(ScoreFileService_1.ScoreFileService);
    }
    uploadScoreFile = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { categoryId, judgeId, contestantId, fileName, fileType, filePath, fileSize, notes } = req.body;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            const scoreFile = await this.scoreFileService.uploadScoreFile({
                categoryId,
                judgeId,
                contestantId,
                fileName,
                fileType,
                filePath,
                fileSize,
                notes
            }, req.user.id);
            log.info('Score file uploaded', { categoryId, judgeId, fileId: scoreFile.id });
            (0, responseHelpers_1.sendSuccess)(res, scoreFile, 'Score file uploaded successfully');
        }
        catch (error) {
            log.error('Upload score file error', { error: error.message });
            return next(error);
        }
    };
    getScoreFileById = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { id } = req.params;
            const file = await this.scoreFileService.getScoreFileById(id);
            if (!file) {
                (0, responseHelpers_1.sendError)(res, 'Score file not found', 404);
                return;
            }
            log.info('Score file retrieved', { id });
            (0, responseHelpers_1.sendSuccess)(res, file);
        }
        catch (error) {
            log.error('Get score file error', { error: error.message });
            return next(error);
        }
    };
    getScoreFilesByCategory = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { categoryId } = req.params;
            const files = await this.scoreFileService.getScoreFilesByCategory(categoryId);
            log.info('Score files retrieved by category', { categoryId, count: files.length });
            (0, responseHelpers_1.sendSuccess)(res, files);
        }
        catch (error) {
            log.error('Get score files by category error', { error: error.message });
            return next(error);
        }
    };
    getScoreFilesByJudge = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { judgeId } = req.params;
            const files = await this.scoreFileService.getScoreFilesByJudge(judgeId);
            log.info('Score files retrieved by judge', { judgeId, count: files.length });
            (0, responseHelpers_1.sendSuccess)(res, files);
        }
        catch (error) {
            log.error('Get score files by judge error', { error: error.message });
            return next(error);
        }
    };
    getScoreFilesByContestant = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { contestantId } = req.params;
            const files = await this.scoreFileService.getScoreFilesByContestant(contestantId);
            log.info('Score files retrieved by contestant', { contestantId, count: files.length });
            (0, responseHelpers_1.sendSuccess)(res, files);
        }
        catch (error) {
            log.error('Get score files by contestant error', { error: error.message });
            return next(error);
        }
    };
    getAllScoreFiles = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { categoryId, judgeId, contestantId, status } = req.query;
            const files = await this.scoreFileService.getAllScoreFiles({
                categoryId: categoryId,
                judgeId: judgeId,
                contestantId: contestantId,
                status: status
            });
            log.info('All score files retrieved', { count: files.length });
            (0, responseHelpers_1.sendSuccess)(res, files);
        }
        catch (error) {
            log.error('Get all score files error', { error: error.message });
            return next(error);
        }
    };
    updateScoreFile = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            const scoreFile = await this.scoreFileService.updateScoreFile(id, { status, notes }, req.user.id, req.user.role);
            log.info('Score file updated', { id });
            (0, responseHelpers_1.sendSuccess)(res, scoreFile, 'Score file updated successfully');
        }
        catch (error) {
            log.error('Update score file error', { error: error.message });
            return next(error);
        }
    };
    deleteScoreFile = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { id } = req.params;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            await this.scoreFileService.deleteScoreFile(id, req.user.id, req.user.role);
            log.info('Score file deleted', { id });
            (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            log.error('Delete score file error', { error: error.message });
            return next(error);
        }
    };
    downloadScoreFile = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoreFile');
        try {
            const { id } = req.params;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            const fileInfo = await this.scoreFileService.getScoreFileById(id);
            if (!fileInfo) {
                (0, responseHelpers_1.sendError)(res, 'Score file not found', 404);
                return;
            }
            res.setHeader('Content-Type', fileInfo.fileType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
            const fileStream = await fs_1.promises.readFile(fileInfo.filePath);
            res.send(fileStream);
            log.info('Score file downloaded', { id });
        }
        catch (error) {
            log.error('Download score file error', { error: error.message });
            return next(error);
        }
    };
}
exports.ScoreFileController = ScoreFileController;
const controller = new ScoreFileController();
exports.uploadScoreFile = controller.uploadScoreFile;
exports.getScoreFileById = controller.getScoreFileById;
exports.getScoreFilesByCategory = controller.getScoreFilesByCategory;
exports.getScoreFilesByJudge = controller.getScoreFilesByJudge;
exports.getScoreFilesByContestant = controller.getScoreFilesByContestant;
exports.getAllScoreFiles = controller.getAllScoreFiles;
exports.updateScoreFile = controller.updateScoreFile;
exports.deleteScoreFile = controller.deleteScoreFile;
exports.downloadScoreFile = controller.downloadScoreFile;
//# sourceMappingURL=scoreFileController.js.map