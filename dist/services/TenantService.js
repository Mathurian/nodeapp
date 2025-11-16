"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const database_1 = __importDefault(require("../config/database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const logger_1 = require("../utils/logger");
class TenantService {
    static async createTenant(input) {
        try {
            const existingSlug = await database_1.default.tenant.findUnique({
                where: { slug: input.slug },
            });
            if (existingSlug) {
                throw new Error(`Tenant with slug '${input.slug}' already exists`);
            }
            if (input.domain) {
                const existingDomain = await database_1.default.tenant.findUnique({
                    where: { domain: input.domain },
                });
                if (existingDomain) {
                    throw new Error(`Tenant with domain '${input.domain}' already exists`);
                }
            }
            const existingEmail = await database_1.default.user.findFirst({
                where: { email: input.adminEmail },
            });
            if (existingEmail) {
                throw new Error(`User with email '${input.adminEmail}' already exists`);
            }
            const result = await database_1.default.$transaction(async (tx) => {
                const tenant = await tx.tenant.create({
                    data: {
                        name: input.name,
                        slug: input.slug,
                        domain: input.domain,
                        planType: input.planType || 'free',
                        subscriptionStatus: 'trial',
                        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        maxUsers: input.maxUsers || (input.planType === 'enterprise' ? null : 50),
                        maxEvents: input.maxEvents || (input.planType === 'enterprise' ? null : 10),
                        maxStorage: input.maxStorage,
                        settings: input.settings || {},
                    },
                });
                const hashedPassword = await bcrypt_1.default.hash(input.adminPassword, 10);
                const adminUser = await tx.user.create({
                    data: {
                        tenantId: tenant.id,
                        name: input.adminName,
                        email: input.adminEmail,
                        password: hashedPassword,
                        role: 'ADMIN',
                        isActive: true,
                    },
                });
                logger_1.logger.info(`Tenant created: ${tenant.slug} (${tenant.id}) with admin user ${adminUser.email}`);
                return { tenant, adminUser };
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error creating tenant:', error);
            throw error;
        }
    }
    static async getTenantById(tenantId) {
        try {
            const tenant = await database_1.default.tenant.findUnique({
                where: { id: tenantId },
            });
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            return tenant;
        }
        catch (error) {
            logger_1.logger.error('Error fetching tenant:', error);
            throw error;
        }
    }
    static async getTenantBySlug(slug) {
        try {
            const tenant = await database_1.default.tenant.findUnique({
                where: { slug },
            });
            if (!tenant) {
                throw new Error(`Tenant not found: ${slug}`);
            }
            return tenant;
        }
        catch (error) {
            logger_1.logger.error('Error fetching tenant:', error);
            throw error;
        }
    }
    static async listTenants(params) {
        try {
            const where = {};
            if (params?.isActive !== undefined) {
                where.isActive = params.isActive;
            }
            if (params?.planType) {
                where.planType = params.planType;
            }
            if (params?.search) {
                where.OR = [
                    { name: { contains: params.search, mode: 'insensitive' } },
                    { slug: { contains: params.search, mode: 'insensitive' } },
                    { domain: { contains: params.search, mode: 'insensitive' } },
                ];
            }
            const [tenants, total] = await Promise.all([
                database_1.default.tenant.findMany({
                    where,
                    skip: params?.skip || 0,
                    take: params?.take || 50,
                    orderBy: { createdAt: 'desc' },
                }),
                database_1.default.tenant.count({ where }),
            ]);
            return { tenants, total };
        }
        catch (error) {
            logger_1.logger.error('Error listing tenants:', error);
            throw error;
        }
    }
    static async updateTenant(tenantId, input) {
        try {
            if (input.slug) {
                const existingSlug = await database_1.default.tenant.findFirst({
                    where: {
                        slug: input.slug,
                        NOT: { id: tenantId },
                    },
                });
                if (existingSlug) {
                    throw new Error(`Tenant with slug '${input.slug}' already exists`);
                }
            }
            if (input.domain) {
                const existingDomain = await database_1.default.tenant.findFirst({
                    where: {
                        domain: input.domain,
                        NOT: { id: tenantId },
                    },
                });
                if (existingDomain) {
                    throw new Error(`Tenant with domain '${input.domain}' already exists`);
                }
            }
            const tenant = await database_1.default.tenant.update({
                where: { id: tenantId },
                data: input,
            });
            logger_1.logger.info(`Tenant updated: ${tenant.slug} (${tenant.id})`);
            return tenant;
        }
        catch (error) {
            logger_1.logger.error('Error updating tenant:', error);
            throw error;
        }
    }
    static async activateTenant(tenantId) {
        try {
            const tenant = await database_1.default.tenant.update({
                where: { id: tenantId },
                data: { isActive: true },
            });
            logger_1.logger.info(`Tenant activated: ${tenant.slug} (${tenant.id})`);
            return tenant;
        }
        catch (error) {
            logger_1.logger.error('Error activating tenant:', error);
            throw error;
        }
    }
    static async deactivateTenant(tenantId) {
        try {
            const tenant = await database_1.default.tenant.update({
                where: { id: tenantId },
                data: { isActive: false },
            });
            logger_1.logger.info(`Tenant deactivated: ${tenant.slug} (${tenant.id})`);
            return tenant;
        }
        catch (error) {
            logger_1.logger.error('Error deactivating tenant:', error);
            throw error;
        }
    }
    static async deleteTenant(tenantId, hard = false) {
        try {
            if (tenantId === 'default_tenant') {
                throw new Error('Cannot delete the default tenant');
            }
            if (hard) {
                await database_1.default.tenant.delete({
                    where: { id: tenantId },
                });
                logger_1.logger.warn(`Tenant hard deleted: ${tenantId}`);
            }
            else {
                await this.deactivateTenant(tenantId);
            }
        }
        catch (error) {
            logger_1.logger.error('Error deleting tenant:', error);
            throw error;
        }
    }
    static async getTenantUsage(tenantId) {
        try {
            const [usersCount, eventsCount, contestsCount, categoriesCount, scoresCount] = await Promise.all([
                database_1.default.user.count({ where: { tenantId } }),
                database_1.default.event.count({ where: { tenantId } }),
                database_1.default.contest.count({ where: { tenantId } }),
                database_1.default.category.count({ where: { tenantId } }),
                database_1.default.score.count({ where: { category: { tenantId } } }),
            ]);
            const lastAudit = await database_1.default.auditLog.findFirst({
                where: { tenantId },
                orderBy: { timestamp: 'desc' },
                select: { timestamp: true },
            });
            const files = await database_1.default.file.findMany({
                where: {
                    tenantId
                },
                select: { size: true },
            });
            const storageUsed = BigInt(files.reduce((sum, file) => sum + file.size, 0));
            return {
                tenantId,
                usersCount,
                eventsCount,
                contestsCount,
                categoriesCount,
                scoresCount,
                storageUsed,
                lastActivity: lastAudit?.timestamp,
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching tenant usage:', error);
            throw error;
        }
    }
    static async inviteUser(tenantId, email, name, role) {
        try {
            const existingUser = await database_1.default.user.findFirst({
                where: { tenantId, email },
            });
            if (existingUser) {
                throw new Error(`User with email '${email}' already exists in this tenant`);
            }
            const tenant = await database_1.default.tenant.findUnique({
                where: { id: tenantId },
            });
            if (tenant?.maxUsers) {
                const currentUserCount = await database_1.default.user.count({ where: { tenantId } });
                if (currentUserCount >= tenant.maxUsers) {
                    throw new Error('Tenant user limit reached');
                }
            }
            const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
            const user = await database_1.default.user.create({
                data: {
                    tenantId,
                    email,
                    name,
                    password: hashedPassword,
                    role: role,
                    isActive: false,
                },
            });
            logger_1.logger.info(`User invited to tenant ${tenantId}: ${email}`);
            return { user, tempPassword };
        }
        catch (error) {
            logger_1.logger.error('Error inviting user:', error);
            throw error;
        }
    }
    static async checkLimits(tenantId) {
        try {
            const tenant = await database_1.default.tenant.findUnique({
                where: { id: tenantId },
            });
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            const usage = await this.getTenantUsage(tenantId);
            return {
                users: {
                    current: usage.usersCount,
                    max: tenant.maxUsers || null,
                    exceeded: tenant.maxUsers ? usage.usersCount >= tenant.maxUsers : false,
                },
                events: {
                    current: usage.eventsCount,
                    max: tenant.maxEvents || null,
                    exceeded: tenant.maxEvents ? usage.eventsCount >= tenant.maxEvents : false,
                },
                storage: {
                    current: usage.storageUsed,
                    max: tenant.maxStorage || null,
                    exceeded: tenant.maxStorage ? usage.storageUsed >= tenant.maxStorage : false,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Error checking tenant limits:', error);
            throw error;
        }
    }
}
exports.TenantService = TenantService;
exports.default = TenantService;
//# sourceMappingURL=TenantService.js.map