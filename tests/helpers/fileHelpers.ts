/**
 * File Upload Test Helpers
 * Helpers for testing file uploads, validation, and storage
 */

import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

/**
 * Create temporary test file
 */
export const createTestFile = (
  filename: string,
  content: string | Buffer,
  directory?: string
): string => {
  const testDir = directory || path.join(__dirname, '../temp');

  // Ensure directory exists
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

/**
 * Create mock file buffer for multer
 */
export const createMockFile = (
  filename: string = 'test.txt',
  mimetype: string = 'text/plain',
  size: number = 1024
): Express.Multer.File => {
  const buffer = Buffer.from('test file content'.repeat(size / 17));

  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '/tmp/uploads',
    filename: `test-${Date.now()}-${filename}`,
    path: `/tmp/uploads/test-${Date.now()}-${filename}`,
    stream: Readable.from(buffer),
  } as Express.Multer.File;
};

/**
 * Create mock image file
 */
export const createMockImageFile = (
  filename: string = 'test.jpg',
  size: number = 1024
): Express.Multer.File => {
  return createMockFile(filename, 'image/jpeg', size);
};

/**
 * Create mock PDF file
 */
export const createMockPdfFile = (
  filename: string = 'test.pdf',
  size: number = 1024
): Express.Multer.File => {
  return createMockFile(filename, 'application/pdf', size);
};

/**
 * Create EICAR test virus file (for virus scanning tests)
 */
export const createEicarTestFile = (): Express.Multer.File => {
  // EICAR test string - standard test file for antivirus software
  const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  const buffer = Buffer.from(eicarString);

  return {
    fieldname: 'file',
    originalname: 'eicar.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: buffer.length,
    buffer,
    destination: '/tmp/uploads',
    filename: `eicar-${Date.now()}.txt`,
    path: `/tmp/uploads/eicar-${Date.now()}.txt`,
    stream: Readable.from(buffer),
  } as Express.Multer.File;
};

/**
 * Create oversized file for testing limits
 */
export const createOversizedFile = (
  sizeInMB: number = 10
): Express.Multer.File => {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  return createMockFile('oversized.bin', 'application/octet-stream', sizeInBytes);
};

/**
 * Create file with invalid extension
 */
export const createInvalidExtensionFile = (): Express.Multer.File => {
  return createMockFile('malicious.exe', 'application/x-msdownload', 1024);
};

/**
 * Clean up temporary test files
 */
export const cleanupTestFiles = (directory?: string): void => {
  const testDir = directory || path.join(__dirname, '../temp');

  if (fs.existsSync(testDir)) {
    const files = fs.readdirSync(testDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(testDir, file));
    });
    fs.rmdirSync(testDir);
  }
};

/**
 * Create test upload directory
 */
export const createTestUploadDir = (): string => {
  const uploadDir = path.join(__dirname, '../temp/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

/**
 * Verify file exists
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * Get file size
 */
export const getFileSize = (filePath: string): number => {
  const stats = fs.statSync(filePath);
  return stats.size;
};

/**
 * Read file content
 */
export const readFileContent = (filePath: string): Buffer => {
  return fs.readFileSync(filePath);
};

/**
 * Assert file was uploaded correctly
 */
export const assertFileUploaded = (filePath: string, expectedSize?: number) => {
  expect(fileExists(filePath)).toBe(true);

  if (expectedSize) {
    const actualSize = getFileSize(filePath);
    expect(actualSize).toBe(expectedSize);
  }
};

/**
 * Create mock file with specific content
 */
export const createMockFileWithContent = (
  content: string,
  filename: string = 'test.txt',
  mimetype: string = 'text/plain'
): Express.Multer.File => {
  const buffer = Buffer.from(content);

  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '/tmp/uploads',
    filename: `test-${Date.now()}-${filename}`,
    path: `/tmp/uploads/test-${Date.now()}-${filename}`,
    stream: Readable.from(buffer),
  } as Express.Multer.File;
};

/**
 * File type validation test cases
 */
export const fileTypeTestCases = {
  images: [
    { ext: 'jpg', mime: 'image/jpeg' },
    { ext: 'png', mime: 'image/png' },
    { ext: 'gif', mime: 'image/gif' },
    { ext: 'webp', mime: 'image/webp' },
  ],
  documents: [
    { ext: 'pdf', mime: 'application/pdf' },
    { ext: 'doc', mime: 'application/msword' },
    { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: 'xls', mime: 'application/vnd.ms-excel' },
    { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  ],
  invalid: [
    { ext: 'exe', mime: 'application/x-msdownload' },
    { ext: 'bat', mime: 'application/x-bat' },
    { ext: 'sh', mime: 'application/x-sh' },
    { ext: 'dll', mime: 'application/x-msdownload' },
  ],
};

/**
 * Create multiple test files
 */
export const createMultipleTestFiles = (count: number): Express.Multer.File[] => {
  const files: Express.Multer.File[] = [];
  for (let i = 0; i < count; i++) {
    files.push(createMockFile(`test-${i}.txt`));
  }
  return files;
};

/**
 * Mock file upload request body
 */
export const mockFileUploadRequest = (file: Express.Multer.File, body: any = {}) => {
  return {
    file,
    body,
    files: [file],
  };
};
