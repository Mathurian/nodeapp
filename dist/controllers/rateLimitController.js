"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyRateLimitStatus = exports.updateConfig = exports.getConfig = exports.getAllConfigs = exports.RateLimitController = void 0;
const tsyringe_1 = require("tsyringe");
const RateLimitService_1 = require("../services/RateLimitService");
const responseHelpers_1 = require("../utils/responseHelpers");
class RateLimitController {
    rateLimitService;
    constructor() {
        this.rateLimitService = tsyringe_1.container.resolve(RateLimitService_1.RateLimitService);
    }
    getAllConfigs = async (_req, res, next) => {
        try {
            const configs = await this.rateLimitService.getAllConfigs();
            return (0, responseHelpers_1.sendSuccess)(res, configs, 'Rate limit configurations retrieved');
        }
        catch (error) {
            return next(error);
        }
    };
    getConfig = async (req, res, next) => {
        try {
            const { tier } = req.params;
            if (!tier) {
                return (0, responseHelpers_1.sendBadRequest)(res, 'Tier parameter is required');
            }
            const config = await this.rateLimitService.getConfig(tier);
            return (0, responseHelpers_1.sendSuccess)(res, config, `Rate limit configuration for tier: ${tier}`);
        }
        catch (error) {
            return next(error);
        }
    };
    updateConfig = async (req, res, next) => {
        try {
            const { tier } = req.params;
            const { points, duration, blockDuration } = req.body;
            if (!tier) {
                return (0, responseHelpers_1.sendBadRequest)(res, 'Tier parameter is required');
            }
            const updates = {};
            if (points !== undefined)
                updates.points = parseInt(points);
            if (duration !== undefined)
                updates.duration = parseInt(duration);
            if (blockDuration !== undefined)
                updates.blockDuration = parseInt(blockDuration);
            if (Object.keys(updates).length === 0) {
                return (0, responseHelpers_1.sendBadRequest)(res, 'At least one field (points, duration, blockDuration) must be provided');
            }
            const updated = await this.rateLimitService.updateConfig(tier, updates);
            return (0, responseHelpers_1.sendSuccess)(res, updated, `Rate limit configuration updated for tier: ${tier}`);
        }
        catch (error) {
            return next(error);
        }
    };
    getMyRateLimitStatus = async (req, res, next) => {
        try {
            const tier = this.rateLimitService.getTierFromRequest(req);
            const config = await this.rateLimitService.getConfig(tier);
            return (0, responseHelpers_1.sendSuccess)(res, {
                tier,
                limit: config.points,
                window: config.duration,
                blockDuration: config.blockDuration,
            }, 'Rate limit status retrieved');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.RateLimitController = RateLimitController;
const controller = new RateLimitController();
exports.getAllConfigs = controller.getAllConfigs;
exports.getConfig = controller.getConfig;
exports.updateConfig = controller.updateConfig;
exports.getMyRateLimitStatus = controller.getMyRateLimitStatus;
exports.default = controller;
//# sourceMappingURL=rateLimitController.js.map