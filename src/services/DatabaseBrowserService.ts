import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('DatabaseBrowserService');

@injectable()
export class DatabaseBrowserService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private getPrismaClient(prismaClient?: PrismaClient): PrismaClient {
    return prismaClient || this.prisma;
  }

  async getTables(prismaClient?: PrismaClient) {
    const client = this.getPrismaClient(prismaClient);
    // Get list of tables from Prisma models
    const allModels = Object.keys(client).filter(key =>
      !key.startsWith('_') && !key.startsWith('$') && typeof (client as any)[key] === 'object'
    );

    // Test each model to see if the table exists
    const tables = [];
    for (const modelName of allModels) {
      try {
        // Try to count - if it fails, table doesn't exist
        await (client as any)[modelName].count();
        tables.push(modelName);
      } catch (error: unknown) {
        // Skip tables that don't exist in database
        const errorObj = error as { code?: string; message?: string };
        if (errorObj.code === 'P2021' || errorObj.message?.includes('does not exist')) {
          continue;
        }
        // For other errors, include the table anyway
        tables.push(modelName);
      }
    }

    return tables;
  }

  async getTableData(
    tableName: string,
    page: number = 1,
    limit: number = 50,
    prismaClient?: PrismaClient
  ) {
    const client = this.getPrismaClient(prismaClient);
    const model = (client as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        model.findMany({ take: limit, skip }),
        model.count()
      ]);

      return {
        table: tableName,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: unknown) {
      // Handle case where Prisma model exists but table doesn't exist in database
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'P2021' || errorObj.message?.includes('does not exist')) {
        return {
          table: tableName,
          data: [],
          error: `Table "${tableName}" exists in Prisma schema but not in database. Run migrations to create it.`,
          pagination: {
            page: 1,
            limit: 0,
            total: 0,
            pages: 0
          }
        };
      }
      throw error;
    }
  }

  async getTableSchema(tableName: string, prismaClient?: PrismaClient) {
    const client = this.getPrismaClient(prismaClient);
    const model = (client as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

    // Return basic table info (Prisma doesn't expose full schema easily)
    return {
      table: tableName,
      message: 'Schema introspection limited in Prisma runtime'
    };
  }

  /**
   * Get a single record by ID
   * SUPER_ADMIN only
   */
  async getRecord(tableName: string, recordId: string, prismaClient?: PrismaClient) {
    const client = this.getPrismaClient(prismaClient);
    const model = (client as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

    try {
      const record = await model.findUnique({
        where: { id: recordId }
      });

      if (!record) {
        throw this.notFoundError('Record', recordId);
      }

      return record;
    } catch (error: unknown) {
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'P2021' || errorObj.message?.includes('does not exist')) {
        throw this.notFoundError('Table', tableName);
      }
      throw error;
    }
  }

  /**
   * Update a record by ID
   * SUPER_ADMIN only - all updates are logged
   */
  async updateRecord(
    tableName: string,
    recordId: string,
    data: Record<string, unknown>,
    userId: string,
    prismaClient?: PrismaClient,
    tenantId?: string
  ) {
    const client = this.getPrismaClient(prismaClient);
    const model = (client as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

    // Prevent modification of system-critical fields
    const protectedFields = ['id', 'createdAt'];
    const sanitizedData = { ...data };
    for (const field of protectedFields) {
      delete sanitizedData[field];
    }

    // Auto-set updatedAt if the field exists
    if ('updatedAt' in sanitizedData || this.hasUpdatedAtField(tableName)) {
      sanitizedData['updatedAt'] = new Date();
    }

    try {
      // Get the original record for audit logging
      const originalRecord = await model.findUnique({
        where: { id: recordId }
      });

      if (!originalRecord) {
        throw this.notFoundError('Record', recordId);
      }

      // Perform the update
      const updatedRecord = await model.update({
        where: { id: recordId },
        data: sanitizedData
      });

      // Log the update action
      await client.activityLog.create({
        data: {
          action: 'DATABASE_RECORD_UPDATE',
          resourceType: 'DATABASE',
          resourceId: recordId,
          userId: userId,
          logLevel: 'INFO',
          tenantId: tenantId || null,
          details: JSON.parse(JSON.stringify({
            table: tableName,
            recordId,
            originalData: originalRecord,
            updatedFields: Object.keys(sanitizedData),
            newData: sanitizedData
          })) as Prisma.InputJsonValue
        }
      });

      return updatedRecord;
    } catch (error: unknown) {
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'P2021' || errorObj.message?.includes('does not exist')) {
        throw this.notFoundError('Table', tableName);
      }
      if (errorObj.code === 'P2025') {
        throw this.notFoundError('Record', recordId);
      }
      throw error;
    }
  }

  /**
   * Delete a record by ID
   * SUPER_ADMIN only - all deletions are logged
   */
  async deleteRecord(
    tableName: string,
    recordId: string,
    userId: string,
    prismaClient?: PrismaClient,
    tenantId?: string
  ) {
    const client = this.getPrismaClient(prismaClient);
    const model = (client as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

    // Prevent deletion of critical system records
    const protectedTables = ['tenant'];
    if (protectedTables.includes(tableName.toLowerCase())) {
      // Allow deletion but log as critical
      logger.warn(`Deleting record from protected table: ${tableName}`, { recordId, userId });
    }

    try {
      // Get the record before deletion for audit logging
      const record = await model.findUnique({
        where: { id: recordId }
      });

      if (!record) {
        throw this.notFoundError('Record', recordId);
      }

      // Delete the record
      await model.delete({
        where: { id: recordId }
      });

      // Log the deletion
      await client.activityLog.create({
        data: {
          action: 'DATABASE_RECORD_DELETE',
          resourceType: 'DATABASE',
          resourceId: recordId,
          userId: userId,
          logLevel: 'WARN',
          tenantId: tenantId || null,
          details: JSON.parse(JSON.stringify({
            table: tableName,
            recordId,
            deletedData: record
          })) as Prisma.InputJsonValue
        }
      });

      return { success: true, message: `Record ${recordId} deleted from ${tableName}` };
    } catch (error: unknown) {
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'P2021' || errorObj.message?.includes('does not exist')) {
        throw this.notFoundError('Table', tableName);
      }
      if (errorObj.code === 'P2025') {
        throw this.notFoundError('Record', recordId);
      }
      throw error;
    }
  }

  /**
   * Create a new record
   * SUPER_ADMIN only - all creations are logged
   */
  async createRecord(
    tableName: string,
    data: Record<string, unknown>,
    userId: string,
    prismaClient?: PrismaClient,
    tenantId?: string
  ) {
    const client = this.getPrismaClient(prismaClient);
    const model = (client as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

    try {
      // Create the record
      const newRecord = await model.create({
        data
      });

      // Log the creation
      await client.activityLog.create({
        data: {
          action: 'DATABASE_RECORD_CREATE',
          resourceType: 'DATABASE',
          resourceId: newRecord.id,
          userId: userId,
          logLevel: 'INFO',
          tenantId: tenantId || null,
          details: JSON.parse(JSON.stringify({
            table: tableName,
            recordId: newRecord.id,
            createdData: data
          })) as Prisma.InputJsonValue
        }
      });

      return newRecord;
    } catch (error: unknown) {
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'P2021' || errorObj.message?.includes('does not exist')) {
        throw this.notFoundError('Table', tableName);
      }
      throw error;
    }
  }

  /**
   * Check if a table has an updatedAt field
   */
  private hasUpdatedAtField(tableName: string): boolean {
    // Common tables with updatedAt
    const tablesWithUpdatedAt = [
      'user', 'event', 'contest', 'category', 'contestant', 'judge',
      'score', 'tenant', 'notification', 'file', 'backup'
    ];
    return tablesWithUpdatedAt.includes(tableName.toLowerCase());
  }
}
