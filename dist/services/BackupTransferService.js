"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupTransferService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const storage_blob_1 = require("@azure/storage-blob");
const storage_1 = require("@google-cloud/storage");
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const basic_ftp_1 = require("basic-ftp");
const fs = __importStar(require("fs/promises"));
const crypto = __importStar(require("crypto"));
const fs_1 = require("fs");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('BackupTransferService');
class BackupTransferService {
    static async uploadToTarget(filepath, target) {
        const startTime = Date.now();
        try {
            logger.info(`Uploading backup to ${target.name} (${target.type})`);
            const checksum = await this.calculateChecksum(filepath);
            const stats = await fs.stat(filepath);
            const fileSize = stats.size;
            let result;
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
            logger.info(`Successfully uploaded to ${target.name}: ${result.remotePath} (${fileSize} bytes, ${duration}s)`);
            return {
                ...result,
                size: fileSize,
                duration,
                checksum
            };
        }
        catch (error) {
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
    static async uploadToLocal(filepath, target, checksum) {
        const { path: destDir } = target.config;
        await fs.mkdir(destDir, { recursive: true });
        const filename = filepath.split('/').pop();
        const destPath = `${destDir}/${filename}`;
        await fs.copyFile(filepath, destPath);
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
    static async uploadToS3(filepath, target, checksum) {
        const { accessKeyId, secretAccessKey, region, bucket, prefix = '' } = target.config;
        const s3Client = new client_s3_1.S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
        const filename = filepath.split('/').pop();
        const key = prefix ? `${prefix}/${filename}` : filename;
        const fileBuffer = await fs.readFile(filepath);
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileBuffer,
            Metadata: {
                checksum,
                uploadedAt: new Date().toISOString()
            }
        });
        await s3Client.send(uploadCommand);
        const headCommand = new client_s3_1.HeadObjectCommand({
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
    static async uploadToFTP(filepath, target) {
        const { host, port = 21, user, password, remotePath = '/' } = target.config;
        const client = new basic_ftp_1.Client();
        client.ftp.verbose = false;
        try {
            await client.access({
                host,
                port,
                user,
                password,
                secure: false
            });
            try {
                await client.ensureDir(remotePath);
            }
            catch {
            }
            const filename = filepath.split('/').pop();
            const remoteFilePath = `${remotePath}/${filename}`;
            await client.uploadFrom(filepath, remoteFilePath);
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
        }
        finally {
            client.close();
        }
    }
    static async uploadToSFTP(filepath, target) {
        const { host, port = 22, username, password, privateKey, remotePath = '/' } = target.config;
        const client = new ssh2_sftp_client_1.default();
        try {
            const connectConfig = {
                host,
                port,
                username
            };
            if (privateKey) {
                connectConfig.privateKey = privateKey;
            }
            else {
                connectConfig.password = password;
            }
            await client.connect(connectConfig);
            try {
                await client.mkdir(remotePath, true);
            }
            catch {
            }
            const filename = filepath.split('/').pop();
            const remoteFilePath = `${remotePath}/${filename}`;
            await client.put(filepath, remoteFilePath);
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
        }
        finally {
            await client.end();
        }
    }
    static async uploadToAzure(filepath, target, checksum) {
        const { connectionString, accountName, accountKey, containerName, prefix = '' } = target.config;
        let blobServiceClient;
        if (connectionString) {
            blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        }
        else {
            const connString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
            blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connString);
        }
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();
        const filename = filepath.split('/').pop();
        const blobName = prefix ? `${prefix}/${filename}` : filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const fileBuffer = await fs.readFile(filepath);
        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
            metadata: {
                checksum,
                uploadedAt: new Date().toISOString()
            }
        });
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
    static async uploadToGCP(filepath, target, checksum) {
        const { projectId, keyFilename, bucketName, prefix = '' } = target.config;
        const storage = new storage_1.Storage({
            projectId,
            keyFilename
        });
        const bucket = storage.bucket(bucketName);
        const filename = filepath.split('/').pop();
        const destFileName = prefix ? `${prefix}/${filename}` : filename;
        await bucket.upload(filepath, {
            destination: destFileName,
            metadata: {
                metadata: {
                    checksum,
                    uploadedAt: new Date().toISOString()
                }
            }
        });
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
    static async calculateChecksum(filepath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = (0, fs_1.createReadStream)(filepath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    static async testConnection(target) {
        try {
            switch (target.type) {
                case 'local':
                    await fs.access(target.config.path);
                    return true;
                case 's3':
                    const s3Client = new client_s3_1.S3Client({
                        region: target.config.region,
                        credentials: {
                            accessKeyId: target.config.accessKeyId,
                            secretAccessKey: target.config.secretAccessKey
                        }
                    });
                    const headCommand = new client_s3_1.HeadObjectCommand({
                        Bucket: target.config.bucket,
                        Key: '.test'
                    });
                    try {
                        await s3Client.send(headCommand);
                    }
                    catch (error) {
                        if (error.name === 'NotFound')
                            return true;
                        throw error;
                    }
                    return true;
                case 'ftp':
                    const ftpClient = new basic_ftp_1.Client();
                    try {
                        await ftpClient.access({
                            host: target.config.host,
                            port: target.config.port || 21,
                            user: target.config.user,
                            password: target.config.password
                        });
                        return true;
                    }
                    finally {
                        ftpClient.close();
                    }
                case 'sftp':
                    const sftpClient = new ssh2_sftp_client_1.default();
                    try {
                        await sftpClient.connect({
                            host: target.config.host,
                            port: target.config.port || 22,
                            username: target.config.username,
                            password: target.config.password
                        });
                        return true;
                    }
                    finally {
                        await sftpClient.end();
                    }
                case 'azure':
                    const blobServiceClient = target.config.connectionString
                        ? storage_blob_1.BlobServiceClient.fromConnectionString(target.config.connectionString)
                        : storage_blob_1.BlobServiceClient.fromConnectionString(`DefaultEndpointsProtocol=https;AccountName=${target.config.accountName};AccountKey=${target.config.accountKey};EndpointSuffix=core.windows.net`);
                    const containerClient = blobServiceClient.getContainerClient(target.config.containerName);
                    await containerClient.exists();
                    return true;
                case 'gcp':
                    const storage = new storage_1.Storage({
                        projectId: target.config.projectId,
                        keyFilename: target.config.keyFilename
                    });
                    const bucket = storage.bucket(target.config.bucketName);
                    const [exists] = await bucket.exists();
                    return exists;
                default:
                    throw new Error(`Unsupported target type: ${target.type}`);
            }
        }
        catch (error) {
            logger.error(`Connection test failed for ${target.name}:`, error);
            return false;
        }
    }
}
exports.BackupTransferService = BackupTransferService;
exports.default = BackupTransferService;
//# sourceMappingURL=BackupTransferService.js.map