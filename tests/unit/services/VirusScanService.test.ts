/**
 * VirusScanService Unit Tests
 * Comprehensive coverage for virus scanning operations
 */

import { VirusScanService } from '../../../src/services/VirusScanService';
import { ScanStatus, VirusScanConfig } from '../../../src/config/virus-scan.config';
import * as fs from 'fs';
import * as net from 'net';
import * as virusScanConfig from '../../../src/config/virus-scan.config';

// Mock modules
jest.mock('fs');
jest.mock('net');

// Default mock config
const createMockConfig = (overrides: Partial<VirusScanConfig> = {}): VirusScanConfig => ({
  enabled: false, // Default to disabled for most tests
  mode: 'disabled',
  host: 'localhost',
  port: 3310,
  timeout: 60000,
  maxFileSize: 52428800, // 50MB
  quarantinePath: './quarantine',
  scanOnUpload: true,
  removeInfected: false,
  notifyOnInfection: true,
  fallbackBehavior: 'allow',
  connectionRetries: 3,
  ...overrides,
});

describe('VirusScanService', () => {
  let service: VirusScanService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  let mockGetVirusScanConfig: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getVirusScanConfig to return disabled config by default
    mockGetVirusScanConfig = jest.spyOn(virusScanConfig, 'getVirusScanConfig')
      .mockReturnValue(createMockConfig());

    // Mock fs.existsSync to return true by default
    mockFs.existsSync.mockReturnValue(true);

    // Mock fs.mkdirSync
    mockFs.mkdirSync.mockReturnValue(undefined);

    // Mock fs.statSync to return default file stats
    mockFs.statSync.mockReturnValue({ size: 1024, isFile: () => true, isDirectory: () => false } as any);

    service = new VirusScanService();
  });

  afterEach(() => {
    mockGetVirusScanConfig.mockRestore();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(VirusScanService);
    });

    it('should create quarantine directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      new VirusScanService();

      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });

    it('should not create quarantine directory if it exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockClear();

      new VirusScanService();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return false when scanning is disabled', async () => {
      const result = await service.isAvailable();
      expect(result).toBe(false);
    });

    it('should attempt to connect to ClamAV when enabled', async () => {
      // Create a new service with scanning enabled
      mockGetVirusScanConfig.mockReturnValue(createMockConfig({
        enabled: true,
        mode: 'native-tcp',
      }));
      const enabledService = new VirusScanService();

      const mockSocket = {
        setTimeout: jest.fn(),
        on: jest.fn().mockImplementation(function(this: any, event: string, handler: Function) {
          if (event === 'connect') {
            // Call connect handler immediately
            setImmediate(() => handler());
          }
          return this;
        }),
        end: jest.fn(),
        destroy: jest.fn()
      };

      jest.spyOn(net, 'createConnection').mockReturnValue(mockSocket as any);

      const result = await enabledService.isAvailable();

      expect(mockSocket.setTimeout).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on connection error', async () => {
      // Create a new service with scanning enabled
      mockGetVirusScanConfig.mockReturnValue(createMockConfig({
        enabled: true,
        mode: 'native-tcp',
      }));
      const enabledService = new VirusScanService();

      const mockSocket = {
        setTimeout: jest.fn(),
        on: jest.fn().mockImplementation(function(this: any, event: string, handler: Function) {
          if (event === 'error') {
            // Call error handler immediately
            setImmediate(() => handler(new Error('Connection failed')));
          }
          return this;
        }),
        end: jest.fn(),
        destroy: jest.fn()
      };

      jest.spyOn(net, 'createConnection').mockReturnValue(mockSocket as any);

      const result = await enabledService.isAvailable();
      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      // Create a new service with scanning enabled
      mockGetVirusScanConfig.mockReturnValue(createMockConfig({
        enabled: true,
        mode: 'native-tcp',
      }));
      const enabledService = new VirusScanService();

      const mockSocket = {
        setTimeout: jest.fn(),
        on: jest.fn().mockImplementation(function(this: any, event: string, handler: Function) {
          if (event === 'timeout') {
            // Call timeout handler immediately
            setImmediate(() => handler());
          }
          return this;
        }),
        end: jest.fn(),
        destroy: jest.fn()
      };

      jest.spyOn(net, 'createConnection').mockReturnValue(mockSocket as any);

      const result = await enabledService.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('scanFile', () => {
    const testFilePath = '/test/file.txt';

    it('should return SKIPPED status when scanning is disabled', async () => {
      mockFs.statSync.mockReturnValue({ size: 1000 } as any);

      const result = await service.scanFile(testFilePath);

      expect(result.status).toBe(ScanStatus.SKIPPED);
      expect(result.file).toBe(testFilePath);
    });

    it('should return SKIPPED status when file does not exist and scan is disabled', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await service.scanFile(testFilePath);

      // When virus scan is disabled, non-existent files are skipped
      expect(result.status).toBe(ScanStatus.SKIPPED);
    });

    it('should return TOO_LARGE status for files exceeding max size', async () => {
      // Enable scanning for this test
      mockGetVirusScanConfig.mockReturnValue(createMockConfig({ enabled: true, mode: 'native-tcp' }));
      const enabledService = new VirusScanService();

      mockFs.statSync.mockReturnValue({ size: 100000000000 } as any);

      const result = await enabledService.scanFile(testFilePath);

      expect(result.status).toBe(ScanStatus.TOO_LARGE);
      expect(result.error).toContain('exceeds maximum scan size');
    });

    it('should handle scan errors gracefully', async () => {
      // Enable scanning so errors are captured
      mockGetVirusScanConfig.mockReturnValue(createMockConfig({ enabled: true, mode: 'native-tcp' }));
      const enabledService = new VirusScanService();

      // Mock statSync to return size for error handling, but file read will fail
      mockFs.statSync.mockReturnValue({ size: 1024 } as any);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await enabledService.scanFile(testFilePath);

      expect(result.status).toBe(ScanStatus.ERROR);
      expect(result.error).toBeDefined();
    });

    it('should include duration in scan result', async () => {
      mockFs.statSync.mockReturnValue({ size: 1000 } as any);

      const result = await service.scanFile(testFilePath);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.scannedAt).toBeInstanceOf(Date);
    });
  });

  describe('scanBuffer', () => {
    const testBuffer = Buffer.from('test content');
    const testFilename = 'test.txt';

    it('should return SKIPPED status when scanning is disabled', async () => {
      const result = await service.scanBuffer(testBuffer, testFilename);

      expect(result.status).toBe(ScanStatus.SKIPPED);
      expect(result.file).toBe(testFilename);
      expect(result.size).toBe(testBuffer.length);
    });

    it('should return TOO_LARGE status for buffers exceeding max size', async () => {
      // Enable scanning for this test
      mockGetVirusScanConfig.mockReturnValue(createMockConfig({ enabled: true, mode: 'native-tcp' }));
      const enabledService = new VirusScanService();

      // Create a buffer that appears large by mocking the length property
      const largeBuffer = Buffer.alloc(1024);
      Object.defineProperty(largeBuffer, 'length', {
        value: 100 * 1024 * 1024 * 1024, // 100GB (virtual size)
        writable: false,
      });

      const result = await enabledService.scanBuffer(largeBuffer, testFilename);

      expect(result.status).toBe(ScanStatus.TOO_LARGE);
      expect(result.error).toContain('exceeds maximum scan size');
    });

    it('should handle scan errors gracefully', async () => {
      const result = await service.scanBuffer(testBuffer, testFilename);

      expect(result).toBeDefined();
      expect(result.scannedAt).toBeInstanceOf(Date);
    });

    it('should use default filename for unnamed buffers', async () => {
      const result = await service.scanBuffer(testBuffer);

      expect(result.file).toBe('buffer');
    });

    it('should include duration in scan result', async () => {
      const result = await service.scanBuffer(testBuffer, testFilename);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getServiceInfo', () => {
    it('should return service configuration info', () => {
      const info = service.getServiceInfo();

      expect(info).toBeDefined();
      expect(info).toHaveProperty('enabled');
      expect(info).toHaveProperty('mode');
      expect(info).toHaveProperty('connection');
      expect(info).toHaveProperty('cacheSize');
      expect(info).toHaveProperty('config');
    });

    it('should include config details', () => {
      const info = service.getServiceInfo();

      expect(info.config).toHaveProperty('maxFileSize');
      expect(info.config).toHaveProperty('scanOnUpload');
      expect(info.config).toHaveProperty('removeInfected');
      expect(info.config).toHaveProperty('fallbackBehavior');
    });

    it('should track cache size', () => {
      const info = service.getServiceInfo();

      expect(typeof info.cacheSize).toBe('number');
      expect(info.cacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearCache', () => {
    it('should clear scan result cache', () => {
      service.clearCache();

      const info = service.getServiceInfo();
      expect(info.cacheSize).toBe(0);
    });

    it('should reset cache to empty state', () => {
      const infoBefore = service.getServiceInfo();
      const cacheSizeBefore = infoBefore.cacheSize;

      service.clearCache();

      const infoAfter = service.getServiceInfo();
      expect(infoAfter.cacheSize).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return scan statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('config');
    });

    it('should include configuration in statistics', () => {
      const stats = service.getStatistics();

      expect(stats.config).toBeDefined();
      expect(stats.config).toHaveProperty('enabled');
      expect(stats.config).toHaveProperty('mode');
    });
  });

  describe('listQuarantinedFiles', () => {
    it('should return empty array when quarantine directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const files = service.listQuarantinedFiles();

      expect(files).toEqual([]);
    });

    it('should list quarantined files', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        'file1.txt',
        'file1.txt.json',
        'file2.pdf',
        'file2.pdf.json'
      ] as any);

      const files = service.listQuarantinedFiles();

      expect(files).toEqual(['file1.txt', 'file2.pdf']);
    });

    it('should filter out metadata files', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        'infected.exe',
        'infected.exe.json',
        'metadata.json'
      ] as any);

      const files = service.listQuarantinedFiles();

      expect(files).not.toContain('infected.exe.json');
      expect(files).not.toContain('metadata.json');
    });
  });

  describe('getQuarantineMetadata', () => {
    it('should return null when metadata file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const metadata = service.getQuarantineMetadata('file.txt');

      expect(metadata).toBeNull();
    });

    it('should read and parse metadata file', () => {
      const mockMetadata = {
        originalPath: '/uploads/file.txt',
        scanResult: {
          status: ScanStatus.INFECTED,
          virus: 'Test.Virus'
        },
        quarantinedAt: new Date().toISOString()
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      const metadata = service.getQuarantineMetadata('file.txt');

      expect(metadata).toEqual(mockMetadata);
    });

    it('should handle JSON parse errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      expect(() => {
        service.getQuarantineMetadata('file.txt');
      }).toThrow();
    });
  });

  describe('deleteQuarantinedFile', () => {
    it('should delete quarantined file and metadata', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockReturnValue(undefined);

      const result = service.deleteQuarantinedFile('file.txt');

      expect(result).toBe(true);
      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    it('should return true even if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = service.deleteQuarantinedFile('file.txt');

      expect(result).toBe(true);
    });

    it('should return false on deletion error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = service.deleteQuarantinedFile('file.txt');

      expect(result).toBe(false);
    });

    it('should delete both file and metadata', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockReturnValue(undefined);

      service.deleteQuarantinedFile('infected.exe');

      const calls = mockFs.unlinkSync.mock.calls;
      expect(calls.some(call => String(call[0]).includes('infected.exe'))).toBe(true);
      expect(calls.some(call => String(call[0]).includes('infected.exe.json'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty filename gracefully', async () => {
      const result = await service.scanFile('');

      // Empty filename is handled as skipped when virus scan is disabled
      expect(result.status).toBe(ScanStatus.SKIPPED);
    });

    it('should handle null buffer gracefully', async () => {
      await expect(async () => {
        await service.scanBuffer(null as any);
      }).rejects.toThrow();
    });

    it('should handle zero-sized files', async () => {
      mockFs.statSync.mockReturnValue({ size: 0 } as any);

      const result = await service.scanFile('/test/empty.txt');

      expect(result).toBeDefined();
      expect(result.size).toBe(0);
    });

    it('should handle concurrent scans', async () => {
      mockFs.statSync.mockReturnValue({ size: 1000 } as any);

      const promises = [
        service.scanFile('/test/file1.txt'),
        service.scanFile('/test/file2.txt'),
        service.scanFile('/test/file3.txt')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
      });
    });
  });
});
