"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContestantScores = exports.forceLogoutUser = exports.forceLogoutAllUsers = exports.testConnection = exports.exportAuditLogs = exports.getAuditLogs = exports.getActivityLogs = exports.getScores = exports.getCategories = exports.getContests = exports.getEvents = exports.getUsers = exports.getActiveUsers = exports.getLogs = exports.getStats = exports.executeDatabaseQuery = exports.getTableData = exports.getTableStructure = exports.getDatabaseTables = exports.clearCache = exports.getSystemHealth = exports.getDashboard = exports.AdminController = void 0;
const container_1 = require("../config/container");
const AdminService_1 = require("../services/AdminService");
const responseHelpers_1 = require("../utils/responseHelpers");
class AdminController {
    adminService;
    prisma;
    constructor() {
        this.adminService = container_1.container.resolve(AdminService_1.AdminService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getDashboard = async (_req, res, next) => {
        try {
            const stats = await this.adminService.getDashboardStats();
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            return next(error);
        }
    };
    getSystemHealth = async (_req, res, next) => {
        try {
            const health = await this.adminService.getSystemHealth();
            return (0, responseHelpers_1.sendSuccess)(res, health);
        }
        catch (error) {
            return next(error);
        }
    };
    clearCache = async (_req, res, next) => {
        try {
            const result = await this.adminService.clearCache();
            return (0, responseHelpers_1.sendSuccess)(res, result, 'Cache cleared');
        }
        catch (error) {
            return next(error);
        }
    };
    getDatabaseTables = async (_req, res, next) => {
        try {
            const tables = await this.adminService.getDatabaseTables();
            return (0, responseHelpers_1.sendSuccess)(res, tables);
        }
        catch (error) {
            return next(error);
        }
    };
    getTableStructure = async (req, res, next) => {
        try {
            const { tableName } = req.params;
            const structure = await this.adminService.getTableStructure(tableName);
            return (0, responseHelpers_1.sendSuccess)(res, structure);
        }
        catch (error) {
            return next(error);
        }
    };
    getTableData = async (req, res, next) => {
        try {
            const { tableName } = req.params;
            const { page = '1', limit = '50', orderBy, orderDirection = 'asc' } = req.query;
            const data = await this.adminService.getTableData(tableName, parseInt(page), parseInt(limit), orderBy, orderDirection);
            return (0, responseHelpers_1.sendSuccess)(res, data);
        }
        catch (error) {
            return next(error);
        }
    };
    executeDatabaseQuery = async (req, res, next) => {
        try {
            const { query, limit = 100 } = req.body;
            const result = await this.adminService.executeDatabaseQuery(query, parseInt(limit));
            return (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    getStats = async (_req, res, next) => {
        try {
            const stats = await this.adminService.getDashboardStats();
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            return next(error);
        }
    };
    getLogs = async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const logs = await this.adminService.getActivityLogs(limit);
            return (0, responseHelpers_1.sendSuccess)(res, logs);
        }
        catch (error) {
            return next(error);
        }
    };
    getActiveUsers = async (req, res, next) => {
        try {
            const hours = parseInt(req.query.hours) || 24;
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            const activeUsers = await this.prisma.user.findMany({
                where: {
                    lastLoginAt: {
                        gte: since
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    lastLoginAt: true
                },
                orderBy: {
                    lastLoginAt: 'desc'
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, activeUsers);
        }
        catch (error) {
            return next(error);
        }
    };
    getUsers = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const role = req.query.role;
            const search = req.query.search;
            const skip = (page - 1) * limit;
            const where = {};
            if (role) {
                where.role = role;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ];
            }
            const [users, total] = await Promise.all([
                this.prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        lastLoginAt: true,
                        createdAt: true
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.user.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                users,
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
    getEvents = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const archived = req.query.archived === 'true';
            const skip = (page - 1) * limit;
            const where = {};
            if (req.query.archived !== undefined) {
                where.archived = archived;
            }
            const [events, total] = await Promise.all([
                this.prisma.event.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                        archived: true,
                        createdAt: true
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.event.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                events,
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
    getContests = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const eventId = req.query.eventId;
            const skip = (page - 1) * limit;
            const where = {};
            if (eventId) {
                where.eventId = eventId;
            }
            const [contests, total] = await Promise.all([
                this.prisma.contest.findMany({
                    where,
                    include: {
                        event: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.contest.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                contests,
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
    getCategories = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const contestId = req.query.contestId;
            const skip = (page - 1) * limit;
            const where = {};
            if (contestId) {
                where.contestId = contestId;
            }
            const [categories, total] = await Promise.all([
                this.prisma.category.findMany({
                    where,
                    include: {
                        contest: {
                            select: {
                                id: true,
                                name: true,
                                event: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.category.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                categories,
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
    getScores = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const categoryId = req.query.categoryId;
            const contestId = req.query.contestId;
            const skip = (page - 1) * limit;
            const where = {};
            if (categoryId) {
                where.categoryId = categoryId;
            }
            const [scores, total] = await Promise.all([
                this.prisma.score.findMany({
                    where,
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        contestant: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        judge: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.score.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                scores,
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
    getActivityLogs = async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const logs = await this.adminService.getActivityLogs(limit);
            return (0, responseHelpers_1.sendSuccess)(res, logs);
        }
        catch (error) {
            return next(error);
        }
    };
    getAuditLogs = async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const logs = await this.adminService.getAuditLogs(limit);
            return (0, responseHelpers_1.sendSuccess)(res, logs);
        }
        catch (error) {
            return next(error);
        }
    };
    exportAuditLogs = async (req, res, next) => {
        try {
            const format = req.query.format || 'json';
            const limit = parseInt(req.query.limit) || 1000;
            const logs = await this.adminService.getAuditLogs(limit);
            if (format === 'csv') {
                const headers = ['ID', 'User', 'Action', 'Resource', 'ResourceID', 'IP Address', 'Date'];
                const rows = logs.map(log => [
                    log.id,
                    log.user?.name || 'Unknown',
                    log.action,
                    log.resourceType,
                    log.resourceId || 'N/A',
                    log.ipAddress || 'N/A',
                    log.createdAt
                ]);
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
                return res.send(csvContent);
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
            return res.send(JSON.stringify(logs, null, 2));
        }
        catch (error) {
            return next(error);
        }
    };
    testConnection = async (_req, res, next) => {
        try {
            const health = await this.adminService.getSystemHealth();
            return (0, responseHelpers_1.sendSuccess)(res, health);
        }
        catch (error) {
            return next(error);
        }
    };
    forceLogoutAllUsers = async (_req, res, next) => {
        try {
            await this.prisma.user.updateMany({
                data: {
                    sessionVersion: {
                        increment: 1
                    }
                }
            });
            const count = await this.prisma.user.count();
            return (0, responseHelpers_1.sendSuccess)(res, {
                success: true,
                message: `All ${count} users have been logged out`,
                usersAffected: count
            });
        }
        catch (error) {
            return next(error);
        }
    };
    forceLogoutUser = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                return (0, responseHelpers_1.sendSuccess)(res, {
                    success: false,
                    message: 'User not found'
                }, 'User not found', 404);
            }
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    sessionVersion: {
                        increment: 1
                    }
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                success: true,
                message: `User ${user.name} has been logged out`,
                userId: user.id
            });
        }
        catch (error) {
            return next(error);
        }
    };
    getContestantScores = async (req, res, next) => {
        try {
            const { contestantId } = req.params;
            const categoryId = req.query.categoryId;
            const where = {
                contestantId
            };
            if (categoryId) {
                where.categoryId = categoryId;
            }
            const scores = await this.prisma.score.findMany({
                where,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            contest: {
                                select: {
                                    id: true,
                                    name: true,
                                    event: {
                                        select: {
                                            id: true,
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    judge: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    contestant: {
                        select: {
                            id: true,
                            name: true,
                            contestantNumber: true
                        }
                    }
                },
                orderBy: [
                    { createdAt: 'desc' }
                ]
            });
            const stats = {
                totalScores: scores.length,
                certifiedScores: scores.filter(s => s.isCertified).length,
                averageScore: scores.length > 0
                    ? scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length
                    : 0,
                highestScore: scores.length > 0 ? Math.max(...scores.map(s => s.score || 0)) : 0,
                lowestScore: scores.length > 0 ? Math.min(...scores.map(s => s.score || 0)) : 0
            };
            return (0, responseHelpers_1.sendSuccess)(res, {
                scores,
                stats
            });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.AdminController = AdminController;
const controller = new AdminController();
exports.getDashboard = controller.getDashboard;
exports.getSystemHealth = controller.getSystemHealth;
exports.clearCache = controller.clearCache;
exports.getDatabaseTables = controller.getDatabaseTables;
exports.getTableStructure = controller.getTableStructure;
exports.getTableData = controller.getTableData;
exports.executeDatabaseQuery = controller.executeDatabaseQuery;
exports.getStats = controller.getStats;
exports.getLogs = controller.getLogs;
exports.getActiveUsers = controller.getActiveUsers;
exports.getUsers = controller.getUsers;
exports.getEvents = controller.getEvents;
exports.getContests = controller.getContests;
exports.getCategories = controller.getCategories;
exports.getScores = controller.getScores;
exports.getActivityLogs = controller.getActivityLogs;
exports.getAuditLogs = controller.getAuditLogs;
exports.exportAuditLogs = controller.exportAuditLogs;
exports.testConnection = controller.testConnection;
exports.forceLogoutAllUsers = controller.forceLogoutAllUsers;
exports.forceLogoutUser = controller.forceLogoutUser;
exports.getContestantScores = controller.getContestantScores;
//# sourceMappingURL=adminController.js.map