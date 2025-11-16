"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const TenantService_1 = __importDefault(require("../services/TenantService"));
const logger_1 = require("../utils/logger");
class TenantController {
    static async createTenant(req, res) {
        try {
            const { tenant, adminUser } = await TenantService_1.default.createTenant(req.body);
            res.status(201).json({
                message: 'Tenant created successfully',
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug,
                    domain: tenant.domain,
                    planType: tenant.planType,
                    subscriptionStatus: tenant.subscriptionStatus,
                },
                adminUser: {
                    id: adminUser.id,
                    name: adminUser.name,
                    email: adminUser.email,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating tenant:', error);
            res.status(400).json({
                error: 'Failed to create tenant',
                message: error.message,
            });
        }
    }
    static async listTenants(req, res) {
        try {
            const params = {
                skip: req.query.skip ? parseInt(req.query.skip) : 0,
                take: req.query.take ? parseInt(req.query.take) : 50,
                isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
                planType: req.query.planType,
                search: req.query.search,
            };
            const { tenants, total } = await TenantService_1.default.listTenants(params);
            res.json({
                tenants,
                total,
                skip: params.skip,
                take: params.take,
            });
        }
        catch (error) {
            logger_1.logger.error('Error listing tenants:', error);
            res.status(500).json({
                error: 'Failed to list tenants',
                message: error.message,
            });
        }
    }
    static async getTenant(req, res) {
        try {
            const { id } = req.params;
            if (!req.isSuperAdmin && req.tenantId !== id) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }
            const tenant = await TenantService_1.default.getTenantById(id);
            res.json({ tenant });
        }
        catch (error) {
            logger_1.logger.error('Error fetching tenant:', error);
            res.status(404).json({
                error: 'Tenant not found',
                message: error.message,
            });
        }
    }
    static async updateTenant(req, res) {
        try {
            const { id } = req.params;
            if (!req.isSuperAdmin && req.tenantId !== id) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }
            if (!req.isSuperAdmin) {
                delete req.body.planType;
                delete req.body.subscriptionStatus;
                delete req.body.subscriptionEndsAt;
                delete req.body.maxUsers;
                delete req.body.maxEvents;
                delete req.body.maxStorage;
            }
            const tenant = await TenantService_1.default.updateTenant(id, req.body);
            res.json({
                message: 'Tenant updated successfully',
                tenant,
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating tenant:', error);
            res.status(400).json({
                error: 'Failed to update tenant',
                message: error.message,
            });
        }
    }
    static async activateTenant(req, res) {
        try {
            const { id } = req.params;
            const tenant = await TenantService_1.default.activateTenant(id);
            res.json({
                message: 'Tenant activated successfully',
                tenant,
            });
        }
        catch (error) {
            logger_1.logger.error('Error activating tenant:', error);
            res.status(400).json({
                error: 'Failed to activate tenant',
                message: error.message,
            });
        }
    }
    static async deactivateTenant(req, res) {
        try {
            const { id } = req.params;
            const tenant = await TenantService_1.default.deactivateTenant(id);
            res.json({
                message: 'Tenant deactivated successfully',
                tenant,
            });
        }
        catch (error) {
            logger_1.logger.error('Error deactivating tenant:', error);
            res.status(400).json({
                error: 'Failed to deactivate tenant',
                message: error.message,
            });
        }
    }
    static async deleteTenant(req, res) {
        try {
            const { id } = req.params;
            const hard = req.query.hard === 'true';
            await TenantService_1.default.deleteTenant(id, hard);
            res.json({
                message: hard ? 'Tenant deleted permanently' : 'Tenant deactivated',
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting tenant:', error);
            res.status(400).json({
                error: 'Failed to delete tenant',
                message: error.message,
            });
        }
    }
    static async getTenantAnalytics(req, res) {
        try {
            const { id } = req.params;
            if (!req.isSuperAdmin && req.tenantId !== id) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }
            const usage = await TenantService_1.default.getTenantUsage(id);
            const limits = await TenantService_1.default.checkLimits(id);
            res.json({
                usage: {
                    users: usage.usersCount,
                    events: usage.eventsCount,
                    contests: usage.contestsCount,
                    categories: usage.categoriesCount,
                    scores: usage.scoresCount,
                    storage: usage.storageUsed.toString(),
                    lastActivity: usage.lastActivity,
                },
                limits,
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching tenant analytics:', error);
            res.status(500).json({
                error: 'Failed to fetch analytics',
                message: error.message,
            });
        }
    }
    static async inviteUser(req, res) {
        try {
            const { id } = req.params;
            const { email, name, role } = req.body;
            if (!req.isSuperAdmin && req.tenantId !== id) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }
            const { user, tempPassword } = await TenantService_1.default.inviteUser(id, email, name, role);
            res.status(201).json({
                message: 'User invited successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                tempPassword,
            });
        }
        catch (error) {
            logger_1.logger.error('Error inviting user:', error);
            res.status(400).json({
                error: 'Failed to invite user',
                message: error.message,
            });
        }
    }
    static async getCurrentTenant(req, res) {
        try {
            if (!req.tenantId) {
                res.status(400).json({ error: 'No tenant context' });
                return;
            }
            const tenant = await TenantService_1.default.getTenantById(req.tenantId);
            res.json({ tenant });
        }
        catch (error) {
            logger_1.logger.error('Error fetching current tenant:', error);
            res.status(500).json({
                error: 'Failed to fetch tenant',
                message: error.message,
            });
        }
    }
}
exports.TenantController = TenantController;
exports.default = TenantController;
//# sourceMappingURL=tenantController.js.map