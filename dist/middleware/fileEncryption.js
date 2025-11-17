"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureDeleteFile = exports.verifyFileIntegrity = exports.decryptMetadata = exports.encryptMetadata = exports.verifyPassword = exports.hashPassword = exports.generateSecurePassword = exports.decryptAndRetrieveFile = exports.encryptAndStoreFile = exports.decryptFile = exports.encryptFile = void 0;
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const generateKey = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
};
const generateSalt = () => {
    return crypto.randomBytes(16);
};
const encryptFile = async (filePath, password) => {
    try {
        const fileContent = await fs.readFile(filePath);
        const salt = generateSalt();
        const key = generateKey(password, salt);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
        cipher.setAAD(salt);
        let encrypted = cipher.update(fileContent);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const tag = cipher.getAuthTag();
        const encryptedData = Buffer.concat([salt, iv, tag, encrypted]);
        return encryptedData;
    }
    catch (error) {
        console.error('File encryption error:', error);
        throw new Error('Failed to encrypt file');
    }
};
exports.encryptFile = encryptFile;
const decryptFile = async (encryptedData, password) => {
    try {
        const salt = encryptedData.slice(0, 16);
        const tag = encryptedData.slice(32, 48);
        const encrypted = encryptedData.slice(48);
        const key = generateKey(password, salt);
        const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
        decipher.setAAD(salt);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted;
    }
    catch (error) {
        console.error('File decryption error:', error);
        throw new Error('Failed to decrypt file');
    }
};
exports.decryptFile = decryptFile;
const encryptAndStoreFile = async (originalPath, encryptedPath, password) => {
    try {
        const encryptedData = await encryptFile(originalPath, password);
        const secureDir = path.dirname(encryptedPath);
        await fs.mkdir(secureDir, { recursive: true, mode: 0o700 });
        await fs.writeFile(encryptedPath, encryptedData, { mode: 0o600 });
        await fs.unlink(originalPath);
        return {
            success: true,
            encryptedPath,
            originalSize: (await fs.stat(originalPath)).size,
            encryptedSize: encryptedData.length
        };
    }
    catch (error) {
        console.error('Encrypt and store error:', error);
        throw new Error('Failed to encrypt and store file');
    }
};
exports.encryptAndStoreFile = encryptAndStoreFile;
const decryptAndRetrieveFile = async (encryptedPath, outputPath, password) => {
    try {
        const encryptedData = await fs.readFile(encryptedPath);
        const decryptedData = await decryptFile(encryptedData, password);
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true, mode: 0o755 });
        await fs.writeFile(outputPath, decryptedData, { mode: 0o644 });
        return {
            success: true,
            outputPath,
            size: decryptedData.length
        };
    }
    catch (error) {
        console.error('Decrypt and retrieve error:', error);
        throw new Error('Failed to decrypt and retrieve file');
    }
};
exports.decryptAndRetrieveFile = decryptAndRetrieveFile;
const generateSecurePassword = () => {
    return crypto.randomBytes(32).toString('hex');
};
exports.generateSecurePassword = generateSecurePassword;
const hashPassword = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
};
exports.hashPassword = hashPassword;
const verifyPassword = (password, hash, salt) => {
    const hashedPassword = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hashedPassword === hash;
};
exports.verifyPassword = verifyPassword;
const encryptMetadata = (metadata, password) => {
    try {
        const salt = generateSalt();
        const key = generateKey(password, salt);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
        cipher.setAAD(salt);
        const metadataString = JSON.stringify(metadata);
        let encrypted = cipher.update(metadataString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
    }
    catch (error) {
        console.error('Metadata encryption error:', error);
        throw new Error('Failed to encrypt metadata');
    }
};
exports.encryptMetadata = encryptMetadata;
const decryptMetadata = (encryptedMetadata, password) => {
    try {
        const encryptedData = Buffer.from(encryptedMetadata, 'base64');
        const salt = encryptedData.slice(0, 16);
        const tag = encryptedData.slice(32, 48);
        const encrypted = encryptedData.slice(48);
        const key = generateKey(password, salt);
        const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
        decipher.setAAD(salt);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString('utf8'));
    }
    catch (error) {
        console.error('Metadata decryption error:', error);
        throw new Error('Failed to decrypt metadata');
    }
};
exports.decryptMetadata = decryptMetadata;
const verifyFileIntegrity = async (filePath, expectedChecksum) => {
    try {
        const fileContent = await fs.readFile(filePath);
        const actualChecksum = crypto.createHash('sha256').update(fileContent).digest('hex');
        return actualChecksum === expectedChecksum;
    }
    catch (error) {
        console.error('File integrity verification error:', error);
        return false;
    }
};
exports.verifyFileIntegrity = verifyFileIntegrity;
const secureDeleteFile = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        const fileSize = stats.size;
        for (let i = 0; i < 3; i++) {
            const randomData = crypto.randomBytes(fileSize);
            await fs.writeFile(filePath, randomData);
        }
        await fs.unlink(filePath);
        return { success: true };
    }
    catch (error) {
        console.error('Secure delete error:', error);
        throw new Error('Failed to securely delete file');
    }
};
exports.secureDeleteFile = secureDeleteFile;
//# sourceMappingURL=fileEncryption.js.map