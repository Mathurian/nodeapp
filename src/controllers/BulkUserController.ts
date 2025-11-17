import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { BulkOperationService } from '../services/BulkOperationService';
import { CSVService } from '../services/CSVService';
import { UserService } from '../services/UserService';
import { createLogger } from '../utils/logger';

const Logger = createLogger('BulkUserController');

@injectable()
export class BulkUserController {
  constructor(
    @inject(BulkOperationService) private bulkOperationService: BulkOperationService,
    @inject(CSVService) private csvService: CSVService,
    @inject(UserService) private userService: UserService
  ) {}

  /**
   * POST /api/bulk/users/activate
   * Activate multiple users
   */
  async activateUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ error: 'userIds array is required' });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (userId: string) => {
          await this.userService.updateUser(userId, { isActive: true });
        },
        userIds
      );

      Logger.info('Bulk activate users completed', { result, userId: req.user?.id });

      res.json({
        message: 'Bulk activate completed',
        result
      });
    } catch (error) {
      Logger.error('Bulk activate users failed', { error });
      res.status(500).json({
        error: 'Failed to activate users',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/bulk/users/deactivate
   * Deactivate multiple users
   */
  async deactivateUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ error: 'userIds array is required' });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (userId: string) => {
          await this.userService.updateUser(userId, { isActive: false });
        },
        userIds
      );

      Logger.info('Bulk deactivate users completed', { result, userId: req.user?.id });

      res.json({
        message: 'Bulk deactivate completed',
        result
      });
    } catch (error) {
      Logger.error('Bulk deactivate users failed', { error });
      res.status(500).json({
        error: 'Failed to deactivate users',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/bulk/users/delete
   * Soft delete multiple users
   */
  async deleteUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ error: 'userIds array is required' });
        return;
      }

      // Prevent deleting self
      if (userIds.includes(req.user!.id)) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (userId: string) => {
          await this.userService.deleteUser(userId);
        },
        userIds
      );

      Logger.info('Bulk delete users completed', { result, userId: req.user?.id });

      res.json({
        message: 'Bulk delete completed',
        result
      });
    } catch (error) {
      Logger.error('Bulk delete users failed', { error });
      res.status(500).json({
        error: 'Failed to delete users',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/bulk/users/change-role
   * Change role for multiple users
   */
  async changeUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, role } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ error: 'userIds array is required' });
        return;
      }

      if (!role) {
        res.status(400).json({ error: 'role is required' });
        return;
      }

      const validRoles = ['ADMIN', 'BOARD', 'TALLYMASTER', 'AUDITOR', 'JUDGE', 'EMCEE', 'CONTESTANT'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
        return;
      }

      // Prevent changing own role
      if (userIds.includes(req.user!.id)) {
        res.status(400).json({ error: 'Cannot change your own role' });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (userId: string) => {
          await this.userService.updateUser(userId, { role });
        },
        userIds
      );

      Logger.info('Bulk change role completed', { result, role, userId: req.user?.id });

      res.json({
        message: 'Bulk role change completed',
        result
      });
    } catch (error) {
      Logger.error('Bulk change role failed', { error });
      res.status(500).json({
        error: 'Failed to change user roles',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/bulk/users/import
   * Import users from CSV
   */
  async importUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'CSV file is required' });
        return;
      }

      // Parse CSV
      const csvData = this.csvService.parseCSV(req.file.buffer);

      // Validate
      const validationResult = await this.csvService.validateUsersImport(csvData);

      if (validationResult.failed > 0) {
        res.status(400).json({
          error: 'CSV validation failed',
          result: validationResult
        });
        return;
      }

      // Import users
      const importResult = await this.bulkOperationService.executeBulkOperation(
        async (userData: any) => {
          await this.userService.createUser(userData);
        },
        validationResult.data
      );

      Logger.info('User import completed', { result: importResult, userId: req.user?.id });

      res.json({
        message: 'User import completed',
        validation: validationResult,
        import: importResult
      });
    } catch (error) {
      Logger.error('User import failed', { error });
      res.status(500).json({
        error: 'Failed to import users',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/bulk/users/export
   * Export users to CSV
   */
  async exportUsers(req: Request, res: Response): Promise<void> {
    try {
      const { active, role } = req.query;

      // Get all users (UserService doesn't support filters directly)
      const users = await this.userService.getAllUsers();

      // Filter on our end
      const filteredUsers = users.filter(u => {
        if (active !== undefined && u.isActive !== (active === 'true')) return false;
        if (role && u.role !== role) return false;
        return true;
      });

      // Export to CSV
      const csv = this.csvService.exportToCSV(
        filteredUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          phone: u.phone || '',
          active: u.isActive,
          createdAt: u.createdAt
        })),
        ['id', 'email', 'name', 'role', 'phone', 'active', 'createdAt'],
        ['ID', 'Email', 'Name', 'Role', 'Phone', 'Active', 'Created At']
      );

      Logger.info('User export completed', { count: filteredUsers.length, userId: req.user?.id });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
      res.send(csv);
    } catch (error) {
      Logger.error('User export failed', { error });
      res.status(500).json({
        error: 'Failed to export users',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/bulk/users/template
   * Download CSV import template
   */
  async getImportTemplate(_req: Request, res: Response): Promise<void> {
    try {
      const template = this.csvService.generateTemplate('users');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users-import-template.csv');
      res.send(template);
    } catch (error) {
      Logger.error('Get template failed', { error });
      res.status(500).json({
        error: 'Failed to generate template',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
