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
    const tables = Object.keys(this.prisma).filter(key => 
      !key.startsWith('_') && !key.startsWith('$') && typeof (this.prisma as any)[key] === 'object'
    );
    return tables;
  }

  async getTableData(tableName: string, page: number = 1, limit: number = 50) {
    const model = (this.prisma as any)[tableName];
    if (!model) {
      throw this.notFoundError('Table', tableName);
    }

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
