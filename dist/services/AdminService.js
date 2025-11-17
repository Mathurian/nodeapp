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
exports.AdminService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const log = (0, logger_1.createLogger)('admin-service');
let AdminService = class AdminService extends BaseService_1.BaseService {
    prisma;
    startTime;
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.startTime = Date.now();
    }
    async getDashboardStats() {
        try {
            const [totalUsers, totalEvents, totalContests, totalCategories, totalScores, activeUsers, lastBackupRecord] = await Promise.all([
                this.prisma.user.count(),
                this.prisma.event.count(),
                this.prisma.contest.count(),
                this.prisma.category.count(),
                this.prisma.score.count(),
                this.prisma.user.count({
                    where: {
                        lastLoginAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                this.prisma.backupLog.findFirst({
                    where: { status: 'COMPLETED' },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true }
                })
            ]);
            let pendingJudge = 0;
            let pendingTallyMaster = 0;
            let pendingAuditor = 0;
            let pendingBoard = 0;
            let databaseSize = 'N/A';
            try {
                const result = await this.prisma.$queryRaw `
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `;
                if (result && result[0] && result[0].size) {
                    databaseSize = String(result[0].size).trim();
                }
                else {
                    const dbName = process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'event_manager';
                    const { stdout } = await execAsync(`psql -U ${process.env.DATABASE_USER || 'event_manager'} -d ${dbName} -t -c "SELECT pg_size_pretty(pg_database_size('${dbName}'));"`);
                    databaseSize = stdout.trim() || 'N/A';
                }
            }
            catch (error) {
                log.warn('Could not get database size', { error: error.message });
                try {
                    const result = await this.prisma.$queryRawUnsafe(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
                    if (result && result[0] && result[0].size) {
                        databaseSize = String(result[0].size).trim();
                    }
                }
                catch (fallbackError) {
                    log.warn('Fallback database size query also failed', { error: fallbackError.message });
                }
            }
            const processUptimeSeconds = Math.floor(process.uptime());
            const serviceUptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            const uptimeSeconds = processUptimeSeconds > 0 ? processUptimeSeconds : serviceUptimeSeconds;
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const uptime = days > 0
                ? `${days}d ${hours}h ${minutes}m`
                : hours > 0
                    ? `${hours}h ${minutes}m`
                    : minutes > 0
                        ? `${minutes}m`
                        : `${uptimeSeconds}s`;
            let systemHealth = 'HEALTHY';
            try {
                await this.prisma.$queryRaw `SELECT 1`;
            }
            catch (error) {
                systemHealth = 'CRITICAL';
            }
            return {
                totalUsers,
                totalEvents,
                totalContests,
                totalCategories,
                totalScores,
                activeUsers,
                pendingCertifications: pendingJudge + pendingTallyMaster + pendingAuditor + pendingBoard,
                certificationBreakdown: {
                    judge: pendingJudge,
                    tallyMaster: pendingTallyMaster,
                    auditor: pendingAuditor,
                    board: pendingBoard
                },
                systemHealth,
                lastBackup: lastBackupRecord?.createdAt ? lastBackupRecord.createdAt.toISOString() : null,
                databaseSize,
                uptime,
                uptimeSeconds
            };
        }
        catch (error) {
            log.error('Error getting dashboard stats', { error: error.message });
            throw error;
        }
    }
    async getSystemHealth() {
        const dbHealth = await this.prisma.$queryRaw `SELECT 1`;
        return {
            database: dbHealth ? 'healthy' : 'unhealthy',
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }
    async clearCache() {
        return { success: true, message: 'Cache cleared' };
    }
    async getActivityLogs(limit = 100) {
        try {
            const logs = await this.prisma.activityLog.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });
            return logs.map(log => ({
                id: log.id,
                userId: log.userId,
                action: log.action,
                resourceType: log.resourceType,
                resource: log.resourceType,
                resourceId: log.resourceId,
                details: log.details,
                ipAddress: log.ipAddress,
                userAgent: log.userAgent,
                createdAt: log.createdAt.toISOString(),
                user: log.user ? {
                    id: log.user.id,
                    name: log.user.name,
                    email: log.user.email,
                    role: log.user.role
                } : null
            }));
        }
        catch (error) {
            log.error('Error getting activity logs', { error: error.message });
            throw error;
        }
    }
    async getAuditLogs(limit = 100) {
        return this.getActivityLogs(limit);
    }
    async getDatabaseTables() {
        try {
            const tables = await this.prisma.$queryRawUnsafe(`
        SELECT 
          table_name as name
        FROM information_schema.tables
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
            const tablesWithCounts = await Promise.all(tables.map(async (table) => {
                try {
                    const result = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table.name}"`);
                    const rowCount = result[0]?.count ? Number(result[0].count) : 0;
                    return {
                        name: table.name,
                        rowCount: rowCount,
                        size: 'N/A'
                    };
                }
                catch (error) {
                    log.warn(`Error getting row count for table ${table.name}`, { error: error.message });
                    return {
                        name: table.name,
                        rowCount: 0,
                        size: 'N/A'
                    };
                }
            }));
            return tablesWithCounts;
        }
        catch (error) {
            log.error('Error getting database tables', { error: error.message });
            const fallbackTables = [
                'users', 'events', 'contests', 'categories', 'scores', 'judges', 'contestants',
                'activity_logs', 'backup_logs', 'rate_limit_configs', 'assignments', 'certifications',
                'judge_contestant_certifications', 'category_judges', 'category_contestants',
                'criteria', 'deductions', 'comments', 'system_settings', 'backup_settings'
            ];
            const tablesWithCounts = await Promise.all(fallbackTables.map(async (tableName) => {
                try {
                    const result = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
                    const rowCount = result[0]?.count ? Number(result[0].count) : 0;
                    return {
                        name: tableName,
                        rowCount: rowCount,
                        size: 'N/A'
                    };
                }
                catch {
                    return {
                        name: tableName,
                        rowCount: 0,
                        size: 'N/A'
                    };
                }
            }));
            return tablesWithCounts;
        }
    }
    async getTableStructure(tableName) {
        try {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
                throw this.badRequestError('Invalid table name');
            }
            const columns = await this.prisma.$queryRawUnsafe(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `);
            const primaryKeys = await this.prisma.$queryRawUnsafe(`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_schema = 'public' 
          AND tc.table_name = '${tableName}'
      `);
            const foreignKeys = await this.prisma.$queryRawUnsafe(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = '${tableName}'
      `);
            return {
                tableName,
                columns: columns.map(col => ({
                    column_name: col.column_name,
                    data_type: col.data_type,
                    character_maximum_length: col.character_maximum_length,
                    numeric_precision: col.numeric_precision,
                    numeric_scale: col.numeric_scale,
                    is_nullable: col.is_nullable,
                    column_default: col.column_default
                })),
                primaryKeys: primaryKeys.map(pk => pk.column_name),
                foreignKeys: foreignKeys.map(fk => ({
                    column_name: fk.column_name,
                    foreign_table_name: fk.foreign_table_name,
                    foreign_column_name: fk.foreign_column_name
                })),
                columnCount: columns.length
            };
        }
        catch (error) {
            log.error('Error getting table structure', { error: error.message, tableName });
            throw error;
        }
    }
    async getTableData(tableName, page = 1, limit = 50, orderBy, orderDirection = 'asc') {
        try {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
                throw this.badRequestError('Invalid table name');
            }
            const offset = (page - 1) * limit;
            const countResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
            const totalRows = Number(countResult[0]?.count || 0);
            let orderByClause = '';
            if (orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(orderBy)) {
                const direction = orderDirection.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
                orderByClause = `ORDER BY "${orderBy}" ${direction}`;
            }
            const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
            const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
            return {
                tableName,
                rows: rows,
                columns: columns,
                pagination: {
                    page,
                    limit,
                    totalRows,
                    totalPages: Math.ceil(totalRows / limit),
                    hasNext: offset + limit < totalRows,
                    hasPrev: page > 1
                },
                rowCount: totalRows
            };
        }
        catch (error) {
            log.error('Error getting table data', { error: error.message, tableName });
            throw error;
        }
    }
    async executeDatabaseQuery(query, limit = 100) {
        try {
            const trimmedQuery = query.trim().toUpperCase();
            if (!trimmedQuery.startsWith('SELECT')) {
                throw this.badRequestError('Only SELECT queries are allowed');
            }
            const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'];
            for (const keyword of dangerousKeywords) {
                if (trimmedQuery.includes(keyword)) {
                    throw this.badRequestError(`Query contains forbidden keyword: ${keyword}`);
                }
            }
            const limitedQuery = query.replace(/;?\s*$/, '') + ` LIMIT ${limit}`;
            const rows = await this.prisma.$queryRawUnsafe(limitedQuery);
            return {
                rows: rows,
                columns: rows.length > 0 ? Object.keys(rows[0]) : [],
                rowCount: rows.length
            };
        }
        catch (error) {
            log.error('Error executing database query', { error: error.message });
            throw error;
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AdminService);
//# sourceMappingURL=AdminService.js.map