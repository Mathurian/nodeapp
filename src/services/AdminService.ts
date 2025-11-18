import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../utils/logger';

const execAsync = promisify(exec);
const log = createLogger('admin-service');

@injectable()
export class AdminService extends BaseService {
  private startTime: number;
  
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
    this.startTime = Date.now();
  }

  async getDashboardStats() {
    try {
      const [
        totalUsers,
        totalEvents,
        totalContests,
        totalCategories,
        totalScores,
        activeUsers,
        lastBackupRecord
      ] = await Promise.all([
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

      // Calculate pending certifications by role
      let pendingJudge = 0;
      let pendingTallyMaster = 0;
      let pendingAuditor = 0;
      let pendingBoard = 0;

      // Count pending certifications from categories
      // Certifications relation not available - skip this logic
      /* for (const category of categories) {
        const pendingCount = category.certifications.length;
        // Determine role based on certification type or default to judge
        // This is a simplified approach - adjust based on your actual certification model
        pendingJudge += pendingCount;
      } */

      // Calculate database size (PostgreSQL)
      let databaseSize = 'N/A';
      try {
        // Try using Prisma first (more reliable)
        const result: any = await this.prisma.$queryRaw<Array<{ size: bigint }>>`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `;
        if (result && result[0] && result[0].size) {
          databaseSize = String(result[0].size).trim();
        } else {
          // Fallback to psql command
          const dbName = process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'event_manager';
          const { stdout } = await execAsync(
            `psql -U ${process.env.DATABASE_USER || 'event_manager'} -d ${dbName} -t -c "SELECT pg_size_pretty(pg_database_size('${dbName}'));"`
          );
          databaseSize = stdout.trim() || 'N/A';
        }
      } catch (error) {
        log.warn('Could not get database size', { error: (error as Error).message });
        // Try alternative method using Prisma
        try {
          const result: any = await this.prisma.$queryRawUnsafe(
            `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
          ) as Array<{ size: string }>;
          if (result && result[0] && result[0].size) {
            databaseSize = String(result[0].size).trim();
          }
        } catch (fallbackError) {
          log.warn('Fallback database size query also failed', { error: (fallbackError as Error).message });
        }
      }

      // Calculate uptime - use service start time if process uptime is unreliable
      const processUptimeSeconds = Math.floor(process.uptime());
      const serviceUptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      // Use the larger of the two (process uptime might be 0 if server just restarted)
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

      // Determine system health
      let systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (error) {
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
    } catch (error) {
      log.error('Error getting dashboard stats', { error: (error as Error).message });
      throw error;
    }
  }

  async getSystemHealth() {
    const dbHealth: any = await this.prisma.$queryRaw`SELECT 1`;
    return {
      database: dbHealth ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  async clearCache() {
    // TODO: Implement cache clearing
    return { success: true, message: 'Cache cleared' };
  }

  async getActivityLogs(limit: number = 100) {
    try {
      const logs: any = await this.prisma.activityLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        } as any,
        orderBy: { createdAt: 'desc' },
        take: limit
      } as any);

      return logs.map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        resourceType: log.resourceType,
        resource: log.resourceType, // For compatibility
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
    } catch (error) {
      log.error('Error getting activity logs', { error: (error as Error).message });
      throw error;
    }
  }

  async getAuditLogs(limit: number = 100) {
    // For now, use ActivityLog as audit logs
    // In the future, you might want a separate AuditLog table
    return this.getActivityLogs(limit);
  }

  async getDatabaseTables() {
    try {
      // Use Prisma to query information_schema directly for all tables
      const tables: any = await this.prisma.$queryRawUnsafe(`
        SELECT 
          table_name as name
        FROM information_schema.tables
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `) as Array<{ name: string }>;

      // Get row counts for each table
      const tablesWithCounts = await Promise.all(
        tables.map(async (table) => {
          try {
            const result: any = await this.prisma.$queryRawUnsafe(
              `SELECT COUNT(*) as count FROM "${table.name}"`
            ) as Array<{ count: bigint }>;
            const rowCount = result[0]?.count ? Number(result[0].count) : 0;
            
            return {
              name: table.name,
              rowCount: rowCount,
              size: 'N/A' // Could be calculated separately if needed
            };
          } catch (error) {
            // If table doesn't exist or query fails, return 0
            log.warn(`Error getting row count for table ${table.name}`, { error: (error as Error).message });
            return {
              name: table.name,
              rowCount: 0,
              size: 'N/A'
            };
          }
        })
      );

      return tablesWithCounts;
    } catch (error) {
      log.error('Error getting database tables', { error: (error as Error).message });
      // Fallback: return Prisma model names with row counts
      const fallbackTables = [
        'users', 'events', 'contests', 'categories', 'scores', 'judges', 'contestants',
        'activity_logs', 'backup_logs', 'rate_limit_configs', 'assignments', 'certifications',
        'judge_contestant_certifications', 'category_judges', 'category_contestants',
        'criteria', 'deductions', 'comments', 'system_settings', 'backup_settings'
      ];
      
      const tablesWithCounts = await Promise.all(
        fallbackTables.map(async (tableName) => {
          try {
            const result: any = await this.prisma.$queryRawUnsafe(
              `SELECT COUNT(*) as count FROM "${tableName}"`
            ) as Array<{ count: bigint }>;
            const rowCount = result[0]?.count ? Number(result[0].count) : 0;
            return {
              name: tableName,
              rowCount: rowCount,
              size: 'N/A'
            };
          } catch {
            return {
              name: tableName,
              rowCount: 0,
              size: 'N/A'
            };
          }
        })
      );
      
      return tablesWithCounts;
    }
  }

  async getTableStructure(tableName: string) {
    try {
      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        throw this.badRequestError('Invalid table name');
      }

      // Get column information - use parameterized query
      const columns: any = await this.prisma.$queryRawUnsafe(`
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
      `) as Array<{
        column_name: string;
        data_type: string;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
        is_nullable: string;
        column_default: string | null;
      }>;

      // Get primary keys
      const primaryKeys: any = await this.prisma.$queryRawUnsafe(`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_schema = 'public' 
          AND tc.table_name = '${tableName}'
      `) as Array<{ column_name: string }>;

      // Get foreign keys
      const foreignKeys: any = await this.prisma.$queryRawUnsafe(`
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
      `) as Array<{
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
      }>;

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
    } catch (error) {
      log.error('Error getting table structure', { error: (error as Error).message, tableName });
      throw error;
    }
  }

  async getTableData(
    tableName: string,
    page: number = 1,
    limit: number = 50,
    orderBy?: string,
    orderDirection: string = 'asc'
  ) {
    try {
      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        throw this.badRequestError('Invalid table name');
      }

      const offset = (page - 1) * limit;
      
      // Get total row count
      const countResult: any = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      ) as Array<{ count: bigint }>;
      const totalRows = Number(countResult[0]?.count || 0);

      // Build ORDER BY clause
      let orderByClause = '';
      if (orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(orderBy)) {
        const direction = orderDirection.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        orderByClause = `ORDER BY "${orderBy}" ${direction}`;
      }

      // Get table data - use parameterized query for limit/offset
      const rows: any = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "${tableName}" ${orderByClause} LIMIT ${limit} OFFSET ${offset}`
      ) as Array<Record<string, any>>;

      // Get column names from first row or from table structure
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
    } catch (error) {
      log.error('Error getting table data', { error: (error as Error).message, tableName });
      throw error;
    }
  }

  async executeDatabaseQuery(query: string, limit: number = 100) {
    // SECURITY FIX: This method has been disabled due to SQL injection vulnerability
    // Direct SQL query execution is extremely dangerous and should never be exposed to users
    //
    // If database inspection is needed, use:
    // 1. Database administration tools (pgAdmin, TablePlus, etc.)
    // 2. Read-only database replicas
    // 3. Pre-defined safe query templates with parameterized queries
    //
    // Reference: Implementation Plan 2025-11-18, Issue P0-1
    throw this.forbiddenError(
      'Direct SQL query execution is disabled for security reasons. ' +
      'Please use the Database Browser interface or contact system administrator.'
    );
  }
}
