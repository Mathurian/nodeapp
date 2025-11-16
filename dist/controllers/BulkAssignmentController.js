"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkAssignmentController = void 0;
const tsyringe_1 = require("tsyringe");
const BulkOperationService_1 = require("../services/BulkOperationService");
const AssignmentService_1 = require("../services/AssignmentService");
const logger_1 = require("../utils/logger");
let BulkAssignmentController = class BulkAssignmentController {
    bulkOperationService;
    assignmentService;
    constructor(bulkOperationService, assignmentService) {
        this.bulkOperationService = bulkOperationService;
        this.assignmentService = assignmentService;
    }
    logger = (0, logger_1.createLogger)('BulkAssignmentController');
    async createAssignments(req, res) {
        try {
            const { assignments } = req.body;
            if (!Array.isArray(assignments) || assignments.length === 0) {
                res.status(400).json({ error: 'assignments array is required' });
                return;
            }
            for (const assignment of assignments) {
                if (!assignment.judgeId || !assignment.contestId) {
                    res.status(400).json({
                        error: 'Each assignment must have judgeId and contestId'
                    });
                    return;
                }
            }
            const createdAssignments = [];
            const userId = req.user?.id || 'system';
            const result = await this.bulkOperationService.executeBulkOperation(async (assignmentData) => {
                const created = await this.assignmentService.createAssignment(assignmentData, userId);
                createdAssignments.push(created);
            }, assignments, { batchSize: 10, continueOnError: true });
            this.logger.info('Bulk create assignments completed', {
                userId: req.user?.id,
                count: assignments.length,
                result
            });
            res.json({
                message: 'Bulk create assignments completed',
                result,
                assignments: createdAssignments
            });
        }
        catch (error) {
            this.logger.error('Bulk create assignments failed', { error });
            res.status(500).json({
                error: 'Failed to create assignments',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async deleteAssignments(req, res) {
        try {
            const { assignmentIds } = req.body;
            if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
                res.status(400).json({ error: 'assignmentIds array is required' });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (assignmentId) => {
                await this.assignmentService.deleteAssignment(assignmentId);
            }, assignmentIds, { batchSize: 10, continueOnError: true });
            this.logger.info('Bulk delete assignments completed', {
                userId: req.user?.id,
                count: assignmentIds.length,
                result
            });
            res.json({
                message: 'Bulk delete assignments completed',
                result
            });
        }
        catch (error) {
            this.logger.error('Bulk delete assignments failed', { error });
            res.status(500).json({
                error: 'Failed to delete assignments',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async reassignJudges(req, res) {
        try {
            const { assignmentIds, newJudgeId } = req.body;
            if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
                res.status(400).json({ error: 'assignmentIds array is required' });
                return;
            }
            if (!newJudgeId) {
                res.status(400).json({ error: 'newJudgeId is required' });
                return;
            }
            const userId = req.user?.id || 'system';
            const result = await this.bulkOperationService.executeBulkOperation(async (assignmentId) => {
                const assignment = await this.assignmentService.getAssignmentById(assignmentId);
                await this.assignmentService.deleteAssignment(assignmentId);
                await this.assignmentService.createAssignment({
                    judgeId: newJudgeId,
                    contestId: assignment.contestId || undefined,
                    categoryId: assignment.categoryId || undefined,
                    eventId: assignment.eventId || undefined,
                    notes: assignment.notes || undefined,
                    priority: assignment.priority || undefined
                }, userId);
            }, assignmentIds, { batchSize: 10, continueOnError: true });
            this.logger.info('Bulk reassign judges completed', {
                userId: req.user?.id,
                count: assignmentIds.length,
                newJudgeId,
                result
            });
            res.json({
                message: 'Bulk reassign judges completed',
                result
            });
        }
        catch (error) {
            this.logger.error('Bulk reassign judges failed', { error });
            res.status(500).json({
                error: 'Failed to reassign judges',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
};
exports.BulkAssignmentController = BulkAssignmentController;
exports.BulkAssignmentController = BulkAssignmentController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(BulkOperationService_1.BulkOperationService)),
    __param(1, (0, tsyringe_1.inject)(AssignmentService_1.AssignmentService)),
    __metadata("design:paramtypes", [BulkOperationService_1.BulkOperationService,
        AssignmentService_1.AssignmentService])
], BulkAssignmentController);
//# sourceMappingURL=BulkAssignmentController.js.map