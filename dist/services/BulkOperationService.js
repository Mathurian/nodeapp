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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkOperationService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const Logger = (0, logger_1.createLogger)('BulkOperationService');
let BulkOperationService = class BulkOperationService {
    prisma;
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    async executeBulkOperation(operation, items, options = {}) {
        const { continueOnError = true, batchSize = 10 } = options;
        const result = {
            total: items.length,
            successful: 0,
            failed: 0,
            errors: []
        };
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const promises = batch.map(async (item) => {
                try {
                    await operation(item);
                    result.successful++;
                }
                catch (error) {
                    result.failed++;
                    result.errors.push({
                        item,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    Logger.error('Bulk operation failed for item', { item, error });
                    if (!continueOnError) {
                        throw error;
                    }
                }
            });
            await Promise.all(promises);
            if (!continueOnError && result.failed > 0) {
                break;
            }
        }
        Logger.info('Bulk operation completed', {
            total: result.total,
            successful: result.successful,
            failed: result.failed
        });
        return result;
    }
    async executeBulkOperationWithTransaction(operation, items) {
        try {
            await this.prisma.$transaction(async (tx) => {
                await operation(items, tx);
            });
            Logger.info('Bulk transaction completed successfully', {
                itemCount: items.length
            });
        }
        catch (error) {
            Logger.error('Bulk transaction failed, rolling back', { error });
            throw error;
        }
    }
    async bulkCreate(model, data) {
        const result = {
            total: data.length,
            successful: 0,
            failed: 0,
            errors: []
        };
        try {
            const created = await this.prisma[model].createMany({
                data,
                skipDuplicates: true
            });
            result.successful = created.count;
            Logger.info(`Bulk created ${created.count} ${model} records`);
        }
        catch (error) {
            result.failed = data.length;
            result.errors.push({
                item: data,
                error: error instanceof Error ? error.message : String(error)
            });
            Logger.error(`Bulk create failed for ${model}`, { error });
        }
        return result;
    }
    async bulkUpdate(model, updates) {
        return this.executeBulkOperation(async (update) => {
            await this.prisma[model].update({
                where: { id: update.id },
                data: update.data
            });
        }, updates, { continueOnError: true });
    }
    async bulkDelete(model, ids) {
        const result = {
            total: ids.length,
            successful: 0,
            failed: 0,
            errors: []
        };
        try {
            const deleted = await this.prisma[model].deleteMany({
                where: {
                    id: {
                        in: ids
                    }
                }
            });
            result.successful = deleted.count;
            Logger.info(`Bulk deleted ${deleted.count} ${model} records`);
        }
        catch (error) {
            result.failed = ids.length;
            result.errors.push({
                item: ids,
                error: error instanceof Error ? error.message : String(error)
            });
            Logger.error(`Bulk delete failed for ${model}`, { error });
        }
        return result;
    }
    async bulkSoftDelete(model, ids) {
        const result = {
            total: ids.length,
            successful: 0,
            failed: 0,
            errors: []
        };
        try {
            const updated = await this.prisma[model].updateMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                data: {
                    active: false
                }
            });
            result.successful = updated.count;
            Logger.info(`Bulk soft deleted ${updated.count} ${model} records`);
        }
        catch (error) {
            result.failed = ids.length;
            result.errors.push({
                item: ids,
                error: error instanceof Error ? error.message : String(error)
            });
            Logger.error(`Bulk soft delete failed for ${model}`, { error });
        }
        return result;
    }
};
exports.BulkOperationService = BulkOperationService;
exports.BulkOperationService = BulkOperationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], BulkOperationService);
//# sourceMappingURL=BulkOperationService.js.map