/**
 * Base Repository Implementation
 * Generic repository pattern for data access abstraction
 */

import { PrismaClient } from '@prisma/client';

/**
 * Base Repository Interface
 */
export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(where?: any, options?: FindManyOptions): Promise<T[]>;
  findFirst(where: any): Promise<T | null>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<void>;
  count(where?: any): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Options for findMany queries
 */
export interface FindManyOptions {
  skip?: number;
  take?: number;
  orderBy?: any;
  include?: any;
  select?: any;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: any;
  include?: any;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Abstract Base Repository
 * Provides common CRUD operations for all repositories
 */
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get the Prisma model name (must be implemented by child classes)
   */
  protected abstract getModelName(): string;

  /**
   * Get the Prisma delegate for this model
   */
  protected getModel(): any {
    const modelName = this.getModelName();
    return (this.prisma as any)[modelName];
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.getModel().findUnique({
      where: { id }
    }) as Promise<T | null>;
  }

  /**
   * Find a record by ID with relations
   */
  async findByIdWithRelations(id: string, include: any): Promise<T | null> {
    return this.getModel().findUnique({
      where: { id },
      include
    }) as Promise<T | null>;
  }

  /**
   * Find many records
   */
  async findMany(where: any = {}, options: FindManyOptions = {}): Promise<T[]> {
    return this.getModel().findMany({
      where,
      ...options
    }) as Promise<T[]>;
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(where: any): Promise<T | null> {
    return this.getModel().findFirst({
      where
    }) as Promise<T | null>;
  }

  /**
   * Find all records
   */
  async findAll(): Promise<T[]> {
    return this.findMany();
  }

  /**
   * Create a new record
   */
  async create(data: any): Promise<T> {
    return this.getModel().create({
      data
    }) as Promise<T>;
  }

  /**
   * Create many records
   */
  async createMany(data: any[]): Promise<number> {
    const result = await this.getModel().createMany({
      data
    });
    return result.count;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: any): Promise<T> {
    return this.getModel().update({
      where: { id },
      data
    }) as Promise<T>;
  }

  /**
   * Update many records
   */
  async updateMany(where: any, data: any): Promise<number> {
    const result = await this.getModel().updateMany({
      where,
      data
    });
    return result.count;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    await this.getModel().delete({
      where: { id }
    });
  }

  /**
   * Delete many records
   */
  async deleteMany(where: any): Promise<number> {
    const result = await this.getModel().deleteMany({
      where
    });
    return result.count;
  }

  /**
   * Count records matching criteria
   */
  async count(where: any = {}): Promise<number> {
    return this.getModel().count({
      where
    });
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.getModel().count({
      where: { id }
    });
    return count > 0;
  }

  /**
   * Check if any records exist matching criteria
   */
  async existsWhere(where: any): Promise<boolean> {
    const count = await this.getModel().count({
      where
    });
    return count > 0;
  }

  /**
   * Upsert a record (create or update)
   */
  async upsert(where: any, create: any, update: any): Promise<T> {
    return this.getModel().upsert({
      where,
      create,
      update
    }) as Promise<T>;
  }

  /**
   * Find with pagination
   */
  async findManyPaginated(
    where: any = {},
    options: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { page, limit, orderBy, include } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.getModel().findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include
      }),
      this.count(where)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  /**
   * Execute a raw query
   */
  async executeRaw(query: string, params: any[] = []): Promise<any> {
    return this.prisma.$executeRawUnsafe(query, ...params);
  }

  /**
   * Query raw
   */
  async queryRaw<R = any>(query: string, params: any[] = []): Promise<R> {
    return this.prisma.$queryRawUnsafe(query, ...params);
  }

  /**
   * Execute in transaction
   */
  async transaction<R>(
    callback: (tx: any) => Promise<R>
  ): Promise<R> {
    return this.prisma.$transaction(callback);
  }
}
