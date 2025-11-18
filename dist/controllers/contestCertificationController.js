"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certifyContest = exports.getContestCertificationProgress = exports.ContestCertificationController = void 0;
const container_1 = require("../config/container");
const ContestCertificationService_1 = require("../services/ContestCertificationService");
const responseHelpers_1 = require("../utils/responseHelpers");
class ContestCertificationController {
    contestCertificationService;
    constructor() {
        this.contestCertificationService = container_1.container.resolve(ContestCertificationService_1.ContestCertificationService);
    }
    getContestCertificationProgress = async (req, res, next) => {
        try {
            const { contestId } = req.params;
            const progress = await this.contestCertificationService.getCertificationProgress(contestId);
            return (0, responseHelpers_1.sendSuccess)(res, progress);
        }
        catch (error) {
            return next(error);
        }
    };
    certifyContest = async (req, res, next) => {
        try {
            const { contestId } = req.params;
            const certification = await this.contestCertificationService.certifyContest(contestId, req.user.id, req.user.role, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Contest certified successfully');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.ContestCertificationController = ContestCertificationController;
const controller = new ContestCertificationController();
exports.getContestCertificationProgress = controller.getContestCertificationProgress;
exports.certifyContest = controller.certifyContest;
//# sourceMappingURL=contestCertificationController.js.map