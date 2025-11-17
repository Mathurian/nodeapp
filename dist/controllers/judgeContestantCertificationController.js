"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certifyCategory = exports.getCategoryCertificationStatus = exports.certifyContestantScores = exports.uncertify = exports.certify = exports.getCertifications = exports.JudgeContestantCertificationController = void 0;
const container_1 = require("../config/container");
const JudgeContestantCertificationService_1 = require("../services/JudgeContestantCertificationService");
const responseHelpers_1 = require("../utils/responseHelpers");
class JudgeContestantCertificationController {
    judgeContestantCertificationService;
    prisma;
    constructor() {
        this.judgeContestantCertificationService = container_1.container.resolve(JudgeContestantCertificationService_1.JudgeContestantCertificationService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getCertifications = async (req, res, next) => {
        try {
            const { judgeId, categoryId, contestantId } = req.query;
            const certifications = await this.judgeContestantCertificationService.getCertifications(judgeId, categoryId, contestantId);
            return (0, responseHelpers_1.sendSuccess)(res, certifications);
        }
        catch (error) {
            return next(error);
        }
    };
    certify = async (req, res, next) => {
        try {
            const { judgeId, categoryId, contestantId } = req.body;
            const certification = await this.judgeContestantCertificationService.certify({
                judgeId,
                categoryId,
                contestantId
            });
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Certification created', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    uncertify = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.judgeContestantCertificationService.uncertify(id);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Certification deleted');
        }
        catch (error) {
            return next(error);
        }
    };
    certifyContestantScores = async (req, res, next) => {
        try {
            const { contestantId, categoryId } = req.body;
            if (!contestantId || !categoryId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'contestantId and categoryId are required', 400);
            }
            const result = await this.prisma.score.updateMany({
                where: {
                    contestantId,
                    categoryId,
                    isCertified: false
                },
                data: {
                    isCertified: true,
                    certifiedAt: new Date(),
                    certifiedBy: req.user?.id || null
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                contestantId,
                categoryId,
                certifiedCount: result.count
            }, `Certified ${result.count} scores for contestant in category`);
        }
        catch (error) {
            return next(error);
        }
    };
    getCategoryCertificationStatus = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category ID is required', 400);
            }
            const status = await this.judgeContestantCertificationService.getCategoryCertificationStatus(categoryId);
            return (0, responseHelpers_1.sendSuccess)(res, status, 'Category certification status retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    certifyCategory = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category ID is required', 400);
            }
            const result = await this.prisma.score.updateMany({
                where: {
                    categoryId,
                    isCertified: false
                },
                data: {
                    isCertified: true,
                    certifiedAt: new Date(),
                    certifiedBy: req.user?.id || null
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                categoryId,
                certifiedCount: result.count
            }, `Certified ${result.count} scores in category`);
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.JudgeContestantCertificationController = JudgeContestantCertificationController;
const controller = new JudgeContestantCertificationController();
exports.getCertifications = controller.getCertifications;
exports.certify = controller.certify;
exports.uncertify = controller.uncertify;
exports.certifyContestantScores = controller.certifyContestantScores;
exports.getCategoryCertificationStatus = controller.getCategoryCertificationStatus;
exports.certifyCategory = controller.certifyCategory;
//# sourceMappingURL=judgeContestantCertificationController.js.map