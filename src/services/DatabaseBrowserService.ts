import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

@injectable()
export class DatabaseBrowserService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getTables() {
    // Get list of tables from Prisma models
    const allModels = Object.keys(this.prisma).filter(key =>
      !key.startsWith('_') && !key.startsWith('$') && typeof (this.prisma as any)[key] === 'object'
    );

    // Test each model to see if the table exists
    const tables = [];
    for (const modelName of allModels) {
      try {
        // Try to count - if it fails, table doesn't exist
        await (this.prisma as any)[modelName].count();
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

  async getTableData(tableName: string, page: number = 1, limit: number = 50) {
    const model = (this.prisma as any)[tableName];
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

  async getTableSchema(tableName: string) {
    const model = (this.prisma as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

    // Return basic table info (Prisma doesn't expose full schema easily)
    return {
      table: tableName,
      message: 'Schema introspection limited in Prisma runtime'
    };
  }
}
