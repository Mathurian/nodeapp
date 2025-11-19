/**
 * Base Repository Implementation
 * Generic repository pattern for data access abstraction
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Type for Prisma where clause
export type WhereInput = Record<string, unknown>;

// Type for Prisma data input
export type DataInput = Record<string, unknown>;

// Type for Prisma order by
export type OrderByInput = Record<string, unknown> | Array<Record<string, unknown>>;

// Type for Prisma include/select
export type IncludeSelect = Record<string, unknown>;

/**
 * Base Repository Interface
 */
export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(where?: WhereInput, options?: FindManyOptions): Promise<T[]>;
  findFirst(where: WhereInput): Promise<T | null>;
  create(data: DataInput): Promise<T>;
  update(id: string, data: DataInput): Promise<T>;
  delete(id: string): Promise<void>;
  count(where?: WhereInput): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Options for findMany queries
 */
export interface FindManyOptions {
  skip?: number;
  take?: number;
  orderBy?: OrderByInput;
  include?: IncludeSelect;
  select?: IncludeSelect;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: OrderByInput;
  include?: IncludeSelect;
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
   * Note: Returns unknown as Prisma model delegates have dynamic types
   */
  protected getModel(): unknown {
    const modelName = this.getModelName();
    return (this.prisma as unknown as Record<string, unknown>)[modelName];
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    return (this.getModel() as {
      findUnique: (args: { where: { id: string } }) => Promise<T | null>;
    }).findUnique({
      where: { id }
    });
  }

  /**
   * Find a record by ID with relations
   */
  async findByIdWithRelations(id: string, include: IncludeSelect): Promise<T | null> {
    return (this.getModel() as {
      findUnique: (args: { where: { id: string }; include: IncludeSelect }) => Promise<T | null>;
    }).findUnique({
      where: { id },
      include
    });
  }

  /**
   * Find many records
   */
  async findMany(where: WhereInput = {}, options: FindManyOptions = {}): Promise<T[]> {
    return (this.getModel() as {
      findMany: (args: WhereInput & FindManyOptions) => Promise<T[]>;
    }).findMany({
      where,
      ...options
    });
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(where: WhereInput): Promise<T | null> {
    return (this.getModel() as {
      findFirst: (args: { where: WhereInput }) => Promise<T | null>;
    }).findFirst({
      where
    });
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
  async create(data: DataInput): Promise<T> {
    return (this.getModel() as {
      create: (args: { data: DataInput }) => Promise<T>;
    }).create({
      data
    });
  }

  /**
   * Create many records
   */
  async createMany(data: DataInput[]): Promise<number> {
    const result = await (this.getModel() as {
      createMany: (args: { data: DataInput[] }) => Promise<{ count: number }>;
    }).createMany({
      data
    });
    return result.count;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: DataInput): Promise<T> {
    return (this.getModel() as {
      update: (args: { where: { id: string }; data: DataInput }) => Promise<T>;
    }).update({
      where: { id },
      data
    });
  }

  /**
   * Update many records
   */
  async updateMany(where: WhereInput, data: DataInput): Promise<number> {
    const result = await (this.getModel() as {
      updateMany: (args: { where: WhereInput; data: DataInput }) => Promise<{ count: number }>;
    }).updateMany({
      where,
      data
    });
    return result.count;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    await (this.getModel() as {
      delete: (args: { where: { id: string } }) => Promise<unknown>;
    }).delete({
      where: { id }
    });
  }

  /**
   * Delete many records
   */
  async deleteMany(where: WhereInput): Promise<number> {
    const result = await (this.getModel() as {
      deleteMany: (args: { where: WhereInput }) => Promise<{ count: number }>;
    }).deleteMany({
      where
    });
    return result.count;
  }

  /**
   * Count records matching criteria
   */
  async count(where: WhereInput = {}): Promise<number> {
    return (this.getModel() as {
      count: (args: { where: WhereInput }) => Promise<number>;
    }).count({
      where
    });
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const count = await (this.getModel() as {
      count: (args: { where: { id: string } }) => Promise<number>;
    }).count({
      where: { id }
    });
    return count > 0;
  }

  /**
   * Check if any records exist matching criteria
   */
  async existsWhere(where: WhereInput): Promise<boolean> {
    const count = await (this.getModel() as {
      count: (args: { where: WhereInput }) => Promise<number>;
    }).count({
      where
    });
    return count > 0;
  }

  /**
   * Upsert a record (create or update)
   */
  async upsert(where: WhereInput, create: DataInput, update: DataInput): Promise<T> {
    return (this.getModel() as {
      upsert: (args: { where: WhereInput; create: DataInput; update: DataInput }) => Promise<T>;
    }).upsert({
      where,
      create,
      update
    });
  }

  /**
   * Find with pagination
   */
  async findManyPaginated(
    where: WhereInput = {},
    options: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { page, limit, orderBy, include } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (this.getModel() as any).findMany({
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
  async executeRaw(query: string, params: unknown[] = []): Promise<number> {
    return this.prisma.$executeRawUnsafe(query, ...params);
  }

  /**
   * Query raw
   */
  async queryRaw<R = unknown>(query: string, params: unknown[] = []): Promise<R> {
    return this.prisma.$queryRawUnsafe(query, ...params);
  }

  /**
   * Execute in transaction
   */
  async transaction<R>(
    callback: (tx: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    return this.prisma.$transaction(callback);
  }
}
