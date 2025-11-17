"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJudgeBio = exports.updateContestantBio = exports.getJudgeBios = exports.getContestantBios = exports.BioController = void 0;
const container_1 = require("../config/container");
const BioService_1 = require("../services/BioService");
const responseHelpers_1 = require("../utils/responseHelpers");
class BioController {
    bioService;
    constructor() {
        this.bioService = container_1.container.resolve(BioService_1.BioService);
    }
    getContestantBios = async (req, res, next) => {
        try {
            const { eventId, contestId, categoryId } = req.query;
            const contestants = await this.bioService.getContestantBios({
                eventId: eventId,
                contestId: contestId,
                categoryId: categoryId
            });
            return (0, responseHelpers_1.sendSuccess)(res, contestants);
        }
        catch (error) {
            return next(error);
        }
    };
    getJudgeBios = async (req, res, next) => {
        try {
            const { eventId, contestId, categoryId } = req.query;
            const judges = await this.bioService.getJudgeBios({
                eventId: eventId,
                contestId: contestId,
                categoryId: categoryId
            });
            return (0, responseHelpers_1.sendSuccess)(res, judges);
        }
        catch (error) {
            return next(error);
        }
    };
    updateContestantBio = async (req, res, next) => {
        try {
            const { contestantId } = req.params;
            const { bio } = req.body;
            let imagePath = req.body.imagePath || undefined;
            if (req.file) {
                imagePath = `/uploads/bios/${req.file.filename}`;
            }
            const contestant = await this.bioService.updateContestantBio(contestantId, {
                bio,
                imagePath
            });
            return (0, responseHelpers_1.sendSuccess)(res, contestant, 'Contestant bio updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    updateJudgeBio = async (req, res, next) => {
        try {
            const { judgeId } = req.params;
            const { bio } = req.body;
            let imagePath = req.body.imagePath || undefined;
            if (req.file) {
                imagePath = `/uploads/bios/${req.file.filename}`;
            }
            const judge = await this.bioService.updateJudgeBio(judgeId, {
                bio,
                imagePath
            });
            return (0, responseHelpers_1.sendSuccess)(res, judge, 'Judge bio updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.BioController = BioController;
const controller = new BioController();
exports.getContestantBios = controller.getContestantBios;
exports.getJudgeBios = controller.getJudgeBios;
exports.updateContestantBio = controller.updateContestantBio;
exports.updateJudgeBio = controller.updateJudgeBio;
//# sourceMappingURL=bioController.js.map