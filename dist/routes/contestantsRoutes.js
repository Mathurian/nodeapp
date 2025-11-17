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
        const contestants = await assignmentService.getContestants();
        return (0, responseHelpers_1.sendSuccess)(res, contestants, 'Contestants retrieved successfully');
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_CONTESTANT', 'CONTESTANT'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        const contestant = await assignmentService.createContestant(req.body);
        return (0, responseHelpers_1.sendSuccess)(res, contestant, 'Contestant created successfully', 201);
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_CONTESTANT', 'CONTESTANT'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        const contestant = await assignmentService.updateContestant(req.params.id, req.body);
        return (0, responseHelpers_1.sendSuccess)(res, contestant, 'Contestant updated successfully');
    }
    catch (error) {
        return next(error);
    }
});
router.post('/bulk-delete', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('BULK_DELETE_CONTESTANTS', 'CONTESTANT'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        const { contestantIds } = req.body;
        if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
            return res.status(400).json({ success: false, message: 'contestantIds array is required' });
        }
        const result = await assignmentService.bulkDeleteContestants(contestantIds);
        return (0, responseHelpers_1.sendSuccess)(res, result, `${result.deletedCount} contestant(s) deleted successfully`);
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_CONTESTANT', 'CONTESTANT'), async (req, res, next) => {
    try {
        const assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
        await assignmentService.deleteContestant(req.params.id);
        return (0, responseHelpers_1.sendSuccess)(res, null, 'Contestant deleted successfully');
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
module.exports = router;
//# sourceMappingURL=contestantsRoutes.js.map