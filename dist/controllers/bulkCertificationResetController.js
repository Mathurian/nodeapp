"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCertifications = exports.BulkCertificationResetController = void 0;
const tsyringe_1 = require("tsyringe");
const BulkCertificationResetService_1 = require("../services/BulkCertificationResetService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class BulkCertificationResetController {
    bulkCertificationResetService;
    constructor() {
        this.bulkCertificationResetService = tsyringe_1.container.resolve(BulkCertificationResetService_1.BulkCertificationResetService);
    }
    resetCertifications = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'bulkCertificationReset');
        try {
            const dto = req.body;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            const result = await this.bulkCertificationResetService.resetCertifications(dto, req.user.id, req.user.role);
            log.info('Certifications reset', { dto, userId: req.user.id, resetCount: result.resetCount });
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            log.error('Reset certifications error', { error: error.message });
            next(error);
        }
    };
}
exports.BulkCertificationResetController = BulkCertificationResetController;
const controller = new BulkCertificationResetController();
exports.resetCertifications = controller.resetCertifications;
//# sourceMappingURL=bulkCertificationResetController.js.map