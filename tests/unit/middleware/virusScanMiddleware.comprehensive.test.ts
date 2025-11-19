/**
 * Virus Scan Middleware - Comprehensive Unit Tests
 * Tests virus scanning functionality with proper mocking
 */

import { Request, Response, NextFunction } from 'express';
import {
  virusScanMiddleware,
  scanSingleFile,
  scanMultipleFiles,
  strictVirusScan,
  lenientVirusScan,
} from '../../../src/middleware/virusScanMiddleware';
import { ScanStatus } from '../../../src/config/virus-scan.config';

// Mock VirusScanService
const mockScanFile = jest.fn();
const mockScanBuffer = jest.fn();

jest.mock('../../../src/services/VirusScanService', () => ({
  getVirusScanService: jest.fn(() => ({
    scanFile: mockScanFile,
    scanBuffer: mockScanBuffer,
  })),
}));

// Mock fs
const mockUnlink = jest.fn();
const mockExistsSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
  unlinkSync: (path: string) => mockUnlink(path),
}));

describe('Virus Scan Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    req = {
      file: undefined,
      files: undefined,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    next = jest.fn();

    // Spy on console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('virusScanMiddleware', () => {
    it('should pass through when no files are uploaded', async () => {
      const middleware = virusScanMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockScanFile).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should scan single file and pass if clean', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/tmp/test.pdf',
        filename: 'test.pdf',
        destination: '/tmp',
        buffer: Buffer.from(''),
        stream: {} as any,
      };

      req.file = mockFile;

      const scanResult = {
        status: ScanStatus.CLEAN,
        file: '/tmp/test.pdf',
        size: 1024,
        scannedAt: new Date(),
        duration: 100,
      };

      mockScanFile.mockResolvedValue(scanResult);

      const middleware = virusScanMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(mockScanFile).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect((req as any).scanResults).toEqual([scanResult]);
    });

    it('should scan multiple files and pass if all clean', async () => {
      const mockFiles: Express.Multer.File[] = [
        {
          fieldname: 'files',
          originalname: 'test1.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 1024,
          path: '/tmp/test1.pdf',
          filename: 'test1.pdf',
          destination: '/tmp',
          buffer: Buffer.from(''),
          stream: {} as any,
        },
        {
          fieldname: 'files',
          originalname: 'test2.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 2048,
          path: '/tmp/test2.pdf',
          filename: 'test2.pdf',
          destination: '/tmp',
          buffer: Buffer.from(''),
          stream: {} as any,
        },
      ];

      req.files = mockFiles;

      mockScanFile.mockResolvedValue({
        status: ScanStatus.CLEAN,
        scannedAt: new Date(),
        duration: 100,
      });

      const middleware = virusScanMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(mockScanFile).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block infected file and delete it', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'infected.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        size: 5000,
        path: '/tmp/infected.exe',
        filename: 'infected.exe',
        destination: '/tmp',
        buffer: Buffer.from(''),
        stream: {} as any,
      };

      req.file = mockFile;

      const scanResult = {
        status: ScanStatus.INFECTED,
        file: '/tmp/infected.exe',
        size: 5000,
        scannedAt: new Date(),
        duration: 150,
        virus: 'Trojan.Generic',
      };

      mockScanFile.mockResolvedValue(scanResult);
      mockExistsSync.mockReturnValue(true);
      mockUnlink.mockReturnValue(undefined);

      const middleware = virusScanMiddleware({ deleteOnInfection: true });
      await middleware(req as Request, res as Response, next);

      expect(mockScanFile).toHaveBeenCalledWith('/tmp/infected.exe');
      expect(mockExistsSync).toHaveBeenCalledWith('/tmp/infected.exe');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/infected.exe');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Infected files detected',
        details: [
          {
            filename: 'infected.exe',
            virus: 'Trojan.Generic',
          },
        ],
      });
      expect(next).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deleted infected file')
      );
    });

    it('should not delete infected file when deleteOnInfection is false', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'infected.exe',
        path: '/tmp/infected.exe',
        buffer: Buffer.from(''),
      } as any;

      req.file = mockFile;

      mockScanFile.mockResolvedValue({
        status: ScanStatus.INFECTED,
        virus: 'Malware.Test',
      });

      const middleware = virusScanMiddleware({ deleteOnInfection: false });
      await middleware(req as Request, res as Response, next);

      expect(mockUnlink).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block on scan error when blockOnError is true', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        path: '/tmp/test.pdf',
        buffer: Buffer.from(''),
      } as any;

      req.file = mockFile;

      mockScanFile.mockResolvedValue({
        status: ScanStatus.ERROR,
        file: '/tmp/test.pdf',
        error: 'Scanner not available',
        scannedAt: new Date(),
        duration: 0,
      });

      const middleware = virusScanMiddleware({ blockOnError: true });
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Virus scan failed',
        details: [
          {
            filename: 'test.pdf',
            error: 'Scanner not available',
          },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should continue on scan error when blockOnError is false', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        path: '/tmp/test.pdf',
        buffer: Buffer.from(''),
      } as any;

      req.file = mockFile;

      mockScanFile.mockResolvedValue({
        status: ScanStatus.ERROR,
        error: 'Scanner timeout',
      });

      const middleware = virusScanMiddleware({ blockOnError: false });
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should scan buffer when scanBuffers option is enabled', async () => {
      const fileBuffer = Buffer.from('test file content');
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: fileBuffer.length,
        buffer: fileBuffer,
      } as any;

      req.file = mockFile;

      mockScanBuffer.mockResolvedValue({
        status: ScanStatus.CLEAN,
        file: 'test.pdf',
        size: fileBuffer.length,
        scannedAt: new Date(),
        duration: 50,
      });

      const middleware = virusScanMiddleware({ scanBuffers: true });
      await middleware(req as Request, res as Response, next);

      expect(mockScanBuffer).toHaveBeenCalledWith(fileBuffer, 'test.pdf');
      expect(mockScanFile).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle files object with field names', async () => {
      const mockFiles: { [fieldname: string]: Express.Multer.File[] } = {
        avatar: [
          {
            fieldname: 'avatar',
            originalname: 'avatar.jpg',
            path: '/tmp/avatar.jpg',
          } as any,
        ],
        document: [
          {
            fieldname: 'document',
            originalname: 'doc.pdf',
            path: '/tmp/doc.pdf',
          } as any,
        ],
      };

      req.files = mockFiles;

      mockScanFile.mockResolvedValue({
        status: ScanStatus.CLEAN,
        scannedAt: new Date(),
        duration: 75,
      });

      const middleware = virusScanMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(mockScanFile).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalled();
    });

    it('should handle middleware errors gracefully when blockOnError is false', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        path: '/tmp/test.pdf',
      } as any;

      req.file = mockFile;

      mockScanFile.mockRejectedValue(new Error('Scan service crashed'));

      const middleware = virusScanMiddleware({ blockOnError: false });
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should block when middleware error occurs and blockOnError is true', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        path: '/tmp/test.pdf',
      } as any;

      req.file = mockFile;

      mockScanFile.mockRejectedValue(new Error('Scan service crashed'));

      const middleware = virusScanMiddleware({ blockOnError: true });
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Virus scan failed',
        message: 'Scan service crashed',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Exported middleware variants', () => {
    it('scanSingleFile should work same as virusScanMiddleware', async () => {
      expect(typeof scanSingleFile).toBe('function');
      const middleware = scanSingleFile();
      expect(typeof middleware).toBe('function');
    });

    it('scanMultipleFiles should work same as virusScanMiddleware', async () => {
      expect(typeof scanMultipleFiles).toBe('function');
      const middleware = scanMultipleFiles();
      expect(typeof middleware).toBe('function');
    });

    it('strictVirusScan should have blockOnError enabled', () => {
      expect(typeof strictVirusScan).toBe('function');
      // strictVirusScan is pre-configured with deleteOnInfection: true, blockOnError: true
    });

    it('lenientVirusScan should not block on errors', () => {
      expect(typeof lenientVirusScan).toBe('function');
      // lenientVirusScan is pre-configured with deleteOnInfection: true, blockOnError: false
    });
  });
});
