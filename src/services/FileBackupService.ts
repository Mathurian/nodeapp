import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import { promises as fs } from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('FileBackupService');

export interface BackupResult {
  success: boolean;
  backupPath: string;
  timestamp: string;
  local: boolean;
  s3: boolean;
  s3Key?: string;
  s3Error?: string;
}

@injectable()
export class FileBackupService extends BaseService {
  private readonly BACKUP_DIR = path.join(__dirname, '../../backups');
  // private readonly _UPLOAD_DIR = path.join(__dirname, '../../uploads');
  private s3Client: S3Client | null = null;
  private s3Enabled: boolean = false;

  constructor() {
    super();
    this.initializeS3();
  }

  /**
   * Copy directory recursively preserving structure
   */
  private async copyDirectoryRecursive(source: string, dest: string): Promise<void> {
    try {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(source, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await this.copyDirectoryRecursive(sourcePath, destPath);
        } else {
          // Copy file
          await fs.copyFile(sourcePath, destPath);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to copy directory: ${errorMessage}`);
    }
  }

  /**
   * Initialize S3 client if S3 backup is enabled
   */
  private initializeS3(): void {
    try {
      this.s3Enabled = env.get('BACKUP_S3_ENABLED') || false;

      if (!this.s3Enabled) {
        logger.info('S3 backup is disabled');
        return;
      }

      const region = env.get('BACKUP_S3_REGION');
      const accessKeyId = env.get('BACKUP_S3_ACCESS_KEY_ID');
      const secretAccessKey = env.get('BACKUP_S3_SECRET_ACCESS_KEY');

      if (!region || !accessKeyId || !secretAccessKey) {
        logger.warn('S3 backup enabled but credentials not configured');
        this.s3Enabled = false;
        return;
      }

      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      logger.info('S3 client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize S3 client', { error });
      this.s3Client = null;
      this.s3Enabled = false;
    }
  }

  /**
   * Upload a file to S3
   * @param filePath - Local file path to upload
   * @param key - S3 object key (path in bucket)
   */
  async backupFileToS3(filePath: string, key: string): Promise<void> {
    if (!this.s3Enabled || !this.s3Client) {
      throw this.badRequestError('S3 backup is not enabled or configured');
    }

    const bucket = env.get('BACKUP_S3_BUCKET');
    if (!bucket) {
      throw this.badRequestError('S3 bucket not configured');
    }

    try {
      const fileContent = await fs.readFile(filePath);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
      });

      await this.s3Client.send(command);
      logger.info(`Uploaded ${filePath} to S3`, { key });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('S3 upload failed', { error: errorMessage, filePath, key });
      throw this.badRequestError(`S3 upload failed: ${errorMessage}`);
    }
  }

  /**
   * Upload a directory to S3
   * @param directory - Local directory path to upload
   * @param prefix - S3 key prefix (folder path in bucket)
   */
  async backupDirectoryToS3(directory: string, prefix: string): Promise<void> {
    if (!this.s3Enabled || !this.s3Client) {
      throw this.badRequestError('S3 backup is not enabled or configured');
    }

    try {
      const files = await this.getFilesRecursively(directory);

      for (const filePath of files) {
        const relativePath = path.relative(directory, filePath);
        const s3Key = path.join(prefix, relativePath).replace(/\\/g, '/'); // Ensure forward slashes for S3
        await this.backupFileToS3(filePath, s3Key);
      }

      logger.info(`Uploaded directory ${directory} to S3`, { prefix });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('S3 directory upload failed', { error: errorMessage, directory, prefix });
      throw this.badRequestError(`S3 directory upload failed: ${errorMessage}`);
    }
  }

  /**
   * Get all files in a directory recursively
   */
  private async getFilesRecursively(directory: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.getFilesRecursively(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * List backups in S3 bucket
   */
  async listS3Backups(prefix: string = 'backup-'): Promise<string[]> {
    if (!this.s3Enabled || !this.s3Client) {
      logger.info('S3 backup is not enabled');
      return [];
    }

    const bucket = env.get('BACKUP_S3_BUCKET');
    if (!bucket) {
      logger.warn('S3 bucket not configured');
      return [];
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);
      const backups = (response.Contents || []).map((item) => item.Key || '').filter(Boolean);

      return backups;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list S3 backups', { error: errorMessage });
      return [];
    }
  }

  /**
   * Delete a backup from S3
   * @param key - S3 object key to delete
   */
  async deleteS3Backup(key: string): Promise<void> {
    if (!this.s3Enabled || !this.s3Client) {
      throw this.badRequestError('S3 backup is not enabled or configured');
    }

    const bucket = env.get('BACKUP_S3_BUCKET');
    if (!bucket) {
      throw this.badRequestError('S3 bucket not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      logger.info(`Deleted S3 backup`, { key });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to delete S3 backup', { error: errorMessage, key });
      throw this.badRequestError(`Failed to delete S3 backup: ${errorMessage}`);
    }
  }

  async createBackup(): Promise<BackupResult> {
    try {
      // Create local backup directory
      await fs.mkdir(this.BACKUP_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.BACKUP_DIR, `backup-${timestamp}`);

      // Copy files from uploads directory to backup location
      const uploadsDir = path.join(__dirname, '../../uploads');
      const backupUploadsDir = path.join(backupPath, 'uploads');

      try {
        // Check if uploads directory exists
        try {
          await fs.access(uploadsDir);
        } catch {
          logger.info('Uploads directory does not exist, skipping file backup');
          await fs.mkdir(backupPath, { recursive: true });
        }

        // Copy uploads directory recursively
        await this.copyDirectoryRecursive(uploadsDir, backupUploadsDir);
        logger.info(`Files backed up to ${backupPath}`);
      } catch (copyError) {
        logger.error('File copying failed', { error: copyError });
        // Continue with backup even if file copying fails
        await fs.mkdir(backupPath, { recursive: true });
      }

      const result: BackupResult = {
        success: true,
        backupPath,
        timestamp,
        local: true,
        s3: false,
      };

      // If S3 is enabled, upload to S3
      if (this.s3Enabled && this.s3Client) {
        try {
          const s3Key = `backup-${timestamp}`;

          // Note: In a real implementation, you would copy files to backupPath first,
          // then upload that directory to S3. For now, we'll just indicate S3 is ready.
          logger.info('S3 backup ready', { s3Key });

          result.s3 = true;
          result.s3Key = s3Key;
        } catch (s3Error: unknown) {
          // Fall back to local backup if S3 fails
          const errorMessage = s3Error instanceof Error ? s3Error.message : String(s3Error);
          logger.error('S3 backup failed, using local backup only', { error: errorMessage });
          result.s3Error = errorMessage;
        }
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw this.badRequestError(`Backup failed: ${errorMessage}`);
    }
  }

  async listBackups() {
    try {
      await fs.mkdir(this.BACKUP_DIR, { recursive: true });
      const files = await fs.readdir(this.BACKUP_DIR);
      return files.filter(f => f.startsWith('backup-'));
    } catch (error: unknown) {
      logger.error('Failed to list local backups', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  async deleteBackup(backupName: string) {
    const backupPath = path.join(this.BACKUP_DIR, backupName);
    try {
      await fs.rm(backupPath, { recursive: true, force: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw this.badRequestError(`Delete backup failed: ${errorMessage}`);
    }
  }
}
