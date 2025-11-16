"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const container_1 = require("../config/container");
const AssignmentService_1 = require("../services/AssignmentService");
const responseHelpers_1 = require("../utils/responseHelpers");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        const judges = await assignmentService.getJudges();
        return (0, responseHelpers_1.sendSuccess)(res, judges, 'Judges retrieved successfully');
    }
    catch (error) {
        next(error);
    }
});
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_JUDGE', 'JUDGE'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        const judge = await assignmentService.createJudge(req.body);
        return (0, responseHelpers_1.sendSuccess)(res, judge, 'Judge created successfully', 201);
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_JUDGE', 'JUDGE'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        const judge = await assignmentService.updateJudge(req.params.id, req.body);
        return (0, responseHelpers_1.sendSuccess)(res, judge, 'Judge updated successfully');
    }
    catch (error) {
        next(error);
    }
});
router.post('/bulk-delete', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('BULK_DELETE_JUDGES', 'JUDGE'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        const { judgeIds } = req.body;
        if (!Array.isArray(judgeIds) || judgeIds.length === 0) {
            return res.status(400).json({ success: false, message: 'judgeIds array is required' });
        }
        const result = await assignmentService.bulkDeleteJudges(judgeIds);
        return (0, responseHelpers_1.sendSuccess)(res, result, `${result.deletedCount} judge(s) deleted successfully`);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_JUDGE', 'JUDGE'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        await assignmentService.deleteJudge(req.params.id);
        return (0, responseHelpers_1.sendSuccess)(res, null, 'Judge deleted successfully');
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
module.exports = router;
//# sourceMappingURL=judgesRoutes.js.map