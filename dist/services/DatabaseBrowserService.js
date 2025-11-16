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
exports.DatabaseBrowserService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let DatabaseBrowserService = class DatabaseBrowserService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getTables() {
        const tables = Object.keys(this.prisma).filter(key => !key.startsWith('_') && !key.startsWith('$') && typeof this.prisma[key] === 'object');
        return tables;
    }
    async getTableData(tableName, page = 1, limit = 50) {
        const model = this.prisma[tableName];
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
    async getTableSchema(tableName) {
        const model = this.prisma[tableName];
        if (!model) {
            throw this.notFoundError('Table', tableName);
        }
        return {
            table: tableName,
            message: 'Schema introspection limited in Prisma runtime'
        };
    }
};
exports.DatabaseBrowserService = DatabaseBrowserService;
exports.DatabaseBrowserService = DatabaseBrowserService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], DatabaseBrowserService);
//# sourceMappingURL=DatabaseBrowserService.js.map