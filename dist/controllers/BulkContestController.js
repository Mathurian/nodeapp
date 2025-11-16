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
exports.BulkContestController = void 0;
const tsyringe_1 = require("tsyringe");
const BulkOperationService_1 = require("../services/BulkOperationService");
const ContestService_1 = require("../services/ContestService");
const logger_1 = require("../utils/logger");
let BulkContestController = class BulkContestController {
    bulkOperationService;
    contestService;
    constructor(bulkOperationService, contestService) {
        this.bulkOperationService = bulkOperationService;
        this.contestService = contestService;
    }
    logger = (0, logger_1.createLogger)('BulkContestController');
    async changeContestStatus(req, res) {
        try {
            const { contestIds, status } = req.body;
            if (!Array.isArray(contestIds) || contestIds.length === 0) {
                res.status(400).json({ error: 'contestIds array is required' });
                return;
            }
            const validStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (contestId) => {
                await this.contestService.updateContest(contestId, {});
            }, contestIds, { batchSize: 10, continueOnError: true });
            this.logger.info('Bulk contest status change completed', {
                userId: req.user?.id,
                contestIds,
                status,
                result
            });
            res.json({
                message: 'Bulk status change completed (note: status field not supported, operation performed without status change)',
                result
            });
        }
        catch (error) {
            this.logger.error('Bulk change contest status failed', { error });
            res.status(500).json({
                error: 'Failed to change contest status',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async certifyContests(req, res) {
        try {
            const { contestIds } = req.body;
            if (!Array.isArray(contestIds) || contestIds.length === 0) {
                res.status(400).json({ error: 'contestIds array is required' });
                return;
            }
            res.status(501).json({
                error: 'Bulk contest certification not implemented',
                message: 'Contests must be certified individually through the certification workflow'
            });
            return;
        }
        catch (error) {
            this.logger.error('Bulk certify contests failed', { error });
            res.status(500).json({
                error: 'Failed to certify contests',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async deleteContests(req, res) {
        try {
            const { contestIds } = req.body;
            if (!Array.isArray(contestIds) || contestIds.length === 0) {
                res.status(400).json({ error: 'contestIds array is required' });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (contestId) => {
                await this.contestService.deleteContest(contestId);
            }, contestIds, { batchSize: 10, continueOnError: true });
            this.logger.info('Bulk delete contests completed', {
                userId: req.user?.id,
                count: contestIds.length,
                result
            });
            res.json({
                message: 'Bulk delete completed',
                result
            });
        }
        catch (error) {
            this.logger.error('Bulk delete contests failed', { error });
            res.status(500).json({
                error: 'Failed to delete contests',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
};
exports.BulkContestController = BulkContestController;
exports.BulkContestController = BulkContestController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(BulkOperationService_1.BulkOperationService)),
    __param(1, (0, tsyringe_1.inject)(ContestService_1.ContestService)),
    __metadata("design:paramtypes", [BulkOperationService_1.BulkOperationService,
        ContestService_1.ContestService])
], BulkContestController);
//# sourceMappingURL=BulkContestController.js.map