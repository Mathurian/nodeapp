/**
 * Tenant Service
 *
 * Handles all tenant-related operations including CRUD, provisioning,
 * activation/deactivation, and usage analytics.
 */

import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  planType?: 'free' | 'pro' | 'enterprise';
  maxUsers?: number;
  maxEvents?: number;
  maxStorage?: bigint;
  settings?: any;

  // Admin user details
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  domain?: string;
  planType?: 'free' | 'pro' | 'enterprise';
  subscriptionStatus?: 'active' | 'trial' | 'suspended' | 'cancelled';
  subscriptionEndsAt?: Date;
  maxUsers?: number;
  maxEvents?: number;
  maxStorage?: bigint;
  settings?: any;
}

export interface TenantUsageStats {
  tenantId: string;
  usersCount: number;
  eventsCount: number;
  contestsCount: number;
  categoriesCount: number;
  scoresCount: number;
  storageUsed: bigint;
  lastActivity?: Date;
}

export class TenantService {
  /**
   * Create a new tenant with default admin user
   */
  static async createTenant(input: CreateTenantInput): Promise<any> {
    try {
      // Validate slug is unique
      const existingSlug = await prisma.tenant.findUnique({
        where: { slug: input.slug },
      });

      if (existingSlug) {
        throw new Error(`Tenant with slug '${input.slug}' already exists`);
      }

      // Validate domain is unique (if provided)
      if (input.domain) {
        const existingDomain = await prisma.tenant.findUnique({
          where: { domain: input.domain },
        });

        if (existingDomain) {
          throw new Error(`Tenant with domain '${input.domain}' already exists`);
        }
      }

      // Validate admin email is not already used
      const existingEmail = await prisma.user.findFirst({
        where: { email: input.adminEmail },
      });

      if (existingEmail) {
        throw new Error(`User with email '${input.adminEmail}' already exists`);
      }

      // Create tenant and admin user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: input.name,
            slug: input.slug,
            domain: input.domain,
            planType: input.planType || 'free',
            subscriptionStatus: 'trial',
            subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
            maxUsers: input.maxUsers || (input.planType === 'enterprise' ? null : 50),
            maxEvents: input.maxEvents || (input.planType === 'enterprise' ? null : 10),
            maxStorage: input.maxStorage,
            settings: input.settings || {},
          },
        });

        // Hash admin password
        const hashedPassword = await bcrypt.hash(input.adminPassword, 10);

        // Create admin user
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

        logger.info(`Tenant created: ${tenant.slug} (${tenant.id}) with admin user ${adminUser.email}`);

        return { tenant, adminUser };
      });

      return result;
    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  static async getTenantById(tenantId: string): Promise<any> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      return tenant;
    } catch (error) {
      logger.error('Error fetching tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by slug
   */
  static async getTenantBySlug(slug: string): Promise<any> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${slug}`);
      }

      return tenant;
    } catch (error) {
      logger.error('Error fetching tenant:', error);
      throw error;
    }
  }

  /**
   * List all tenants (super admin only)
   */
  static async listTenants(params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
    planType?: string;
    search?: string;
  }): Promise<{ tenants: any[]; total: number }> {
    try {
      const where: Prisma.TenantWhereInput = {};

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
        prisma.tenant.findMany({
          where,
          skip: params?.skip || 0,
          take: params?.take || 50,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.tenant.count({ where }),
      ]);

      return { tenants, total };
    } catch (error) {
      logger.error('Error listing tenants:', error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  static async updateTenant(tenantId: string, input: UpdateTenantInput): Promise<any> {
    try {
      // Validate slug uniqueness if changing
      if (input.slug) {
        const existingSlug = await prisma.tenant.findFirst({
          where: {
            slug: input.slug,
            NOT: { id: tenantId },
          },
        });

        if (existingSlug) {
          throw new Error(`Tenant with slug '${input.slug}' already exists`);
        }
      }

      // Validate domain uniqueness if changing
      if (input.domain) {
        const existingDomain = await prisma.tenant.findFirst({
          where: {
            domain: input.domain,
            NOT: { id: tenantId },
          },
        });

        if (existingDomain) {
          throw new Error(`Tenant with domain '${input.domain}' already exists`);
        }
      }

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: input,
      });

      logger.info(`Tenant updated: ${tenant.slug} (${tenant.id})`);

      return tenant;
    } catch (error) {
      logger.error('Error updating tenant:', error);
      throw error;
    }
  }

  /**
   * Activate tenant
   */
  static async activateTenant(tenantId: string): Promise<any> {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: true },
      });

      logger.info(`Tenant activated: ${tenant.slug} (${tenant.id})`);

      return tenant;
    } catch (error) {
      logger.error('Error activating tenant:', error);
      throw error;
    }
  }

  /**
   * Deactivate tenant
   */
  static async deactivateTenant(tenantId: string): Promise<any> {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: false },
      });

      logger.info(`Tenant deactivated: ${tenant.slug} (${tenant.id})`);

      return tenant;
    } catch (error) {
      logger.error('Error deactivating tenant:', error);
      throw error;
    }
  }

  /**
   * Delete tenant (soft delete by deactivating)
   */
  static async deleteTenant(tenantId: string, hard: boolean = false): Promise<void> {
    try {
      if (tenantId === 'default_tenant') {
        throw new Error('Cannot delete the default tenant');
      }

      if (hard) {
        // Hard delete - removes all data (use with caution!)
        await prisma.tenant.delete({
          where: { id: tenantId },
        });
        logger.warn(`Tenant hard deleted: ${tenantId}`);
      } else {
        // Soft delete - just deactivate
        await this.deactivateTenant(tenantId);
      }
    } catch (error) {
      logger.error('Error deleting tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant usage statistics
   */
  static async getTenantUsage(tenantId: string): Promise<TenantUsageStats> {
    try {
      const [usersCount, eventsCount, contestsCount, categoriesCount, scoresCount] = await Promise.all([
        prisma.user.count({ where: { tenantId } }),
        prisma.event.count({ where: { tenantId } }),
        prisma.contest.count({ where: { tenantId } }),
        prisma.category.count({ where: { tenantId } }),
        prisma.score.count({ where: { category: { tenantId } } }),
      ]);

      // Get last activity (most recent audit log)
      const lastAudit = await prisma.auditLog.findFirst({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });

      // Calculate storage used (simplified - sum of file sizes)
      const files = await prisma.file.findMany({
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
    } catch (error) {
      logger.error('Error fetching tenant usage:', error);
      throw error;
    }
  }

  /**
   * Invite user to tenant
   */
  static async inviteUser(
    tenantId: string,
    email: string,
    name: string,
    role: string
  ): Promise<any> {
    try {
      // Check if user already exists in this tenant
      const existingUser = await prisma.user.findFirst({
        where: { tenantId, email },
      });

      if (existingUser) {
        throw new Error(`User with email '${email}' already exists in this tenant`);
      }

      // Check tenant user limit
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (tenant?.maxUsers) {
        const currentUserCount = await prisma.user.count({ where: { tenantId } });
        if (currentUserCount >= tenant.maxUsers) {
          throw new Error('Tenant user limit reached');
        }
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          tenantId,
          email,
          name,
          password: hashedPassword,
          role: role as any,
          isActive: false, // Requires email confirmation
        },
      });

      logger.info(`User invited to tenant ${tenantId}: ${email}`);

      // TODO: Send invitation email with temporary password

      return { user, tempPassword };
    } catch (error) {
      logger.error('Error inviting user:', error);
      throw error;
    }
  }

  /**
   * Check if tenant has reached limits
   */
  static async checkLimits(tenantId: string): Promise<{
    users: { current: number; max: number | null; exceeded: boolean };
    events: { current: number; max: number | null; exceeded: boolean };
    storage: { current: bigint; max: bigint | null; exceeded: boolean };
  }> {
    try {
      const tenant = await prisma.tenant.findUnique({
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
    } catch (error) {
      logger.error('Error checking tenant limits:', error);
      throw error;
    }
  }
}

export default TenantService;
