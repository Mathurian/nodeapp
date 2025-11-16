"use strict";
/**
 * Base Repository Implementation
 * Generic repository pattern for data access abstraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
/**
 * Abstract Base Repository
 * Provides common CRUD operations for all repositories
 */
class BaseRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Get the Prisma delegate for this model
     */
    getModel() {
        const modelName = this.getModelName();
        return this.prisma[modelName];
    }
    /**
     * Find a record by ID
     */
    async findById(id) {
        return this.getModel().findUnique({
            where: { id }
        });
    }
    /**
     * Find a record by ID with relations
     */
    async findByIdWithRelations(id, include) {
        return this.getModel().findUnique({
            where: { id },
            include
        });
    }
    /**
     * Find many records
     */
    async findMany(where = {}, options = {}) {
        return this.getModel().findMany({
            where,
            ...options
        });
    }
    /**
     * Find first record matching criteria
     */
    async findFirst(where) {
        return this.getModel().findFirst({
            where
        });
    }
    /**
     * Find all records
     */
    async findAll() {
        return this.findMany();
    }
    /**
     * Create a new record
     */
    async create(data) {
        return this.getModel().create({
            data
        });
    }
    /**
     * Create many records
     */
    async createMany(data) {
        const result = await this.getModel().createMany({
            data
        });
        return result.count;
    }
    /**
     * Update a record by ID
     */
    async update(id, data) {
        return this.getModel().update({
            where: { id },
            data
        });
    }
    /**
     * Update many records
     */
    async updateMany(where, data) {
        const result = await this.getModel().updateMany({
            where,
            data
        });
        return result.count;
    }
    /**
     * Delete a record by ID
     */
    async delete(id) {
        await this.getModel().delete({
            where: { id }
        });
    }
    /**
     * Delete many records
     */
    async deleteMany(where) {
        const result = await this.getModel().deleteMany({
            where
        });
        return result.count;
    }
    /**
     * Count records matching criteria
     */
    async count(where = {}) {
        return this.getModel().count({
            where
        });
    }
    /**
     * Check if a record exists by ID
     */
    async exists(id) {
        const count = await this.getModel().count({
            where: { id }
        });
        return count > 0;
    }
    /**
     * Check if any records exist matching criteria
     */
    async existsWhere(where) {
        const count = await this.getModel().count({
            where
        });
        return count > 0;
    }
    /**
     * Upsert a record (create or update)
     */
    async upsert(where, create, update) {
        return this.getModel().upsert({
            where,
            create,
            update
        });
    }
    /**
     * Find with pagination
     */
    async findManyPaginated(where = {}, options) {
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
    async executeRaw(query, params = []) {
        return this.prisma.$executeRawUnsafe(query, ...params);
    }
    /**
     * Query raw
     */
    async queryRaw(query, params = []) {
        return this.prisma.$queryRawUnsafe(query, ...params);
    }
    /**
     * Execute in transaction
     */
    async transaction(callback) {
        return this.prisma.$transaction(callback);
    }
}
exports.BaseRepository = BaseRepository;
