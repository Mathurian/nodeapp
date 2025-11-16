"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getModel() {
        const modelName = this.getModelName();
        return this.prisma[modelName];
    }
    async findById(id) {
        return this.getModel().findUnique({
            where: { id }
        });
    }
    async findByIdWithRelations(id, include) {
        return this.getModel().findUnique({
            where: { id },
            include
        });
    }
    async findMany(where = {}, options = {}) {
        return this.getModel().findMany({
            where,
            ...options
        });
    }
    async findFirst(where) {
        return this.getModel().findFirst({
            where
        });
    }
    async findAll() {
        return this.findMany();
    }
    async create(data) {
        return this.getModel().create({
            data
        });
    }
    async createMany(data) {
        const result = await this.getModel().createMany({
            data
        });
        return result.count;
    }
    async update(id, data) {
        return this.getModel().update({
            where: { id },
            data
        });
    }
    async updateMany(where, data) {
        const result = await this.getModel().updateMany({
            where,
            data
        });
        return result.count;
    }
    async delete(id) {
        await this.getModel().delete({
            where: { id }
        });
    }
    async deleteMany(where) {
        const result = await this.getModel().deleteMany({
            where
        });
        return result.count;
    }
    async count(where = {}) {
        return this.getModel().count({
            where
        });
    }
    async exists(id) {
        const count = await this.getModel().count({
            where: { id }
        });
        return count > 0;
    }
    async existsWhere(where) {
        const count = await this.getModel().count({
            where
        });
        return count > 0;
    }
    async upsert(where, create, update) {
        return this.getModel().upsert({
            where,
            create,
            update
        });
    }
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
    async executeRaw(query, params = []) {
        return this.prisma.$executeRawUnsafe(query, ...params);
    }
    async queryRaw(query, params = []) {
        return this.prisma.$queryRawUnsafe(query, ...params);
    }
    async transaction(callback) {
        return this.prisma.$transaction(callback);
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepository.js.map