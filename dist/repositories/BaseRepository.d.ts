import { PrismaClient } from '@prisma/client';
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
export interface FindManyOptions {
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: any;
    select?: any;
}
export interface PaginationOptions {
    page: number;
    limit: number;
    orderBy?: any;
    include?: any;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}
export declare abstract class BaseRepository<T> implements IBaseRepository<T> {
    protected prisma: PrismaClient;
    constructor(prisma: PrismaClient);
    protected abstract getModelName(): string;
    protected getModel(): any;
    findById(id: string): Promise<T | null>;
    findByIdWithRelations(id: string, include: any): Promise<T | null>;
    findMany(where?: any, options?: FindManyOptions): Promise<T[]>;
    findFirst(where: any): Promise<T | null>;
    findAll(): Promise<T[]>;
    create(data: any): Promise<T>;
    createMany(data: any[]): Promise<number>;
    update(id: string, data: any): Promise<T>;
    updateMany(where: any, data: any): Promise<number>;
    delete(id: string): Promise<void>;
    deleteMany(where: any): Promise<number>;
    count(where?: any): Promise<number>;
    exists(id: string): Promise<boolean>;
    existsWhere(where: any): Promise<boolean>;
    upsert(where: any, create: any, update: any): Promise<T>;
    findManyPaginated(where: any, options: PaginationOptions): Promise<PaginatedResult<T>>;
    executeRaw(query: string, params?: any[]): Promise<any>;
    queryRaw<R = any>(query: string, params?: any[]): Promise<R>;
    transaction<R>(callback: (tx: any) => Promise<R>): Promise<R>;
}
//# sourceMappingURL=BaseRepository.d.ts.map