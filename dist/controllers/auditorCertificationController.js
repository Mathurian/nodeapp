"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitFinalCertification = exports.getFinalCertificationStatus = exports.AuditorCertificationController = void 0;
const container_1 = require("../config/container");
const AuditorCertificationService_1 = require("../services/AuditorCertificationService");
const responseHelpers_1 = require("../utils/responseHelpers");
class AuditorCertificationController {
    auditorCertificationService;
    constructor() {
        this.auditorCertificationService = container_1.container.resolve(AuditorCertificationService_1.AuditorCertificationService);
    }
    getFinalCertificationStatus = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const status = await this.auditorCertificationService.getFinalCertificationStatus(categoryId);
            return (0, responseHelpers_1.sendSuccess)(res, status);
        }
        catch (error) {
            next(error);
        }
    };
    submitFinalCertification = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const { confirmation1, confirmation2 } = req.body;
            const certification = await this.auditorCertificationService.submitFinalCertification(categoryId, req.user.id, req.user.role, { confirmation1, confirmation2 });
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Final certification completed successfully. All scores are now permanently locked.');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AuditorCertificationController = AuditorCertificationController;
const controller = new AuditorCertificationController();
exports.getFinalCertificationStatus = controller.getFinalCertificationStatus;
exports.submitFinalCertification = controller.submitFinalCertification;
//# sourceMappingURL=auditorCertificationController.js.map