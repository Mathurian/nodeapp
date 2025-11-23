/**
 * Backup Transfer Service
 * Handles uploading backups to various cloud storage providers
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';
import SftpClient from 'ssh2-sftp-client';
import { Client as FtpClient } from 'basic-ftp';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { createReadStream } from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('BackupTransferService');

// Config types for each backup target type
export interface LocalBackupConfig {
  path: string;
}

export interface S3BackupConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  prefix?: string;
}

export interface FTPBackupConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  remotePath?: string;
}

export interface SFTPBackupConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  remotePath?: string;
}

export interface AzureBackupConfig {
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
  containerName: string;
  prefix?: string;
}

export interface GCPBackupConfig {
  projectId: string;
  keyFilename?: string;
  bucketName: string;
  prefix?: string;
}

export type BackupTargetConfig = 
  | LocalBackupConfig 
  | S3BackupConfig 
  | FTPBackupConfig 
  | SFTPBackupConfig 
  | AzureBackupConfig 
  | GCPBackupConfig;

export interface BackupTarget {
  id: string;
  name: string;
  type: 'local' | 's3' | 'ftp' | 'sftp' | 'azure' | 'gcp';
  config: BackupTargetConfig;
  enabled: boolean;
  priority: number;
}

export interface TransferResult {
  success: boolean;
  targetId: string;
  targetName: string;
  remotePath?: string;
  size?: number;
  duration?: number;
  error?: string;
  checksum?: string;
}

/**
 * Backup Transfer Service
 */
