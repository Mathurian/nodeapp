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

export interface BackupTarget {
  id: string;
  name: string;
  type: 'local' | 's3' | 'ftp' | 'sftp' | 'azure' | 'gcp';
  config: any;
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
          result = await this.uploadToFTP(filepath, target, checksum);
          break;
        case 'sftp':
          result = await this.uploadToSFTP(filepath, target, checksum);
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
    } catch (error: any) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      logger.error(`Failed to upload to ${target.name}:`, error);

      return {
        success: false,
        targetId: target.id,
        targetName: target.name,
        duration,
        error: error.message
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
    const { path: destDir } = target.config;

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
    const { accessKeyId, secretAccessKey, region, bucket, prefix = '' } = target.config;

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
    checksum: string
  ): Promise<TransferResult> {
    const { host, port = 21, user, password, remotePath = '/' } = target.config;

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
    checksum: string
  ): Promise<TransferResult> {
    const {
      host,
      port = 22,
      username,
      password,
      privateKey,
      remotePath = '/'
    } = target.config;

    const client = new SftpClient();

    try {
      // Connect to SFTP server
      const connectConfig: any = {
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
    const {
      connectionString,
      accountName,
      accountKey,
      containerName,
      prefix = ''
    } = target.config;

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
    const {
      projectId,
      keyFilename,
      bucketName,
      prefix = ''
    } = target.config;

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
        case 'local':
          await fs.access(target.config.path);
          return true;

        case 's3':
          const s3Client = new S3Client({
            region: target.config.region,
            credentials: {
              accessKeyId: target.config.accessKeyId,
              secretAccessKey: target.config.secretAccessKey
            }
          });
          // Try to list bucket (minimal operation)
          const headCommand = new HeadObjectCommand({
            Bucket: target.config.bucket,
            Key: '.test'
          });
          try {
            await s3Client.send(headCommand);
          } catch (error: any) {
            // 404 is OK - means we can access the bucket
            if (error.name === 'NotFound') return true;
            throw error;
          }
          return true;

        case 'ftp':
          const ftpClient = new FtpClient();
          try {
            await ftpClient.access({
              host: target.config.host,
              port: target.config.port || 21,
              user: target.config.user,
              password: target.config.password
            });
            return true;
          } finally {
            ftpClient.close();
          }

        case 'sftp':
          const sftpClient = new SftpClient();
          try {
            await sftpClient.connect({
              host: target.config.host,
              port: target.config.port || 22,
              username: target.config.username,
              password: target.config.password
            });
            return true;
          } finally {
            await sftpClient.end();
          }

        case 'azure':
          const blobServiceClient = target.config.connectionString
            ? BlobServiceClient.fromConnectionString(target.config.connectionString)
            : BlobServiceClient.fromConnectionString(
                `DefaultEndpointsProtocol=https;AccountName=${target.config.accountName};AccountKey=${target.config.accountKey};EndpointSuffix=core.windows.net`
              );
          const containerClient = blobServiceClient.getContainerClient(
            target.config.containerName
          );
          await containerClient.exists();
          return true;

        case 'gcp':
          const storage = new Storage({
            projectId: target.config.projectId,
            keyFilename: target.config.keyFilename
          });
          const bucket = storage.bucket(target.config.bucketName);
          const [exists] = await bucket.exists();
          return exists;

        default:
          throw new Error(`Unsupported target type: ${target.type}`);
      }
    } catch (error: any) {
      logger.error(`Connection test failed for ${target.name}:`, error);
      return false;
    }
  }
}

export default BackupTransferService;
