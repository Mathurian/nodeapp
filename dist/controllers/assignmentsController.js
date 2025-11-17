"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllContestantAssignments = exports.getCategoryContestants = exports.removeContestantFromCategory = exports.assignContestantToCategory = exports.getContestants = exports.removeAssignment = exports.assignJudge = exports.getCategories = exports.getJudges = exports.getJudgeAssignments = exports.removeAllAssignmentsForCategory = exports.bulkAssignJudges = exports.getAssignmentsForCategory = exports.getAssignmentsForJudge = exports.deleteAssignment = exports.updateAssignment = exports.getAssignmentById = exports.createAssignment = exports.getAllAssignments = exports.AssignmentsController = void 0;
const container_1 = require("../config/container");
const AssignmentService_1 = require("../services/AssignmentService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class AssignmentsController {
    assignmentService;
    constructor() {
        this.assignmentService = container_1.container.resolve(AssignmentService_1.AssignmentService);
    }
    getAllAssignments = async (req, res, next) => {
        try {
            const filters = {
                status: req.query.status,
                judgeId: req.query.judgeId,
                categoryId: req.query.categoryId,
                contestId: req.query.contestId,
                eventId: req.query.eventId,
            };
            const assignments = await this.assignmentService.getAllAssignments(filters);
            return (0, responseHelpers_1.sendSuccess)(res, assignments, 'Assignments retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    createAssignment = async (req, res, next) => {
        try {
            const userId = req.user?.id || '';
            const assignment = await this.assignmentService.createAssignment(req.body, userId);
            (0, responseHelpers_1.successResponse)(res, assignment, 'Assignment created successfully', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    getAssignmentById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const assignment = await this.assignmentService.getAssignmentById(id);
            res.json(assignment);
        }
        catch (error) {
            return next(error);
        }
    };
    updateAssignment = async (req, res, next) => {
        try {
            const { id } = req.params;
            const assignment = await this.assignmentService.updateAssignment(id, req.body);
            (0, responseHelpers_1.successResponse)(res, assignment, 'Assignment updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    deleteAssignment = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.assignmentService.deleteAssignment(id);
            (0, responseHelpers_1.successResponse)(res, null, 'Assignment deleted successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getAssignmentsForJudge = async (req, res, next) => {
        try {
            const { judgeId } = req.params;
            const assignments = await this.assignmentService.getAssignmentsForJudge(judgeId);
            res.json(assignments);
        }
        catch (error) {
            return next(error);
        }
    };
    getAssignmentsForCategory = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const assignments = await this.assignmentService.getAssignmentsForCategory(categoryId);
            res.json(assignments);
        }
        catch (error) {
            return next(error);
        }
    };
    bulkAssignJudges = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const { judgeIds } = req.body;
            const userId = req.user?.id || '';
            const assignedCount = await this.assignmentService.bulkAssignJudges(categoryId, judgeIds, userId);
            (0, responseHelpers_1.successResponse)(res, { assignedCount }, `${assignedCount} judge(s) assigned successfully`);
        }
        catch (error) {
            return next(error);
        }
    };
    removeAllAssignmentsForCategory = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const removedCount = await this.assignmentService.removeAllAssignmentsForCategory(categoryId);
            (0, responseHelpers_1.successResponse)(res, { removedCount }, `${removedCount} assignment(s) removed successfully`);
        }
        catch (error) {
            return next(error);
        }
    };
    getJudgeAssignments = async (req, res, next) => {
        try {
            return this.getAssignmentsForJudge(req, res, next);
        }
        catch (error) {
            return next(error);
        }
    };
    getJudges = async (_req, res, next) => {
        try {
            const judges = await this.assignmentService.getJudges();
            return (0, responseHelpers_1.sendSuccess)(res, judges, 'Judges retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getCategories = async (_req, res, next) => {
        try {
            const categories = await this.assignmentService.getCategories();
            return (0, responseHelpers_1.sendSuccess)(res, categories, 'Categories retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    assignJudge = async (req, res, next) => {
        try {
            return this.createAssignment(req, res, next);
        }
        catch (error) {
            return next(error);
        }
    };
    removeAssignment = async (req, res, next) => {
        try {
            return this.deleteAssignment(req, res, next);
        }
        catch (error) {
            return next(error);
        }
    };
    getContestants = async (_req, res, next) => {
        try {
            const contestants = await this.assignmentService.getContestants();
            return (0, responseHelpers_1.sendSuccess)(res, contestants, 'Contestants retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    assignContestantToCategory = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'assignments');
        try {
            const { categoryId, contestId, contestantId } = req.body;
            if (!contestantId) {
                log.warn('Assign contestant failed: missing contestantId', { categoryId, contestId, contestantId });
                return (0, responseHelpers_1.sendError)(res, 'contestantId is required', 400);
            }
            if (contestId && !categoryId) {
                log.debug('Assigning contestant to all categories in contest', { contestId, contestantId });
                const categories = await this.assignmentService.getCategories();
                const contestCategories = categories.filter((cat) => cat.contest?.id === contestId);
                if (contestCategories.length === 0) {
                    return (0, responseHelpers_1.sendError)(res, 'No categories found for the specified contest', 400);
                }
                const results = [];
                const errors = [];
                for (const category of contestCategories) {
                    try {
                        const assignment = await this.assignmentService.assignContestantToCategory(category.id, contestantId);
                        results.push(assignment);
                    }
                    catch (error) {
                        if (!error.message?.includes('already assigned')) {
                            errors.push({ categoryId: category.id, error: error.message });
                        }
                    }
                }
                if (results.length === 0 && errors.length > 0) {
                    return (0, responseHelpers_1.sendError)(res, `Failed to assign contestant: ${errors[0].error}`, 400);
                }
                log.info('Contestant assigned to contest successfully', { contestId, contestantId, categoryCount: results.length });
                return (0, responseHelpers_1.sendSuccess)(res, { assignments: results, errors }, `Contestant assigned to ${results.length} categories successfully`, 201);
            }
            if (!categoryId) {
                log.warn('Assign contestant failed: missing categoryId or contestId', { categoryId, contestId, contestantId });
                return (0, responseHelpers_1.sendError)(res, 'Either categoryId or contestId is required', 400);
            }
            log.debug('Assigning contestant to category', { categoryId, contestantId });
            const assignment = await this.assignmentService.assignContestantToCategory(categoryId, contestantId);
            log.info('Contestant assigned to category successfully', { categoryId, contestantId });
            return (0, responseHelpers_1.sendSuccess)(res, assignment, 'Contestant assigned to category successfully', 201);
        }
        catch (error) {
            log.error('Assign contestant to category error', {
                error: error.message,
                categoryId: req.body?.categoryId,
                contestId: req.body?.contestId,
                contestantId: req.body?.contestantId,
                stack: error.stack
            });
            return next(error);
        }
    };
    removeContestantFromCategory = async (req, res, next) => {
        try {
            const { categoryId, contestantId } = req.params;
            await this.assignmentService.removeContestantFromCategory(categoryId, contestantId);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Contestant removed from category successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getCategoryContestants = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const contestants = await this.assignmentService.getCategoryContestants(categoryId);
            return (0, responseHelpers_1.sendSuccess)(res, contestants, 'Category contestants retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getAllContestantAssignments = async (req, res, next) => {
        try {
            const filters = {
                categoryId: req.query.categoryId,
                contestId: req.query.contestId,
            };
            const assignments = await this.assignmentService.getAllContestantAssignments(filters);
            return (0, responseHelpers_1.sendSuccess)(res, assignments, 'Contestant assignments retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.AssignmentsController = AssignmentsController;
const controller = new AssignmentsController();
exports.getAllAssignments = controller.getAllAssignments;
exports.createAssignment = controller.createAssignment;
exports.getAssignmentById = controller.getAssignmentById;
exports.updateAssignment = controller.updateAssignment;
exports.deleteAssignment = controller.deleteAssignment;
exports.getAssignmentsForJudge = controller.getAssignmentsForJudge;
exports.getAssignmentsForCategory = controller.getAssignmentsForCategory;
exports.bulkAssignJudges = controller.bulkAssignJudges;
exports.removeAllAssignmentsForCategory = controller.removeAllAssignmentsForCategory;
exports.getJudgeAssignments = controller.getJudgeAssignments;
exports.getJudges = controller.getJudges;
exports.getCategories = controller.getCategories;
exports.assignJudge = controller.assignJudge;
exports.removeAssignment = controller.removeAssignment;
exports.getContestants = controller.getContestants;
exports.assignContestantToCategory = controller.assignContestantToCategory;
exports.removeContestantFromCategory = controller.removeContestantFromCategory;
exports.getCategoryContestants = controller.getCategoryContestants;
exports.getAllContestantAssignments = controller.getAllContestantAssignments;
//# sourceMappingURL=assignmentsController.js.map