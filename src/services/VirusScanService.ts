/**
 * Virus Scan Service
 * Service for scanning files with ClamAV antivirus
 */

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import * as crypto from 'crypto';
import { container } from 'tsyringe';
import {
  getVirusScanConfig,
  ScanStatus,
  ScanResult,
  VirusScanConfig,
} from '../config/virus-scan.config';
import { createLogger } from '../utils/logger';

const logger = createLogger('VirusScanService');

export class VirusScanService {
  private config: VirusScanConfig;
  private scanCache: Map<string, ScanResult>;
  private cacheTimeout: number = 3600000; // 1 hour

  constructor() {
    this.config = getVirusScanConfig();
    this.scanCache = new Map();

    // Ensure quarantine directory exists
    if (!fs.existsSync(this.config.quarantinePath)) {
      fs.mkdirSync(this.config.quarantinePath, { recursive: true });
    }
  }

  /**
   * Check if ClamAV is available
   */
  public async isAvailable(): Promise<boolean> {
    // If disabled, return false
    if (!this.config.enabled || this.config.mode === 'disabled') {
      return false;
    }

    return new Promise((resolve) => {
      let socket: net.Socket;

      // Connect via Unix socket or TCP
      if (this.config.mode === 'native-socket' && this.config.socketPath) {
        socket = net.createConnection(this.config.socketPath);
      } else {
        socket = net.createConnection(this.config.port, this.config.host);
      }

      socket.setTimeout(5000);

      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Get connection info for logging
   */
  private getConnectionInfo(): string {
    if (this.config.mode === 'native-socket' && this.config.socketPath) {
      return `Unix socket: ${this.config.socketPath}`;
    }
    return `TCP: ${this.config.host}:${this.config.port}`;
  }

  /**
   * Scan file from path
   */
  public async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = Date.now();

    try {
      // Check if scanning is enabled
      if (!this.config.enabled) {
        return {
          status: ScanStatus.SKIPPED,
          file: filePath,
          size: fs.statSync(filePath).size,
          scannedAt: new Date(),
          duration: Date.now() - startTime,
        };
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          status: ScanStatus.ERROR,
          file: filePath,
          size: 0,
          scannedAt: new Date(),
          duration: Date.now() - startTime,
          error: 'File not found',
        };
      }

      const stats = fs.statSync(filePath);

      // Check file size
      if (stats.size > this.config.maxFileSize) {
        return {
          status: ScanStatus.TOO_LARGE,
          file: filePath,
          size: stats.size,
          scannedAt: new Date(),
          duration: Date.now() - startTime,
          error: `File exceeds maximum scan size of ${this.config.maxFileSize} bytes`,
        };
      }

      // Check cache
      const cacheKey = await this.generateFileHash(filePath);
      const cached = this.scanCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        logger.debug(`Using cached scan result for ${filePath}`);
        return cached;
      }

      // Check if ClamAV is available
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('ClamAV is not available');
        if (this.config.fallbackBehavior === 'allow') {
          return {
            status: ScanStatus.SKIPPED,
            file: filePath,
            size: stats.size,
            scannedAt: new Date(),
            duration: Date.now() - startTime,
            error: 'ClamAV unavailable - file allowed by fallback policy',
          };
        } else {
          return {
            status: ScanStatus.ERROR,
            file: filePath,
            size: stats.size,
            scannedAt: new Date(),
            duration: Date.now() - startTime,
            error: 'ClamAV unavailable - file rejected by fallback policy',
          };
        }
      }

      // Perform scan
      const scanResult = await this.performScan(filePath);
      scanResult.duration = Date.now() - startTime;

      // Cache result
      this.scanCache.set(cacheKey, scanResult);

      // Handle infected files
      if (scanResult.status === ScanStatus.INFECTED) {
        await this.handleInfectedFile(filePath, scanResult);
      }

      return scanResult;
    } catch (error) {
      logger.error('Virus scan error', { error });
      return {
        status: ScanStatus.ERROR,
        file: filePath,
        size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
        scannedAt: new Date(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Scan buffer
   */
  public async scanBuffer(buffer: Buffer, filename: string = 'buffer'): Promise<ScanResult> {
    const startTime = Date.now();

    try {
      // Check if scanning is enabled
      if (!this.config.enabled) {
        return {
          status: ScanStatus.SKIPPED,
          file: filename,
          size: buffer.length,
          scannedAt: new Date(),
          duration: Date.now() - startTime,
        };
      }

      // Check buffer size
      if (buffer.length > this.config.maxFileSize) {
        return {
          status: ScanStatus.TOO_LARGE,
          file: filename,
          size: buffer.length,
          scannedAt: new Date(),
          duration: Date.now() - startTime,
          error: `Buffer exceeds maximum scan size of ${this.config.maxFileSize} bytes`,
        };
      }

      // Check if ClamAV is available
      const available = await this.isAvailable();
      if (!available) {
        if (this.config.fallbackBehavior === 'allow') {
          return {
            status: ScanStatus.SKIPPED,
            file: filename,
            size: buffer.length,
            scannedAt: new Date(),
            duration: Date.now() - startTime,
            error: 'ClamAV unavailable - buffer allowed by fallback policy',
          };
        } else {
          return {
            status: ScanStatus.ERROR,
            file: filename,
            size: buffer.length,
            scannedAt: new Date(),
            duration: Date.now() - startTime,
            error: 'ClamAV unavailable - buffer rejected by fallback policy',
          };
        }
      }

      // Perform scan
      const scanResult = await this.performBufferScan(buffer, filename);
      scanResult.duration = Date.now() - startTime;

      return scanResult;
    } catch (error) {
      logger.error('Virus scan buffer error', { error });
      return {
        status: ScanStatus.ERROR,
        file: filename,
        size: buffer.length,
        scannedAt: new Date(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Perform actual scan using ClamAV
   */
  private performScan(filePath: string): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const stats = fs.statSync(filePath);
      let socket: net.Socket;

      // Connect via Unix socket or TCP
      if (this.config.mode === 'native-socket' && this.config.socketPath) {
        socket = net.createConnection(this.config.socketPath);
        logger.debug(`Scanning file via Unix socket: ${this.config.socketPath}`);
      } else {
        socket = net.createConnection(this.config.port, this.config.host);
        logger.debug(`Scanning file via TCP: ${this.config.host}:${this.config.port}`);
      }

      socket.setTimeout(this.config.timeout);

      let response = '';

      socket.on('connect', () => {
        // Use SCAN command with file path
        socket.write(`SCAN ${filePath}\n`);
      });

      socket.on('data', (data) => {
        response += data.toString();
      });

      socket.on('end', () => {
        const result = this.parseResponse(response, filePath, stats.size);
        resolve(result);
      });

      socket.on('error', (error) => {
        reject(error);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Scan timeout'));
      });
    });
  }

  /**
   * Perform scan on buffer using INSTREAM command
   */
  private performBufferScan(buffer: Buffer, filename: string): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      let socket: net.Socket;

      // Connect via Unix socket or TCP
      if (this.config.mode === 'native-socket' && this.config.socketPath) {
        socket = net.createConnection(this.config.socketPath);
      } else {
        socket = net.createConnection(this.config.port, this.config.host);
      }

      socket.setTimeout(this.config.timeout);

      let response = '';

      socket.on('connect', () => {
        // Use INSTREAM command for scanning buffers
        socket.write('nINSTREAM\n');

        // Send buffer in chunks
        const chunkSize = 2048;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length, 0);
          socket.write(size);
          socket.write(chunk);
        }

        // Send terminator (0 length chunk)
        const terminator = Buffer.alloc(4);
        terminator.writeUInt32BE(0, 0);
        socket.write(terminator);
      });

      socket.on('data', (data) => {
        response += data.toString();
      });

      socket.on('end', () => {
        const result = this.parseResponse(response, filename, buffer.length);
        resolve(result);
      });

      socket.on('error', (error) => {
        reject(error);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Scan timeout'));
      });
    });
  }

  /**
   * Get service statistics
   */
  public getServiceInfo() {
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      connection: this.getConnectionInfo(),
      cacheSize: this.scanCache.size,
      config: {
        maxFileSize: this.config.maxFileSize,
        scanOnUpload: this.config.scanOnUpload,
        removeInfected: this.config.removeInfected,
        fallbackBehavior: this.config.fallbackBehavior,
      },
    };
  }

  /**
   * Parse ClamAV response
   */
  private parseResponse(response: string, filename: string, size: number): ScanResult {
    const result: ScanResult = {
      status: ScanStatus.CLEAN,
      file: filename,
      size,
      scannedAt: new Date(),
      duration: 0,
    };

    if (response.includes('FOUND')) {
      result.status = ScanStatus.INFECTED;
      // Extract virus name
      const match = response.match(/:\s*(.+?)\s+FOUND/);
      if (match) {
        result.virus = match[1];
      }
    } else if (response.includes('ERROR')) {
      result.status = ScanStatus.ERROR;
      result.error = response;
    } else if (response.includes('OK')) {
      result.status = ScanStatus.CLEAN;
    }

    return result;
  }

  /**
   * Handle infected file
   */
  private async handleInfectedFile(filePath: string, scanResult: ScanResult): Promise<void> {
    try {
      logger.warn(`Infected file detected: ${filePath}`, { scanResult });

      // Move to quarantine
      const quarantineFile = await this.quarantineFile(filePath, scanResult);
      logger.info(`File moved to quarantine`, { quarantineFile });

      // Remove original if configured
      if (this.config.removeInfected && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Original infected file removed`, { filePath });
      }

      // Notify if configured
      if (this.config.notifyOnInfection) {
        await this.notifyInfection(scanResult);
      }
    } catch (error) {
      logger.error('Error handling infected file', { error });
    }
  }

  /**
   * Move file to quarantine
   */
  private async quarantineFile(filePath: string, scanResult: ScanResult): Promise<string> {
    const timestamp = Date.now();
    const originalName = path.basename(filePath);
    const quarantineFileName = `${timestamp}_${originalName}`;
    const quarantinePath = path.join(this.config.quarantinePath, quarantineFileName);

    // Copy file to quarantine
    fs.copyFileSync(filePath, quarantinePath);

    // Save metadata
    const metadataPath = `${quarantinePath}.json`;
    fs.writeFileSync(metadataPath, JSON.stringify({
      originalPath: filePath,
      scanResult,
      quarantinedAt: new Date().toISOString(),
    }, null, 2));

    return quarantinePath;
  }

  /**
   * Notify about infection
   * Sends email alerts to security team and creates in-app notifications for admins
   */
  private async notifyInfection(scanResult: ScanResult): Promise<void> {
    try {
      // Dynamically import services to avoid circular dependencies
      const { EmailService } = await import('./EmailService');
      const { NotificationService } = await import('./NotificationService');

      // Send email to security team if configured
      const securityEmail = process.env['SECURITY_EMAIL'];
      if (securityEmail) {
        try {
          const emailService = container.resolve(EmailService);
          await emailService.send({
            to: securityEmail,
            subject: `[SECURITY ALERT] Virus Detected: ${scanResult.virus || 'Unknown'}`,
            template: 'virus-alert',
            data: {
              filename: scanResult.file,
              virus: scanResult.virus || 'Unknown Threat',
              size: scanResult.size,
              timestamp: scanResult.scannedAt.toISOString(),
              scanDuration: `${scanResult.duration}ms`,
            },
          });

          logger.info('Virus alert email sent to security team', {
            filename: scanResult.file,
            virus: scanResult.virus,
          });
        } catch (emailError) {
          logger.error('Failed to send virus alert email', { error: emailError });
          // Continue with other notifications
        }
      }

      // Create in-app notification for admins
      try {
        const notificationService = container.resolve(NotificationService);
        await notificationService.notifyAdmins({
          type: 'SYSTEM',
          title: 'Virus Detected',
          message: `Infected file blocked: ${scanResult.file}${scanResult.virus ? ` (${scanResult.virus})` : ''}`,
          metadata: JSON.stringify({
            filename: scanResult.file,
            virus: scanResult.virus,
            size: scanResult.size,
            scannedAt: scanResult.scannedAt,
          }),
        });

        logger.info('Virus detection notification created for admins', {
          filename: scanResult.file,
        });
      } catch (notifError) {
        logger.error('Failed to create admin notification', { error: notifError });
        // Continue - notification failure shouldn't stop the flow
      }

      logger.info('Virus infection notifications completed', {
        filename: scanResult.file,
        virus: scanResult.virus,
      });
    } catch (error) {
      logger.error('Failed to send virus infection notifications', {
        error,
        filename: scanResult.file,
      });
      // Don't throw - notification failure shouldn't stop the scanning flow
    }
  }

  /**
   * Generate file hash for caching
   */
  private async generateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(result: ScanResult): boolean {
    const age = Date.now() - result.scannedAt.getTime();
    return age < this.cacheTimeout;
  }

  /**
   * Clear scan cache
   */
  public clearCache(): void {
    this.scanCache.clear();
  }

  /**
   * Get scan statistics
   */
  public getStatistics() {
    return {
      cacheSize: this.scanCache.size,
      config: this.config,
    };
  }

  /**
   * List quarantined files
   */
  public listQuarantinedFiles(): string[] {
    if (!fs.existsSync(this.config.quarantinePath)) {
      return [];
    }

    return fs.readdirSync(this.config.quarantinePath)
      .filter(file => !file.endsWith('.json'));
  }

  /**
   * Get quarantined file metadata
   */
  public getQuarantineMetadata(filename: string): any {
    const metadataPath = path.join(this.config.quarantinePath, `${filename}.json`);

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  }

  /**
   * Delete quarantined file
   */
  public deleteQuarantinedFile(filename: string): boolean {
    try {
      const filePath = path.join(this.config.quarantinePath, filename);
      const metadataPath = `${filePath}.json`;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      return true;
    } catch (error) {
      logger.error('Error deleting quarantined file', { error });
      return false;
    }
  }
}

// Singleton instance
let virusScanServiceInstance: VirusScanService | null = null;

/**
 * Get singleton virus scan service instance
 */
export const getVirusScanService = (): VirusScanService => {
  if (!virusScanServiceInstance) {
    virusScanServiceInstance = new VirusScanService();
  }
  return virusScanServiceInstance;
};

export default VirusScanService;
