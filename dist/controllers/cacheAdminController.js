"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheAdminController = void 0;
const RedisCacheService_1 = require("../services/RedisCacheService");
const redis_config_1 = require("../config/redis.config");
class CacheAdminController {
    static async getStatistics(req, res) {
        try {
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            const stats = await cacheService.getStatistics();
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            console.error('Error getting cache statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get cache statistics',
            });
        }
    }
    static async healthCheck(req, res) {
        try {
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            const isHealthy = await cacheService.healthCheck();
            res.json({
                success: true,
                data: {
                    healthy: isHealthy,
                    status: isHealthy ? 'connected' : 'disconnected',
                },
            });
        }
        catch (error) {
            console.error('Error checking cache health:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check cache health',
            });
        }
    }
    static async clearNamespace(req, res) {
        try {
            const { namespace } = req.params;
            const validNamespaces = Object.values(redis_config_1.CacheNamespace);
            if (!validNamespaces.includes(namespace)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid namespace',
                    validNamespaces,
                });
                return;
            }
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            const deletedCount = await cacheService.deletePattern('*', namespace);
            res.json({
                success: true,
                data: {
                    namespace,
                    deletedCount,
                },
            });
        }
        catch (error) {
            console.error('Error clearing cache namespace:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache namespace',
            });
        }
    }
    static async clearAll(req, res) {
        try {
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            const success = await cacheService.clear();
            if (success) {
                res.json({
                    success: true,
                    message: 'Cache cleared successfully',
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to clear cache',
                });
            }
        }
        catch (error) {
            console.error('Error clearing cache:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache',
            });
        }
    }
    static async deleteKey(req, res) {
        try {
            const { key } = req.params;
            const { namespace } = req.query;
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            const success = await cacheService.delete(key, namespace);
            res.json({
                success,
                data: {
                    key,
                    namespace: namespace || 'default',
                    deleted: success,
                },
            });
        }
        catch (error) {
            console.error('Error deleting cache key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete cache key',
            });
        }
    }
    static async invalidateTag(req, res) {
        try {
            const { tag } = req.params;
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            const deletedCount = await cacheService.invalidateTag(tag);
            res.json({
                success: true,
                data: {
                    tag,
                    deletedCount,
                },
            });
        }
        catch (error) {
            console.error('Error invalidating cache tag:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to invalidate cache tag',
            });
        }
    }
    static async warmCache(req, res) {
        try {
            res.json({
                success: true,
                message: 'Cache warming started',
            });
        }
        catch (error) {
            console.error('Error warming cache:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to warm cache',
            });
        }
    }
    static async resetStatistics(req, res) {
        try {
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            cacheService.resetStatistics();
            res.json({
                success: true,
                message: 'Cache statistics reset',
            });
        }
        catch (error) {
            console.error('Error resetting cache statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reset statistics',
            });
        }
    }
}
exports.CacheAdminController = CacheAdminController;
exports.default = CacheAdminController;
//# sourceMappingURL=cacheAdminController.js.map