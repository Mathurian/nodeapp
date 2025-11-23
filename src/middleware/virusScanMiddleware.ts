/**
 * Virus Scan Middleware
 * Middleware for scanning uploaded files with ClamAV
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { getVirusScanService } from '../services/VirusScanService';
import { ScanStatus } from '../config/virus-scan.config';
import { EmailService } from '../services/EmailService';
import * as fs from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('VirusScanMiddleware');

export interface VirusScanMiddlewareOptions {
  deleteOnInfection?: boolean;
  blockOnError?: boolean;
  scanBuffers?: boolean;
}

/**
 * Format file size in bytes to human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Middleware to scan uploaded files
 */
export const virusScanMiddleware = (options: VirusScanMiddlewareOptions = {}) => {
  const virusScanService = getVirusScanService();
  const deleteOnInfection = options.deleteOnInfection !== false;
  const blockOnError = options.blockOnError || false;
  const scanBuffers = options.scanBuffers || false;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if any files were uploaded
      const files: Express.Multer.File[] = [];

      if (req.file) {
        files.push(req.file);
      }

      if (req.files) {
        if (Array.isArray(req.files)) {
          files.push(...req.files);
        } else {
          // req.files is an object with field names as keys
          Object.values(req.files).forEach(fileArray => {
            if (Array.isArray(fileArray)) {
              files.push(...fileArray);
            }
          });
        }
      }

      // No files to scan
      if (files.length === 0) {
        next();
        return;
      }

      // Scan all files
      const scanResults = await Promise.all(
        files.map(async (file) => {
          if (scanBuffers && file.buffer) {
            return {
              file,
              result: await virusScanService.scanBuffer(file.buffer, file.originalname),
            };
          } else if (file.path) {
            return {
              file,
              result: await virusScanService.scanFile(file.path),
            };
          } else {
            return {
              file,
              result: {
                status: ScanStatus.ERROR,
                file: file.originalname,
                size: file.size,
                scannedAt: new Date(),
                duration: 0,
                error: 'No file path or buffer available for scanning',
              },
            };
          }
        })
      );

      // Check for infections
      const infectedFiles = scanResults.filter(({ result }) => result.status === ScanStatus.INFECTED);
      const errorFiles = scanResults.filter(({ result }) => result.status === ScanStatus.ERROR);

      // Handle infected files
      if (infectedFiles.length > 0) {
        logger.warn('Infected files detected', { 
          infectedFiles: infectedFiles.map(({ file, result }) => ({
            filename: file.originalname,
            virus: result.virus,
          }))
        });

        // Send email notification to security team (non-blocking)
        try {
          const emailService = container.resolve(EmailService);

          // Send email for each infected file
          infectedFiles.forEach(async ({ file, result }) => {
            try {
              // Extract user information from request if available
              const user = (req as any).user;
              const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
              const userAgent = req.get('user-agent');

              await emailService.sendVirusAlertEmail({
                filename: file.originalname,
                virusName: result.virus || 'Unknown Threat',
                fileSize: formatFileSize(file.size),
                timestamp: new Date().toISOString(),
                username: user?.username || user?.name,
                userEmail: user?.email,
                ipAddress,
                userAgent,
              });

              logger.info(`Virus alert email sent for infected file`, { filename: file.originalname });
            } catch (emailError) {
              // Don't break the flow if email fails
              logger.error('Failed to send virus alert email', { error: emailError, filename: file.originalname });
            }
          });
        } catch (error) {
          logger.error('Failed to initialize EmailService for virus alert', { error });
        }

        // Delete infected files
        if (deleteOnInfection) {
          infectedFiles.forEach(({ file }) => {
            if (file.path && fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
                logger.info(`Deleted infected file`, { filePath: file.path });
              } catch (error) {
                logger.error(`Failed to delete infected file`, { error, filePath: file.path });
              }
            }
          });
        }

        // Log to audit trail
        // TODO: Integrate with audit logging service

        res.status(400).json({
          success: false,
          error: 'Infected files detected',
          details: infectedFiles.map(({ file, result }) => ({
            filename: file.originalname,
            virus: result.virus,
          })),
        });
        return;
      }

      // Handle scan errors
      if (errorFiles.length > 0 && blockOnError) {
        logger.error('Scan errors detected', { 
          errorFiles: errorFiles.map(({ file, result }) => ({
            filename: file.originalname,
            error: result.error,
          }))
        });

        res.status(500).json({
          success: false,
          error: 'Virus scan failed',
          details: errorFiles.map(({ file, result }) => ({
            filename: file.originalname,
            error: result.error,
          })),
        });
        return;
      }

      // All files are clean - attach scan results to request
      (req as { scanResults?: unknown[] }).scanResults = scanResults.map(({ result }) => result);

      next();
    } catch (error) {
      logger.error('Virus scan middleware error', { error });

      if (blockOnError) {
        res.status(500).json({
          success: false,
          error: 'Virus scan failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        // Continue without blocking
        next();
      }
    }
  };
};

/**
 * Middleware to scan single file
 */
export const scanSingleFile = (options: VirusScanMiddlewareOptions = {}) => {
  return virusScanMiddleware(options);
};

/**
 * Middleware to scan multiple files
 */
export const scanMultipleFiles = (options: VirusScanMiddlewareOptions = {}) => {
  return virusScanMiddleware(options);
};

/**
 * Strict virus scan - blocks on any error
 */
export const strictVirusScan = virusScanMiddleware({
  deleteOnInfection: true,
  blockOnError: true,
});

/**
 * Lenient virus scan - only blocks on infection
 */
export const lenientVirusScan = virusScanMiddleware({
  deleteOnInfection: true,
  blockOnError: false,
});

export default {
  virusScanMiddleware,
  scanSingleFile,
  scanMultipleFiles,
  strictVirusScan,
  lenientVirusScan,
};
