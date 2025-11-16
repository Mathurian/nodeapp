/**
 * Tenant Controller
 *
 * Handles HTTP requests for tenant management operations
 */

import { Request, Response } from 'express';
import TenantService from '../services/TenantService';
import { logger } from '../utils/logger';

export class TenantController {
  /**
   * Create a new tenant
   * POST /api/tenants
   * Super admin only
   */
  static async createTenant(req: Request, res: Response): Promise<void> {
    try {
      const { tenant, adminUser } = await TenantService.createTenant(req.body);

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
    } catch (error: any) {
      logger.error('Error creating tenant:', error);
      res.status(400).json({
        error: 'Failed to create tenant',
        message: error.message,
      });
    }
  }

  /**
   * List all tenants
   * GET /api/tenants
   * Super admin only
   */
  static async listTenants(req: Request, res: Response): Promise<void> {
    try {
      const params = {
        skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
        take: req.query.take ? parseInt(req.query.take as string) : 50,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        planType: req.query.planType as string,
        search: req.query.search as string,
      };

      const { tenants, total } = await TenantService.listTenants(params);

      res.json({
        tenants,
        total,
        skip: params.skip,
        take: params.take,
      });
    } catch (error: any) {
      logger.error('Error listing tenants:', error);
      res.status(500).json({
        error: 'Failed to list tenants',
        message: error.message,
      });
    }
  }

  /**
   * Get tenant by ID
   * GET /api/tenants/:id
   */
  static async getTenant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Non-super admins can only view their own tenant
      if (!req.isSuperAdmin && req.tenantId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const tenant = await TenantService.getTenantById(id);

      res.json({ tenant });
    } catch (error: any) {
      logger.error('Error fetching tenant:', error);
      res.status(404).json({
        error: 'Tenant not found',
        message: error.message,
      });
    }
  }

  /**
   * Update tenant
   * PUT /api/tenants/:id
   */
  static async updateTenant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Non-super admins can only update their own tenant
      if (!req.isSuperAdmin && req.tenantId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Non-super admins cannot change certain fields
      if (!req.isSuperAdmin) {
        delete req.body.planType;
        delete req.body.subscriptionStatus;
        delete req.body.subscriptionEndsAt;
        delete req.body.maxUsers;
        delete req.body.maxEvents;
        delete req.body.maxStorage;
      }

      const tenant = await TenantService.updateTenant(id, req.body);

      res.json({
        message: 'Tenant updated successfully',
        tenant,
      });
    } catch (error: any) {
      logger.error('Error updating tenant:', error);
      res.status(400).json({
        error: 'Failed to update tenant',
        message: error.message,
      });
    }
  }

  /**
   * Activate tenant
   * POST /api/tenants/:id/activate
   * Super admin only
   */
  static async activateTenant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenant = await TenantService.activateTenant(id);

      res.json({
        message: 'Tenant activated successfully',
        tenant,
      });
    } catch (error: any) {
      logger.error('Error activating tenant:', error);
      res.status(400).json({
        error: 'Failed to activate tenant',
        message: error.message,
      });
    }
  }

  /**
   * Deactivate tenant
   * POST /api/tenants/:id/deactivate
   * Super admin only
   */
  static async deactivateTenant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenant = await TenantService.deactivateTenant(id);

      res.json({
        message: 'Tenant deactivated successfully',
        tenant,
      });
    } catch (error: any) {
      logger.error('Error deactivating tenant:', error);
      res.status(400).json({
        error: 'Failed to deactivate tenant',
        message: error.message,
      });
    }
  }

  /**
   * Delete tenant
   * DELETE /api/tenants/:id
   * Super admin only
   */
  static async deleteTenant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const hard = req.query.hard === 'true';

      await TenantService.deleteTenant(id, hard);

      res.json({
        message: hard ? 'Tenant deleted permanently' : 'Tenant deactivated',
      });
    } catch (error: any) {
      logger.error('Error deleting tenant:', error);
      res.status(400).json({
        error: 'Failed to delete tenant',
        message: error.message,
      });
    }
  }

  /**
   * Get tenant usage analytics
   * GET /api/tenants/:id/analytics
   */
  static async getTenantAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Non-super admins can only view their own tenant analytics
      if (!req.isSuperAdmin && req.tenantId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const usage = await TenantService.getTenantUsage(id);
      const limits = await TenantService.checkLimits(id);

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
    } catch (error: any) {
      logger.error('Error fetching tenant analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: error.message,
      });
    }
  }

  /**
   * Invite user to tenant
   * POST /api/tenants/:id/users/invite
   */
  static async inviteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email, name, role } = req.body;

      // Non-super admins can only invite to their own tenant
      if (!req.isSuperAdmin && req.tenantId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { user, tempPassword } = await TenantService.inviteUser(id, email, name, role);

      res.status(201).json({
        message: 'User invited successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tempPassword, // In production, this should be sent via email only
      });
    } catch (error: any) {
      logger.error('Error inviting user:', error);
      res.status(400).json({
        error: 'Failed to invite user',
        message: error.message,
      });
    }
  }

  /**
   * Get current tenant info (for authenticated users)
   * GET /api/tenant/current
   */
  static async getCurrentTenant(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({ error: 'No tenant context' });
        return;
      }

      const tenant = await TenantService.getTenantById(req.tenantId);

      res.json({ tenant });
    } catch (error: any) {
      logger.error('Error fetching current tenant:', error);
      res.status(500).json({
        error: 'Failed to fetch tenant',
        message: error.message,
      });
    }
  }
}

export default TenantController;
