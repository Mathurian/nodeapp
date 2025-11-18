"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheStatus = exports.deleteCachePattern = exports.deleteCacheKey = exports.flushCache = exports.getCacheStats = exports.CacheController = void 0;
const tsyringe_1 = require("tsyringe");
const CacheService_1 = require("../services/CacheService");
const logger_1 = require("../utils/logger");
class CacheController {
    cacheService;
    constructor() {
        this.cacheService = tsyringe_1.container.resolve(CacheService_1.CacheService);
    }
    getCacheStats = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'cache');
        try {
            const stats = await this.cacheService.getStats();
            res.json(stats);
        }
        catch (error) {
            log.error('Get cache stats error:', error);
            return next(error);
        }
    };
    flushCache = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'cache');
        try {
            await this.cacheService.flushAll();
            res.json({
                success: true,
                message: 'Cache flushed successfully',
            });
        }
        catch (error) {
            log.error('Flush cache error:', error);
            return next(error);
        }
    };
    deleteCacheKey = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'cache');
        try {
            const { key } = req.params;
            if (!key) {
                res.status(400).json({ error: 'Cache key is required' });
                return;
            }
            await this.cacheService.del(key);
            res.json({
                success: true,
                message: `Cache key "${key}" deleted successfully`,
            });
        }
        catch (error) {
            log.error('Delete cache key error:', error);
            return next(error);
        }
    };
    deleteCachePattern = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'cache');
        try {
            const { pattern } = req.body;
            if (!pattern) {
                res.status(400).json({ error: 'Pattern is required' });
                return;
            }
            await this.cacheService.invalidatePattern(pattern);
            res.json({
                success: true,
                message: `Cache keys matching "${pattern}" deleted successfully`,
            });
        }
        catch (error) {
            log.error('Delete cache pattern error:', error);
            return next(error);
        }
    };
    getCacheStatus = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'cache');
        try {
            const stats = await this.cacheService.getStats();
            res.json({
                enabled: stats.enabled,
                status: stats.enabled ? 'connected' : 'disconnected',
            });
        }
        catch (error) {
            log.error('Get cache status error:', error);
            return next(error);
        }
    };
}
exports.CacheController = CacheController;
const controller = new CacheController();
exports.getCacheStats = controller.getCacheStats;
exports.flushCache = controller.flushCache;
exports.deleteCacheKey = controller.deleteCacheKey;
exports.deleteCachePattern = controller.deleteCachePattern;
exports.getCacheStatus = controller.getCacheStatus;
//# sourceMappingURL=cacheController.js.map