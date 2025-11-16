"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantIdentifier = void 0;
exports.tenantMiddleware = tenantMiddleware;
exports.optionalTenantMiddleware = optionalTenantMiddleware;
exports.superAdminOnly = superAdminOnly;
exports.createTenantPrismaClient = createTenantPrismaClient;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
class TenantIdentifier {
    static fromSubdomain(req) {
        const host = req.get('host');
        if (!host)
            return null;
        const hostname = host.split(':')[0];
        const parts = hostname.split('.');
        if (parts.length >= 3) {
            const subdomain = parts[0];
            if (!['www', 'api', 'app', 'admin'].includes(subdomain)) {
                return subdomain;
            }
        }
        return null;
    }
    static fromCustomDomain(req) {
        const host = req.get('host');
        if (!host)
            return null;
        const hostname = host.split(':')[0];
        return hostname;
    }
    static fromHeader(req) {
        return req.get('X-Tenant-ID') || req.get('x-tenant-id') || null;
    }
    static fromToken(req) {
        if (req.user && req.user.tenantId) {
            return req.user.tenantId;
        }
        return null;
    }
    static fromQuery(req) {
        if (process.env.NODE_ENV === 'development') {
            return req.query.tenantId || null;
        }
        return null;
    }
}
exports.TenantIdentifier = TenantIdentifier;
async function tenantMiddleware(req, res, next) {
    try {
        let tenantIdOrSlug = null;
        let identificationMethod = 'unknown';
        tenantIdOrSlug = TenantIdentifier.fromHeader(req);
        if (tenantIdOrSlug) {
            identificationMethod = 'header';
        }
        if (!tenantIdOrSlug) {
            tenantIdOrSlug = TenantIdentifier.fromToken(req);
            if (tenantIdOrSlug) {
                identificationMethod = 'token';
            }
        }
        if (!tenantIdOrSlug) {
            tenantIdOrSlug = TenantIdentifier.fromSubdomain(req);
            if (tenantIdOrSlug) {
                identificationMethod = 'subdomain';
            }
        }
        if (!tenantIdOrSlug) {
            const customDomain = TenantIdentifier.fromCustomDomain(req);
            if (customDomain) {
                const tenant = await database_1.default.tenant.findFirst({
                    where: { domain: customDomain, isActive: true },
                });
                if (tenant) {
                    tenantIdOrSlug = tenant.id;
                    identificationMethod = 'custom_domain';
                }
            }
        }
        if (!tenantIdOrSlug) {
            tenantIdOrSlug = TenantIdentifier.fromQuery(req);
            if (tenantIdOrSlug) {
                identificationMethod = 'query';
            }
        }
        if (!tenantIdOrSlug) {
            tenantIdOrSlug = 'default_tenant';
            identificationMethod = 'default';
        }
        let tenant;
        tenant = await database_1.default.tenant.findUnique({
            where: { id: tenantIdOrSlug },
        });
        if (!tenant) {
            tenant = await database_1.default.tenant.findUnique({
                where: { slug: tenantIdOrSlug },
            });
        }
        if (!tenant) {
            logger_1.logger.warn(`Tenant not found: ${tenantIdOrSlug}`);
            res.status(404).json({
                error: 'Tenant not found',
                message: 'The requested tenant does not exist',
                tenantIdentifier: tenantIdOrSlug,
            });
            return;
        }
        if (!tenant.isActive) {
            logger_1.logger.warn(`Tenant is inactive: ${tenant.id}`);
            res.status(403).json({
                error: 'Tenant inactive',
                message: 'This tenant account has been deactivated',
            });
            return;
        }
        req.tenantId = tenant.id;
        req.tenant = {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            domain: tenant.domain,
            isActive: tenant.isActive,
            settings: tenant.settings,
            planType: tenant.planType,
        };
        if (req.user && req.user.isSuperAdmin) {
            req.isSuperAdmin = true;
        }
        logger_1.logger.debug(`Tenant identified: ${tenant.slug} (${tenant.id}) via ${identificationMethod}`);
        next();
    }
    catch (error) {
        logger_1.logger.error('Tenant middleware error:', error);
        res.status(500).json({
            error: 'Tenant identification failed',
            message: 'An error occurred while identifying the tenant',
        });
    }
}
async function optionalTenantMiddleware(req, res, next) {
    try {
        let tenantIdOrSlug = null;
        tenantIdOrSlug = TenantIdentifier.fromHeader(req) ||
            TenantIdentifier.fromToken(req) ||
            TenantIdentifier.fromSubdomain(req) ||
            TenantIdentifier.fromQuery(req);
        if (tenantIdOrSlug) {
            const tenant = await database_1.default.tenant.findFirst({
                where: {
                    OR: [
                        { id: tenantIdOrSlug },
                        { slug: tenantIdOrSlug },
                    ],
                    isActive: true,
                },
            });
            if (tenant) {
                req.tenantId = tenant.id;
                req.tenant = {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug,
                    domain: tenant.domain,
                    isActive: tenant.isActive,
                    settings: tenant.settings,
                    planType: tenant.planType,
                };
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Optional tenant middleware error:', error);
        next();
    }
}
function superAdminOnly(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (!req.user.isSuperAdmin) {
        res.status(403).json({
            error: 'Access denied',
            message: 'This action requires super admin privileges',
        });
        return;
    }
    next();
}
function createTenantPrismaClient(tenantId, isSuperAdmin = false) {
    if (isSuperAdmin) {
        return database_1.default;
    }
    return database_1.default.$extends({
        query: {
            $allModels: {
                async findMany({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findFirst({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findUnique({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findUniqueOrThrow({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async count({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async aggregate({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async groupBy({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async create({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.data = { ...args.data, tenantId };
                    }
                    return query(args);
                },
                async createMany({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields && Array.isArray(args.data)) {
                        args.data = args.data.map((item) => ({ ...item, tenantId }));
                    }
                    return query(args);
                },
                async update({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async updateMany({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async upsert({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                        args.create = { ...args.create, tenantId };
                    }
                    return query(args);
                },
                async delete({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async deleteMany({ model, operation, args, query }) {
                    const modelFields = database_1.default[model]?.fields;
                    if (modelFields && 'tenantId' in modelFields) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
            },
        },
    });
}
exports.default = tenantMiddleware;
//# sourceMappingURL=tenantMiddleware.js.map