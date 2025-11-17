const crypto = require('crypto')
const fs = require('fs').promises
const path = require('path')

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits

// Generate encryption key from password
const generateKey = (password: string, salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
};

// Generate random salt
const generateSalt = () => {
  return crypto.randomBytes(16)
}

// Encrypt file content
const encryptFile = async (filePath: string, password: string): Promise<Buffer> => {
  try {
    // Read file content
    const fileContent = await fs.readFile(filePath)
    
    // Generate salt and key
    const salt = generateSalt()
    const key = generateKey(password, salt)
    
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Create cipher
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key)
    cipher.setAAD(salt)
    
    // Encrypt content
    let encrypted = cipher.update(fileContent)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    
    // Get authentication tag
    const tag = cipher.getAuthTag()
    
    // Combine salt + iv + tag + encrypted content
    const encryptedData = Buffer.concat([salt, iv, tag, encrypted])
    
    return encryptedData
  } catch (error) {
    console.error('File encryption error:', error)
    throw new Error('Failed to encrypt file')
  }
}

// Decrypt file content
const decryptFile = async (encryptedData: Buffer, password: string): Promise<Buffer> => {
  try {
    // Extract components
    const salt = encryptedData.slice(0, 16)
    const iv = encryptedData.slice(16, 32)
    const tag = encryptedData.slice(32, 48)
    const encrypted = encryptedData.slice(48)
    
    // Generate key
    const key = generateKey(password, salt)
    
    // Create decipher
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key)
    decipher.setAAD(salt)
    decipher.setAuthTag(tag)
    
    // Decrypt content
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return decrypted
  } catch (error) {
    console.error('File decryption error:', error)
    throw new Error('Failed to decrypt file')
  }
}

// Encrypt file and save to secure location
const encryptAndStoreFile = async (originalPath: string, encryptedPath: string, password: string): Promise<{ success: boolean; encryptedPath: string; originalSize: number; encryptedSize: number }> => {
  try {
    // Encrypt file
    const encryptedData = await encryptFile(originalPath, password)
    
    // Create secure directory if it doesn't exist
    const secureDir = path.dirname(encryptedPath)
    await fs.mkdir(secureDir, { recursive: true, mode: 0o700 })
    
    // Write encrypted file
    await fs.writeFile(encryptedPath, encryptedData, { mode: 0o600 })
    
    // Remove original file
    await fs.unlink(originalPath)
    
    return {
      success: true,
      encryptedPath,
      originalSize: (await fs.stat(originalPath)).size,
      encryptedSize: encryptedData.length
    }
  } catch (error) {
    console.error('Encrypt and store error:', error)
    throw new Error('Failed to encrypt and store file')
  }
}

// Decrypt file from secure location
const decryptAndRetrieveFile = async (encryptedPath: string, outputPath: string, password: string): Promise<{ success: boolean; outputPath: string; size: number }> => {
  try {
    // Read encrypted file
    const encryptedData = await fs.readFile(encryptedPath)
    
    // Decrypt content
    const decryptedData = await decryptFile(encryptedData, password)
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath)
    await fs.mkdir(outputDir, { recursive: true, mode: 0o755 })
    
    // Write decrypted file
    await fs.writeFile(outputPath, decryptedData, { mode: 0o644 })
    
    return {
      success: true,
      outputPath,
      size: decryptedData.length
    }
  } catch (error) {
    console.error('Decrypt and retrieve error:', error)
    throw new Error('Failed to decrypt and retrieve file')
  }
}

// Generate secure password for file encryption
const generateSecurePassword = () => {
  return crypto.randomBytes(32).toString('hex')
}

// Hash password for storage
const hashPassword = (password: string, salt: Buffer): string => {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
};

// Verify password hash
const verifyPassword = (password: string, hash: string, salt: Buffer): boolean => {
  const hashedPassword = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hashedPassword === hash;
};

// Secure file metadata encryption
const encryptMetadata = (metadata: any, password: string): string => {
  try {
    const salt = generateSalt()
    const key = generateKey(password, salt)
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key)
    cipher.setAAD(salt)
    
    const metadataString = JSON.stringify(metadata)
    let encrypted = cipher.update(metadataString, 'utf8')
    encrypted = Buffer.concat([encrypted, cipher.final()])
    
    const tag = cipher.getAuthTag()
    
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64')
  } catch (error) {
    console.error('Metadata encryption error:', error)
    throw new Error('Failed to encrypt metadata')
  }
}

// Decrypt file metadata
const decryptMetadata = (encryptedMetadata: string, password: string): any => {
  try {
    const encryptedData = Buffer.from(encryptedMetadata, 'base64')
    
    const salt = encryptedData.slice(0, 16)
    const iv = encryptedData.slice(16, 32)
    const tag = encryptedData.slice(32, 48)
    const encrypted = encryptedData.slice(48)
    
    const key = generateKey(password, salt)
    
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key)
    decipher.setAAD(salt)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return JSON.parse(decrypted.toString('utf8'))
  } catch (error) {
    console.error('Metadata decryption error:', error)
    throw new Error('Failed to decrypt metadata')
  }
}

// File integrity verification
const verifyFileIntegrity = async (filePath: string, expectedChecksum: string): Promise<boolean> => {
  try {
    const fileContent = await fs.readFile(filePath)
    const actualChecksum = crypto.createHash('sha256').update(fileContent).digest('hex')
    return actualChecksum === expectedChecksum
  } catch (error) {
    console.error('File integrity verification error:', error)
    return false
  }
}

// Secure file deletion
const secureDeleteFile = async (filePath: string): Promise<{ success: boolean }> => {
  try {
    // Overwrite file with random data multiple times
    const stats = await fs.stat(filePath)
    const fileSize = stats.size
    
    // Write random data 3 times
    for (let i = 0; i < 3; i++) {
      const randomData = crypto.randomBytes(fileSize)
      await fs.writeFile(filePath, randomData)
    }
    
    // Delete file
    await fs.unlink(filePath)
    
    return { success: true }
  } catch (error) {
    console.error('Secure delete error:', error)
    throw new Error('Failed to securely delete file')
  }
}

export { 
  encryptFile,
  decryptFile,
  encryptAndStoreFile,
  decryptAndRetrieveFile,
  generateSecurePassword,
  hashPassword,
  verifyPassword,
  encryptMetadata,
  decryptMetadata,
  verifyFileIntegrity,
  secureDeleteFile
 }
