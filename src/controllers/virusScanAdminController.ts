/**
 * Virus Scan Admin Controller
 * Admin endpoints for virus scanning management
 */

import { Request, Response } from 'express';
import { getVirusScanService } from '../services/VirusScanService';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('VirusScanAdminController');

export class VirusScanAdminController {
  /**
   * Check ClamAV availability
   */
  public static async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const virusScanService = getVirusScanService();
      const isAvailable = await virusScanService.isAvailable();

      res.json({
        success: true,
        data: {
          available: isAvailable,
          status: isAvailable ? 'connected' : 'disconnected',
        },
      });
    } catch (error) {
      logger.error('Error checking virus scan health', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to check virus scan health',
      });
    }
  }

  /**
   * Get virus scan statistics
   */
  public static async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const virusScanService = getVirusScanService();
      const stats = virusScanService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting virus scan statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get virus scan statistics',
      });
    }
  }

  /**
   * List quarantined files
   */
  public static async listQuarantinedFiles(_req: Request, res: Response): Promise<void> {
    try {
      const virusScanService = getVirusScanService();
      const files = virusScanService.listQuarantinedFiles();

      const filesWithMetadata = files.map(filename => {
        const metadata = virusScanService.getQuarantineMetadata(filename);
        return {
          filename,
          ...metadata,
        };
      });

      res.json({
        success: true,
        data: filesWithMetadata,
      });
    } catch (error) {
      logger.error('Error listing quarantined files', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list quarantined files',
      });
    }
  }

  /**
   * Get quarantined file details
   */
  public static async getQuarantinedFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const virusScanService = getVirusScanService();
      const metadata = virusScanService.getQuarantineMetadata(filename!);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: 'Quarantined file not found',
        });
        return;
      }

      res.json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      logger.error('Error getting quarantined file', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get quarantined file',
      });
    }
  }

  /**
   * Delete quarantined file
   */
  public static async deleteQuarantinedFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const virusScanService = getVirusScanService();
      const success = virusScanService.deleteQuarantinedFile(filename!);

      if (success) {
        res.json({
          success: true,
          message: 'Quarantined file deleted successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete quarantined file',
        });
      }
    } catch (error) {
      logger.error('Error deleting quarantined file', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete quarantined file',
      });
    }
  }

  /**
   * Manually scan a file
   */
  public static async scanFile(req: Request, res: Response): Promise<void> {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        res.status(400).json({
          success: false,
          error: 'File path is required',
        });
        return;
      }

      const virusScanService = getVirusScanService();
      const result = await virusScanService.scanFile(filePath);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error scanning file', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to scan file',
      });
    }
  }

  /**
   * Bulk scan directory
   */
  public static async bulkScan(req: Request, res: Response): Promise<void> {
    try {
      const { directoryPath } = req.body;

      if (!directoryPath) {
        res.status(400).json({
          success: false,
          error: 'Directory path is required',
        });
        return;
      }

      if (!fs.existsSync(directoryPath)) {
        res.status(404).json({
          success: false,
          error: 'Directory not found',
        });
        return;
      }

      const virusScanService = getVirusScanService();
      const files = fs.readdirSync(directoryPath);

      const results = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(directoryPath, filename);
          if (fs.statSync(filePath).isFile()) {
            return await virusScanService.scanFile(filePath);
          }
          return null;
        })
      );

      const cleanedResults = results.filter(r => r !== null);

      res.json({
        success: true,
        data: {
          totalFiles: cleanedResults.length,
          results: cleanedResults,
          summary: {
            clean: cleanedResults.filter(r => r?.status === 'clean').length,
            infected: cleanedResults.filter(r => r?.status === 'infected').length,
            errors: cleanedResults.filter(r => r?.status === 'error').length,
            skipped: cleanedResults.filter(r => r?.status === 'skipped').length,
          },
        },
      });
    } catch (error) {
      logger.error('Error performing bulk scan', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk scan',
      });
    }
  }

  /**
   * Clear scan cache
   */
  public static async clearCache(_req: Request, res: Response): Promise<void> {
    try {
      const virusScanService = getVirusScanService();
      virusScanService.clearCache();

      res.json({
        success: true,
        message: 'Scan cache cleared successfully',
      });
    } catch (error) {
      logger.error('Error clearing scan cache', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to clear scan cache',
      });
    }
  }
}

export default VirusScanAdminController;
