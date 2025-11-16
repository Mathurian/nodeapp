"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFiles = exports.deleteFile = exports.uploadImage = exports.uploadFile = exports.UploadController = void 0;
const container_1 = require("../config/container");
const UploadService_1 = require("../services/UploadService");
const responseHelpers_1 = require("../utils/responseHelpers");
class UploadController {
    uploadService;
    constructor() {
        this.uploadService = container_1.container.resolve(UploadService_1.UploadService);
    }
    uploadFile = async (req, res, next) => {
        try {
            const userId = req.user?.id || '';
            const tenantId = req.user?.tenantId || 'default_tenant';
            const { category, eventId, contestId, categoryId } = req.body;
            const file = await this.uploadService.processUploadedFile(req.file, userId, {
                category: category,
                eventId,
                contestId,
                categoryId,
                tenantId
            });
            (0, responseHelpers_1.successResponse)(res, { file }, 'File uploaded successfully');
        }
        catch (error) {
            next(error);
        }
    };
    uploadImage = async (req, res, next) => {
        try {
            const userId = req.user?.id || '';
            const tenantId = req.user?.tenantId || 'default_tenant';
            const { eventId, contestId, categoryId } = req.body;
            const image = await this.uploadService.processUploadedFile(req.file, userId, {
                category: 'CONTESTANT_IMAGE',
                eventId,
                contestId,
                categoryId,
                tenantId
            });
            (0, responseHelpers_1.successResponse)(res, { image }, 'Image uploaded successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deleteFile = async (req, res, next) => {
        try {
            const { fileId } = req.params;
            await this.uploadService.deleteFile(fileId);
            (0, responseHelpers_1.successResponse)(res, null, 'File deleted successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getFiles = async (req, res, next) => {
        try {
            const userId = req.user?.id;
            const files = await this.uploadService.getFiles(userId);
            res.json(files);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.UploadController = UploadController;
const controller = new UploadController();
exports.uploadFile = controller.uploadFile;
exports.uploadImage = controller.uploadImage;
exports.deleteFile = controller.deleteFile;
exports.getFiles = controller.getFiles;
//# sourceMappingURL=uploadController.js.map