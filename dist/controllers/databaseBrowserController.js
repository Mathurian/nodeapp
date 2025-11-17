"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueryHistory = exports.executeQuery = exports.getTableSchema = exports.getTableData = exports.getTables = exports.DatabaseBrowserController = void 0;
const container_1 = require("../config/container");
const DatabaseBrowserService_1 = require("../services/DatabaseBrowserService");
const responseHelpers_1 = require("../utils/responseHelpers");
class DatabaseBrowserController {
    databaseBrowserService;
    prisma;
    constructor() {
        this.databaseBrowserService = container_1.container.resolve(DatabaseBrowserService_1.DatabaseBrowserService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getTables = async (_req, res, next) => {
        try {
            const tables = await this.databaseBrowserService.getTables();
            return (0, responseHelpers_1.sendSuccess)(res, tables);
        }
        catch (error) {
            return next(error);
        }
    };
    getTableData = async (req, res, next) => {
        try {
            const { tableName } = req.params;
            const { page, limit } = req.query;
            const result = await this.databaseBrowserService.getTableData(tableName, page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
            return (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    getTableSchema = async (req, res, next) => {
        try {
            const { tableName } = req.params;
            const schema = await this.databaseBrowserService.getTableSchema(tableName);
            return (0, responseHelpers_1.sendSuccess)(res, schema);
        }
        catch (error) {
            return next(error);
        }
    };
    executeQuery = async (req, res, next) => {
        try {
            const { query } = req.body;
            if (!query) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Query is required', 400);
            }
            const trimmedQuery = query.trim().toUpperCase();
            if (!trimmedQuery.startsWith('SELECT')) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Only SELECT queries are allowed for security reasons', 403);
            }
            const result = await this.prisma.$queryRawUnsafe(query);
            await this.prisma.activityLog.create({
                data: {
                    action: 'DATABASE_QUERY',
                    resourceType: 'DATABASE',
                    userId: req.user?.id || null,
                    ipAddress: req.ip || null,
                    details: JSON.stringify({ query })
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                rows: result,
                count: Array.isArray(result) ? result.length : 0
            });
        }
        catch (error) {
            return next(error);
        }
    };
    getQueryHistory = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const [queries, total] = await Promise.all([
                this.prisma.activityLog.findMany({
                    where: {
                        action: 'DATABASE_QUERY'
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.activityLog.count({
                    where: { action: 'DATABASE_QUERY' }
                })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                queries,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.DatabaseBrowserController = DatabaseBrowserController;
const controller = new DatabaseBrowserController();
exports.getTables = controller.getTables;
exports.getTableData = controller.getTableData;
exports.getTableSchema = controller.getTableSchema;
exports.executeQuery = controller.executeQuery;
exports.getQueryHistory = controller.getQueryHistory;
//# sourceMappingURL=databaseBrowserController.js.map