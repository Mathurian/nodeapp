"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certifyJudgeScores = exports.certifyContestant = exports.certifyCategory = exports.getCategoryCertificationProgress = exports.CategoryCertificationController = void 0;
const container_1 = require("../config/container");
const CategoryCertificationService_1 = require("../services/CategoryCertificationService");
const responseHelpers_1 = require("../utils/responseHelpers");
class CategoryCertificationController {
    categoryCertificationService;
    prisma;
    constructor() {
        this.categoryCertificationService = container_1.container.resolve(CategoryCertificationService_1.CategoryCertificationService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getCategoryCertificationProgress = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const progress = await this.categoryCertificationService.getCertificationProgress(categoryId);
            return (0, responseHelpers_1.sendSuccess)(res, progress);
        }
        catch (error) {
            return next(error);
        }
    };
    certifyCategory = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const certification = await this.categoryCertificationService.certifyCategory(categoryId, req.user.id, req.user.role, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Category certified successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    certifyContestant = async (req, res, next) => {
        try {
            const { contestantId, categoryId } = req.body;
            if (!contestantId || !categoryId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'contestantId and categoryId are required', 400);
            }
            const certification = await this.prisma.judgeContestantCertification.create({
                data: {
                    judgeId: req.user?.judgeId || '',
                    categoryId,
                    contestantId,
                    certifiedAt: new Date(),
                    tenantId: req.user.tenantId
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Contestant certified successfully', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    certifyJudgeScores = async (req, res, next) => {
        try {
            const { judgeId, categoryId } = req.body;
            if (!judgeId || !categoryId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'judgeId and categoryId are required', 400);
            }
            const result = await this.prisma.score.updateMany({
                where: {
                    judgeId,
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
                judgeId,
                categoryId,
                certifiedCount: result.count
            }, `Certified ${result.count} scores for judge in category`);
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.CategoryCertificationController = CategoryCertificationController;
const controller = new CategoryCertificationController();
exports.getCategoryCertificationProgress = controller.getCategoryCertificationProgress;
exports.certifyCategory = controller.certifyCategory;
exports.certifyContestant = controller.certifyContestant;
exports.certifyJudgeScores = controller.certifyJudgeScores;
//# sourceMappingURL=categoryCertificationController.js.map