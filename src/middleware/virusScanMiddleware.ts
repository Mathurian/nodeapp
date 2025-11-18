/**
 * Virus Scan Middleware
 * Middleware for scanning uploaded files with ClamAV
 */

import { Request, Response, NextFunction } from 'express';
import { getVirusScanService } from '../services/VirusScanService';
import { ScanStatus } from '../config/virus-scan.config';
import * as fs from 'fs';

export interface VirusScanMiddlewareOptions {
  deleteOnInfection?: boolean;
  blockOnError?: boolean;
  scanBuffers?: boolean;
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
        console.warn('Infected files detected:', infectedFiles.map(({ file, result }) => ({
          filename: file.originalname,
          virus: result.virus,
        })));

        // Delete infected files
        if (deleteOnInfection) {
          infectedFiles.forEach(({ file }) => {
            if (file.path && fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
                console.log(`Deleted infected file: ${file.path}`);
              } catch (error) {
                console.error(`Failed to delete infected file: ${file.path}`, error);
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
        console.error('Scan errors detected:', errorFiles.map(({ file, result }) => ({
          filename: file.originalname,
          error: result.error,
        })));

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
      console.error('Virus scan middleware error:', error);

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
