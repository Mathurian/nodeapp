/**
 * SettingsController Unit Tests
 * Comprehensive test coverage for SettingsController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { SettingsController } from '../../../src/controllers/settingsController';
import { SettingsService } from '../../../src/services/SettingsService';
import { successResponse } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/SettingsService');

describe('SettingsController', () => {
  let controller: SettingsController;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successResponse helper
    (successResponse as jest.Mock).mockImplementation((res, data, message) => {
      return res.json({ success: true, data, message });
    });

    // Create mock service
    mockSettingsService = {
      getAllSettings: jest.fn(),
      getAppName: jest.fn(),
      getPublicSettings: jest.fn(),
      updateSettings: jest.fn(),
      testEmailSettings: jest.fn(),
      getLoggingLevels: jest.fn(),
      updateLoggingLevel: jest.fn(),
      getSecuritySettings: jest.fn(),
      updateSecuritySettings: jest.fn(),
      getBackupSettings: jest.fn(),
      updateBackupSettings: jest.fn(),
      getEmailSettings: jest.fn(),
      updateEmailSettings: jest.fn(),
      getPasswordPolicy: jest.fn(),
      updatePasswordPolicy: jest.fn(),
      getJWTConfig: jest.fn(),
      updateJWTConfig: jest.fn(),
      getThemeSettings: jest.fn(),
      updateThemeSettings: jest.fn(),
      updateSetting: jest.fn(),
      getDatabaseConnectionInfo: jest.fn(),
      getContestantVisibilitySettings: jest.fn(),
      updateContestantVisibilitySettings: jest.fn(),
    } as any;

    // Mock container
    (container.resolve as jest.Mock) = jest.fn(() => mockSettingsService);

    controller = new SettingsController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'ADMIN' },
      file: undefined,
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getAllSettings', () => {
    it('should return all settings', async () => {
      const mockSettings = {
        appName: 'Event Manager',
        emailEnabled: true,
        loggingLevel: 'info',
      };

      mockSettingsService.getAllSettings.mockResolvedValue(mockSettings as any);

      await controller.getAllSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getAllSettings).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockSettings);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getAllSettings.mockRejectedValue(error);

      await controller.getAllSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getSettings', () => {
    it('should return all settings (alias)', async () => {
      const mockSettings = {
        appName: 'Event Manager',
        theme: 'dark',
      };

      mockSettingsService.getAllSettings.mockResolvedValue(mockSettings as any);

      await controller.getSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getAllSettings).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockSettings);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getAllSettings.mockRejectedValue(error);

      await controller.getSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAppName', () => {
    it('should return app name and subtitle', async () => {
      const mockAppName = {
        appName: 'Event Manager',
        appSubtitle: 'Contest Management System',
      };

      mockSettingsService.getAppName.mockResolvedValue(mockAppName as any);

      await controller.getAppName(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getAppName).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ data: mockAppName });
    });

    it('should return defaults on error', async () => {
      mockSettingsService.getAppName.mockRejectedValue(new Error('Database error'));

      await controller.getAppName(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: { appName: 'Event Manager', appSubtitle: '' },
      });
    });
  });

  describe('getPublicSettings', () => {
    it('should return public settings', async () => {
      const mockPublicSettings = {
        appName: 'Event Manager',
        theme: 'light',
        logoPath: '/uploads/logo.png',
      };

      mockSettingsService.getPublicSettings.mockResolvedValue(mockPublicSettings as any);

      await controller.getPublicSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getPublicSettings).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockPublicSettings);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getPublicSettings.mockRejectedValue(error);

      await controller.getPublicSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const settings = {
        appName: 'My Event Manager',
        theme: 'dark',
      };

      mockReq.body = settings;
      mockSettingsService.updateSettings.mockResolvedValue(2);

      await controller.updateSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith(settings, 'user-1');
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'Settings updated successfully'
      );
    });

    it('should handle missing user ID', async () => {
      mockReq.user = undefined;
      mockReq.body = { appName: 'Test' };
      mockSettingsService.updateSettings.mockResolvedValue(1);

      await controller.updateSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({ appName: 'Test' }, '');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { appName: 'Test' };
      mockSettingsService.updateSettings.mockRejectedValue(error);

      await controller.updateSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('testSettings', () => {
    it('should test email settings successfully', async () => {
      mockReq.params = { type: 'email' };
      mockReq.body = { testEmail: 'test@example.com' };
      mockSettingsService.testEmailSettings.mockResolvedValue(true);

      await controller.testSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.testEmailSettings).toHaveBeenCalledWith('test@example.com');
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { success: true },
        'Email test successful'
      );
    });

    it('should return 400 for invalid test type', async () => {
      mockReq.params = { type: 'invalid' };
      mockReq.body = { testEmail: 'test@example.com' };

      await controller.testSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid test type' });
    });

    it('should call next with error when email test fails', async () => {
      const error = new Error('Email test failed');
      mockReq.params = { type: 'email' };
      mockReq.body = { testEmail: 'test@example.com' };
      mockSettingsService.testEmailSettings.mockRejectedValue(error);

      await controller.testSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getLoggingLevels', () => {
    it('should return logging levels', async () => {
      const mockLevels = ['error', 'warn', 'info', 'debug'];
      mockSettingsService.getLoggingLevels.mockResolvedValue(mockLevels as any);

      await controller.getLoggingLevels(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getLoggingLevels).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockLevels);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getLoggingLevels.mockRejectedValue(error);

      await controller.getLoggingLevels(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateLoggingLevel', () => {
    it('should update logging level successfully', async () => {
      mockReq.body = { level: 'debug' };
      const mockSetting = { key: 'loggingLevel', value: 'debug' };
      mockSettingsService.updateLoggingLevel.mockResolvedValue(mockSetting as any);

      await controller.updateLoggingLevel(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateLoggingLevel).toHaveBeenCalledWith('debug', 'user-1');
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        mockSetting,
        'Logging level updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { level: 'debug' };
      mockSettingsService.updateLoggingLevel.mockRejectedValue(error);

      await controller.updateLoggingLevel(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getSecuritySettings', () => {
    it('should return security settings', async () => {
      const mockSecuritySettings = {
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        requireStrongPasswords: true,
      };

      mockSettingsService.getSecuritySettings.mockResolvedValue(mockSecuritySettings as any);

      await controller.getSecuritySettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getSecuritySettings).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockSecuritySettings);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getSecuritySettings.mockRejectedValue(error);

      await controller.getSecuritySettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateSecuritySettings', () => {
    it('should update security settings successfully', async () => {
      const securitySettings = {
        sessionTimeout: 7200,
        maxLoginAttempts: 3,
      };

      mockReq.body = securitySettings;
      mockSettingsService.updateSecuritySettings.mockResolvedValue(2);

      await controller.updateSecuritySettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateSecuritySettings).toHaveBeenCalledWith(
        securitySettings,
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'Security settings updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { sessionTimeout: 7200 };
      mockSettingsService.updateSecuritySettings.mockRejectedValue(error);

      await controller.updateSecuritySettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getBackupSettings', () => {
    it('should return backup settings', async () => {
      const mockBackupSettings = {
        enabled: true,
        frequency: 'DAILY',
        retentionDays: 30,
      };

      mockSettingsService.getBackupSettings.mockResolvedValue(mockBackupSettings as any);

      await controller.getBackupSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getBackupSettings).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockBackupSettings);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getBackupSettings.mockRejectedValue(error);

      await controller.getBackupSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateBackupSettings', () => {
    it('should update backup settings successfully', async () => {
      const backupSettings = {
        enabled: true,
        frequency: 'WEEKLY',
      };

      mockReq.body = backupSettings;
      mockSettingsService.updateBackupSettings.mockResolvedValue(2);

      await controller.updateBackupSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateBackupSettings).toHaveBeenCalledWith(
        backupSettings,
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'Backup settings updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { enabled: true };
      mockSettingsService.updateBackupSettings.mockRejectedValue(error);

      await controller.updateBackupSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getEmailSettings', () => {
    it('should return email settings', async () => {
      const mockEmailSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpSecure: true,
      };

      mockSettingsService.getEmailSettings.mockResolvedValue(mockEmailSettings as any);

      await controller.getEmailSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getEmailSettings).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockEmailSettings);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getEmailSettings.mockRejectedValue(error);

      await controller.getEmailSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateEmailSettings', () => {
    it('should update email settings successfully', async () => {
      const emailSettings = {
        smtpHost: 'smtp.newhost.com',
        smtpPort: 465,
      };

      mockReq.body = emailSettings;
      mockSettingsService.updateEmailSettings.mockResolvedValue(2);

      await controller.updateEmailSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateEmailSettings).toHaveBeenCalledWith(
        emailSettings,
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'Email settings updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { smtpHost: 'smtp.example.com' };
      mockSettingsService.updateEmailSettings.mockRejectedValue(error);

      await controller.updateEmailSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getPasswordPolicy', () => {
    it('should return password policy', async () => {
      const mockPolicy = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      mockSettingsService.getPasswordPolicy.mockResolvedValue(mockPolicy as any);

      await controller.getPasswordPolicy(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getPasswordPolicy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockPolicy);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getPasswordPolicy.mockRejectedValue(error);

      await controller.getPasswordPolicy(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updatePasswordPolicy', () => {
    it('should update password policy successfully', async () => {
      const passwordPolicy = {
        minLength: 12,
        requireSpecialChars: true,
      };

      mockReq.body = passwordPolicy;
      mockSettingsService.updatePasswordPolicy.mockResolvedValue(2);

      await controller.updatePasswordPolicy(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updatePasswordPolicy).toHaveBeenCalledWith(
        passwordPolicy,
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'Password policy updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { minLength: 12 };
      mockSettingsService.updatePasswordPolicy.mockRejectedValue(error);

      await controller.updatePasswordPolicy(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getJWTConfig', () => {
    it('should return JWT configuration', async () => {
      const mockJWTConfig = {
        expiresIn: '24h',
        refreshExpiresIn: '7d',
        algorithm: 'HS256',
      };

      mockSettingsService.getJWTConfig.mockResolvedValue(mockJWTConfig as any);

      await controller.getJWTConfig(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getJWTConfig).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockJWTConfig);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getJWTConfig.mockRejectedValue(error);

      await controller.getJWTConfig(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateJWTConfig', () => {
    it('should update JWT configuration successfully', async () => {
      const jwtConfig = {
        expiresIn: '12h',
        refreshExpiresIn: '30d',
      };

      mockReq.body = jwtConfig;
      mockSettingsService.updateJWTConfig.mockResolvedValue(2);

      await controller.updateJWTConfig(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateJWTConfig).toHaveBeenCalledWith(jwtConfig, 'user-1');
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'JWT configuration updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { expiresIn: '12h' };
      mockSettingsService.updateJWTConfig.mockRejectedValue(error);

      await controller.updateJWTConfig(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getThemeSettings', () => {
    it('should return theme settings', async () => {
      const mockThemeSettings = {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        logoPath: '/uploads/logo.png',
        faviconPath: '/uploads/favicon.ico',
      };

      mockSettingsService.getThemeSettings.mockResolvedValue(mockThemeSettings as any);

      await controller.getThemeSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getThemeSettings).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockThemeSettings);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getThemeSettings.mockRejectedValue(error);

      await controller.getThemeSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateThemeSettings', () => {
    it('should update theme settings successfully', async () => {
      const themeSettings = {
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
      };

      mockReq.body = themeSettings;
      mockSettingsService.updateThemeSettings.mockResolvedValue(2);

      await controller.updateThemeSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateThemeSettings).toHaveBeenCalledWith(
        themeSettings,
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'Theme settings updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { primaryColor: '#ff0000' };
      mockSettingsService.updateThemeSettings.mockRejectedValue(error);

      await controller.updateThemeSettings(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('uploadThemeLogo', () => {
    it('should upload theme logo successfully', async () => {
      mockReq.file = {
        filename: 'logo-123.png',
        path: '/uploads/logo-123.png',
      } as any;

      mockSettingsService.updateSetting.mockResolvedValue(undefined);

      await controller.uploadThemeLogo(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'theme_logoPath',
        '/uploads/logo-123.png',
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { logoPath: '/uploads/logo-123.png' },
        'Logo uploaded successfully'
      );
    });

    it('should return 400 when no file uploaded', async () => {
      mockReq.file = undefined;

      await controller.uploadThemeLogo(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Upload failed');
      mockReq.file = {
        filename: 'logo-123.png',
      } as any;
      mockSettingsService.updateSetting.mockRejectedValue(error);

      await controller.uploadThemeLogo(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('uploadThemeFavicon', () => {
    it('should upload theme favicon successfully', async () => {
      mockReq.file = {
        filename: 'favicon-123.ico',
        path: '/uploads/favicon-123.ico',
      } as any;

      mockSettingsService.updateSetting.mockResolvedValue(undefined);

      await controller.uploadThemeFavicon(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'theme_faviconPath',
        '/uploads/favicon-123.ico',
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { faviconPath: '/uploads/favicon-123.ico' },
        'Favicon uploaded successfully'
      );
    });

    it('should return 400 when no file uploaded', async () => {
      mockReq.file = undefined;

      await controller.uploadThemeFavicon(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Upload failed');
      mockReq.file = {
        filename: 'favicon-123.ico',
      } as any;
      mockSettingsService.updateSetting.mockRejectedValue(error);

      await controller.uploadThemeFavicon(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getDatabaseConnectionInfo', () => {
    it('should return database connection info', async () => {
      const mockInfo = {
        host: 'localhost',
        port: 5432,
        database: 'event_manager',
        connected: true,
      };

      mockSettingsService.getDatabaseConnectionInfo.mockResolvedValue(mockInfo as any);

      await controller.getDatabaseConnectionInfo(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSettingsService.getDatabaseConnectionInfo).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockInfo);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getDatabaseConnectionInfo.mockRejectedValue(error);

      await controller.getDatabaseConnectionInfo(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestantVisibilitySettings', () => {
    it('should return transformed contestant visibility settings', async () => {
      const mockSettings = {
        contestant_visibility_canViewWinners: 'true',
        contestant_visibility_canViewOverallResults: 'false',
      };

      mockSettingsService.getContestantVisibilitySettings.mockResolvedValue(mockSettings as any);

      await controller.getContestantVisibilitySettings(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockSettingsService.getContestantVisibilitySettings).toHaveBeenCalled();
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        {
          canViewWinners: true,
          canViewOverallResults: false,
        },
        'Contestant visibility settings retrieved successfully'
      );
    });

    it('should handle alternate key format', async () => {
      const mockSettings = {
        canViewWinners: 'true',
        canViewOverallResults: 'true',
      };

      mockSettingsService.getContestantVisibilitySettings.mockResolvedValue(mockSettings as any);

      await controller.getContestantVisibilitySettings(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        {
          canViewWinners: true,
          canViewOverallResults: true,
        },
        'Contestant visibility settings retrieved successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockSettingsService.getContestantVisibilitySettings.mockRejectedValue(error);

      await controller.getContestantVisibilitySettings(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateContestantVisibilitySettings', () => {
    it('should update contestant visibility settings successfully', async () => {
      const visibilitySettings = {
        canViewWinners: true,
        canViewOverallResults: false,
      };

      mockReq.body = visibilitySettings;
      mockSettingsService.updateContestantVisibilitySettings.mockResolvedValue(2);

      await controller.updateContestantVisibilitySettings(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockSettingsService.updateContestantVisibilitySettings).toHaveBeenCalledWith(
        visibilitySettings,
        'user-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { updatedCount: 2 },
        'Contestant visibility settings updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.body = { canViewWinners: true };
      mockSettingsService.updateContestantVisibilitySettings.mockRejectedValue(error);

      await controller.updateContestantVisibilitySettings(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