export class BackupTransferService {
  /**
   * Upload backup to target
   */
  static async uploadToTarget(
    filepath: string,
    target: BackupTarget
  ): Promise<TransferResult> {
    const startTime = Date.now();

    try {
      logger.info(`Uploading backup to ${target.name} (${target.type})`);

      // Calculate checksum
      const checksum = await this.calculateChecksum(filepath);
      const stats = await fs.stat(filepath);
      const fileSize = stats.size;

      let result: TransferResult;

      switch (target.type) {
        case 'local':
          result = await this.uploadToLocal(filepath, target, checksum);
          break;
        case 's3':
          result = await this.uploadToS3(filepath, target, checksum);
          break;
        case 'ftp':
          result = await this.uploadToFTP(filepath, target);
          break;
        case 'sftp':
          result = await this.uploadToSFTP(filepath, target);
          break;
        case 'azure':
          result = await this.uploadToAzure(filepath, target, checksum);
          break;
        case 'gcp':
          result = await this.uploadToGCP(filepath, target, checksum);
          break;
        default:
          throw new Error(`Unsupported target type: ${target.type}`);
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);

      logger.info(
        `Successfully uploaded to ${target.name}: ${result.remotePath} (${fileSize} bytes, ${duration}s)`
      );

      return {
        ...result,
        size: fileSize,
        duration,
        checksum
      };
    } catch (error: unknown) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to upload to ${target.name}:`, { error: errorMessage });

      return {
        success: false,
        targetId: target.id,
        targetName: target.name,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Upload to local directory
   */
  private static async uploadToLocal(
    filepath: string,
    target: BackupTarget,
    checksum: string
  ): Promise<TransferResult> {
    const config = target.config as LocalBackupConfig;
    const { path: destDir } = config;

    // Ensure destination directory exists
    await fs.mkdir(destDir, { recursive: true });

    // Copy file
    const filename = filepath.split('/').pop()!;
    const destPath = `${destDir}/${filename}`;
    await fs.copyFile(filepath, destPath);

    // Verify checksum
    const destChecksum = await this.calculateChecksum(destPath);
    if (destChecksum !== checksum) {
      throw new Error('Checksum mismatch after upload');
    }

    return {
      success: true,
      targetId: target.id,
      targetName: target.name,
      remotePath: destPath
    };
  }

  /**
   * Upload to AWS S3
   */
  private static async uploadToS3(
    filepath: string,
    target: BackupTarget,
    checksum: string
  ): Promise<TransferResult> {
    const config = target.config as S3BackupConfig;
    const { accessKeyId, secretAccessKey, region, bucket, prefix = '' } = config;

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    const filename = filepath.split('/').pop()!;
    const key = prefix ? `${prefix}/${filename}` : filename;

    // Read file
    const fileBuffer = await fs.readFile(filepath);

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      Metadata: {
        checksum,
        uploadedAt: new Date().toISOString()
      }
    });

    await s3Client.send(uploadCommand);

    // Verify upload
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const headResult = await s3Client.send(headCommand);

    if (headResult.ContentLength !== fileBuffer.length) {
      throw new Error('Size mismatch after upload');
    }

    return {
      success: true,
      targetId: target.id,
      targetName: target.name,
      remotePath: `s3://${bucket}/${key}`
    };
  }

  /**
   * Upload via FTP
   */
  private static async uploadToFTP(
    filepath: string,
    target: BackupTarget,
    // checksum: string
  ): Promise<TransferResult> {
    const config = target.config as FTPBackupConfig;
    const { host, port = 21, user, password, remotePath = '/' } = config;

    const client = new FtpClient();
    client.ftp.verbose = false;

    try {
      // Connect to FTP server
      await client.access({
        host,
        port,
        user,
        password,
        secure: false
      });

      // Ensure remote directory exists
      try {
        await client.ensureDir(remotePath);
      } catch {
        // Directory might already exist
      }

      // Upload file
      const filename = filepath.split('/').pop()!;
      const remoteFilePath = `${remotePath}/${filename}`;

      await client.uploadFrom(filepath, remoteFilePath);

      // Verify upload
      const size = await client.size(remoteFilePath);
      const localStats = await fs.stat(filepath);

      if (size !== localStats.size) {
        throw new Error('Size mismatch after upload');
      }

      return {
        success: true,
        targetId: target.id,
        targetName: target.name,
        remotePath: `ftp://${host}${remoteFilePath}`
      };
    } finally {
      client.close();
    }
  }

  /**
   * Upload via SFTP
   */
  private static async uploadToSFTP(
    filepath: string,
    target: BackupTarget,
    // checksum: string
  ): Promise<TransferResult> {
    const config = target.config as SFTPBackupConfig;
    const {
      host,
      port = 22,
      username,
      password,
      privateKey,
      remotePath = '/'
    } = config;

    const client = new SftpClient();

    try {
      // Connect to SFTP server
      const connectConfig: {
        host: string;
        port: number;
        username: string;
        password?: string;
        privateKey?: string;
      } = {
        host,
        port,
        username
      };

      if (privateKey) {
        connectConfig.privateKey = privateKey;
      } else {
        connectConfig.password = password;
      }

      await client.connect(connectConfig);

      // Ensure remote directory exists
      try {
        await client.mkdir(remotePath, true);
      } catch {
        // Directory might already exist
      }

      // Upload file
      const filename = filepath.split('/').pop()!;
      const remoteFilePath = `${remotePath}/${filename}`;

      await client.put(filepath, remoteFilePath);

      // Verify upload
      const fileInfo = await client.stat(remoteFilePath);
      const localStats = await fs.stat(filepath);

      if (fileInfo.size !== localStats.size) {
        throw new Error('Size mismatch after upload');
      }

      return {
        success: true,
        targetId: target.id,
        targetName: target.name,
        remotePath: `sftp://${host}${remoteFilePath}`
      };
    } finally {
      await client.end();
    }
  }

  /**
   * Upload to Azure Blob Storage
   */
  private static async uploadToAzure(
    filepath: string,
    target: BackupTarget,
    checksum: string
  ): Promise<TransferResult> {
    const config = target.config as AzureBackupConfig;
    const {
      connectionString,
      accountName,
      accountKey,
      containerName,
      prefix = ''
    } = config;

    let blobServiceClient: BlobServiceClient;

    if (connectionString) {
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      const connString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
      blobServiceClient = BlobServiceClient.fromConnectionString(connString);
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists
    await containerClient.createIfNotExists();

    const filename = filepath.split('/').pop()!;
    const blobName = prefix ? `${prefix}/${filename}` : filename;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file
    const fileBuffer = await fs.readFile(filepath);
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      metadata: {
        checksum,
        uploadedAt: new Date().toISOString()
      }
    });

    // Verify upload
    const properties = await blockBlobClient.getProperties();

    if (properties.contentLength !== fileBuffer.length) {
      throw new Error('Size mismatch after upload');
    }

    return {
      success: true,
      targetId: target.id,
      targetName: target.name,
      remotePath: blockBlobClient.url
    };
  }

  /**
   * Upload to Google Cloud Storage
   */
  private static async uploadToGCP(
    filepath: string,
    target: BackupTarget,
    checksum: string
  ): Promise<TransferResult> {
    const config = target.config as GCPBackupConfig;
    const {
      projectId,
      keyFilename,
      bucketName,
      prefix = ''
    } = config;

    const storage = new Storage({
      projectId,
      keyFilename
    });

    const bucket = storage.bucket(bucketName);

    const filename = filepath.split('/').pop()!;
    const destFileName = prefix ? `${prefix}/${filename}` : filename;

    // Upload file
    await bucket.upload(filepath, {
      destination: destFileName,
      metadata: {
        metadata: {
          checksum,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Verify upload
    const file = bucket.file(destFileName);
    const [metadata] = await file.getMetadata();
    const localStats = await fs.stat(filepath);

    const remoteSize = typeof metadata.size === 'string' ? parseInt(metadata.size) : metadata.size;
    if (remoteSize !== localStats.size) {
      throw new Error('Size mismatch after upload');
    }

    return {
      success: true,
      targetId: target.id,
      targetName: target.name,
      remotePath: `gs://${bucketName}/${destFileName}`
    };
  }

  /**
   * Calculate file checksum (SHA256)
   */
  private static async calculateChecksum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filepath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Test connection to backup target
   */
  static async testConnection(target: BackupTarget): Promise<boolean> {
    try {
      switch (target.type) {
        case 'local': {
          const localConfig = target.config as LocalBackupConfig;
          await fs.access(localConfig.path);
          return true;
        }

        case 's3': {
          const s3Config = target.config as S3BackupConfig;
          const s3Client = new S3Client({
            region: s3Config.region,
            credentials: {
              accessKeyId: s3Config.accessKeyId,
              secretAccessKey: s3Config.secretAccessKey
            }
          });
          // Try to list bucket (minimal operation)
          const headCommand = new HeadObjectCommand({
            Bucket: s3Config.bucket,
            Key: '.test'
          });
          try {
            await s3Client.send(headCommand);
          } catch (error: unknown) {
            // 404 is OK - means we can access the bucket
            if (error instanceof Error && 'name' in error && error.name === 'NotFound') return true;
            throw error;
          }
          return true;
        }

        case 'ftp': {
          const ftpConfig = target.config as FTPBackupConfig;
          const ftpClient = new FtpClient();
          try {
            await ftpClient.access({
              host: ftpConfig.host,
              port: ftpConfig.port || 21,
              user: ftpConfig.user,
              password: ftpConfig.password
            });
            return true;
          } finally {
            ftpClient.close();
          }
        }

        case 'sftp': {
          const sftpConfig = target.config as SFTPBackupConfig;
          const sftpClient = new SftpClient();
          try {
            await sftpClient.connect({
              host: sftpConfig.host,
              port: sftpConfig.port || 22,
              username: sftpConfig.username,
              password: sftpConfig.password
            });
            return true;
          } finally {
            await sftpClient.end();
          }
        }

        case 'azure': {
          const azureConfig = target.config as AzureBackupConfig;
          const blobServiceClient = azureConfig.connectionString
            ? BlobServiceClient.fromConnectionString(azureConfig.connectionString)
            : BlobServiceClient.fromConnectionString(
                `DefaultEndpointsProtocol=https;AccountName=${azureConfig.accountName};AccountKey=${azureConfig.accountKey};EndpointSuffix=core.windows.net`
              );
          const containerClient = blobServiceClient.getContainerClient(
            azureConfig.containerName
          );
          await containerClient.exists();
          return true;
        }

        case 'gcp': {
          const gcpConfig = target.config as GCPBackupConfig;
          const storage = new Storage({
            projectId: gcpConfig.projectId,
            keyFilename: gcpConfig.keyFilename
          });
          const bucket = storage.bucket(gcpConfig.bucketName);
          const [exists] = await bucket.exists();
          return exists;
        }

        default:
          throw new Error(`Unsupported target type: ${target.type}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Connection test failed for ${target.name}:`, { error: errorMessage });
      return false;
    }
  }
}

export default BackupTransferService;
