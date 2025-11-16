/**
 * Virus Scan Configuration
 * Configuration for ClamAV virus scanning with support for:
 * - Docker containers (clamav:3310)
 * - Native installations (localhost:3310 or Unix socket)
 * - Disabled mode (skip all scanning)
 */

export type ClamAVMode = 'docker' | 'native-tcp' | 'native-socket' | 'disabled';

export interface VirusScanConfig {
  enabled: boolean;
  mode: ClamAVMode;
  host: string;
  port: number;
  socketPath?: string; // Unix socket path for native installations
  timeout: number;
  maxFileSize: number; // in bytes
  quarantinePath: string;
  scanOnUpload: boolean;
  removeInfected: boolean;
  notifyOnInfection: boolean;
  fallbackBehavior: 'allow' | 'reject'; // What to do when ClamAV is unavailable
  connectionRetries: number;
}

/**
 * Detect ClamAV connection mode based on environment
 */
export const detectClamAVMode = (): ClamAVMode => {
  // Check if explicitly disabled
  if (process.env.CLAMAV_ENABLED === 'false') {
    return 'disabled';
  }

  // Check for Unix socket path (common for native installations)
  if (process.env.CLAMAV_SOCKET) {
    return 'native-socket';
  }

  // Check if in Docker environment
  if (process.env.CLAMAV_HOST === 'clamav' || process.env.DOCKER_ENV === 'true') {
    return 'docker';
  }

  // Check for common native socket paths
  const commonSocketPaths = [
    '/var/run/clamav/clamd.ctl',      // Debian/Ubuntu
    '/var/run/clamav/clamd.sock',     // Alternative Debian/Ubuntu
    '/var/run/clamd.socket',          // RHEL/CentOS
    '/tmp/clamd.socket',              // macOS Homebrew
    '/usr/local/var/run/clamav/clamd.sock', // macOS alternative
  ];

  const fs = require('fs');
  for (const socketPath of commonSocketPaths) {
    try {
      if (fs.existsSync(socketPath)) {
        return 'native-socket';
      }
    } catch (error) {
      // Continue checking other paths
    }
  }

  // Default to native TCP
  return 'native-tcp';
};

/**
 * Get virus scan configuration from environment
 */
export const getVirusScanConfig = (): VirusScanConfig => {
  const mode = detectClamAVMode();
  const enabled = process.env.CLAMAV_ENABLED !== 'false';

  // Determine socket path
  let socketPath: string | undefined;
  if (mode === 'native-socket') {
    socketPath = process.env.CLAMAV_SOCKET;

    if (!socketPath) {
      // Auto-detect common socket paths
      const fs = require('fs');
      const commonPaths = [
        '/var/run/clamav/clamd.ctl',
        '/var/run/clamav/clamd.sock',
        '/var/run/clamd.socket',
        '/tmp/clamd.socket',
        '/usr/local/var/run/clamav/clamd.sock',
      ];

      for (const path of commonPaths) {
        try {
          if (fs.existsSync(path)) {
            socketPath = path;
            break;
          }
        } catch (error) {
          // Continue
        }
      }
    }
  }

  return {
    enabled,
    mode,
    host: process.env.CLAMAV_HOST || 'localhost',
    port: parseInt(process.env.CLAMAV_PORT || '3310', 10),
    socketPath,
    timeout: parseInt(process.env.CLAMAV_TIMEOUT || '60000', 10), // 60 seconds
    maxFileSize: parseInt(process.env.CLAMAV_MAX_FILE_SIZE || '52428800', 10), // 50MB
    quarantinePath: process.env.QUARANTINE_PATH || './quarantine',
    scanOnUpload: process.env.SCAN_ON_UPLOAD !== 'false',
    removeInfected: process.env.REMOVE_INFECTED === 'true',
    notifyOnInfection: process.env.NOTIFY_ON_INFECTION !== 'false',
    fallbackBehavior: (process.env.CLAMAV_FALLBACK_BEHAVIOR as 'allow' | 'reject') || 'allow',
    connectionRetries: parseInt(process.env.CLAMAV_CONNECTION_RETRIES || '3', 10),
  };
};

/**
 * Scan result status
 */
export enum ScanStatus {
  CLEAN = 'clean',
  INFECTED = 'infected',
  ERROR = 'error',
  SKIPPED = 'skipped',
  TOO_LARGE = 'too_large',
}

/**
 * Scan result interface
 */
export interface ScanResult {
  status: ScanStatus;
  virus?: string;
  file: string;
  size: number;
  scannedAt: Date;
  duration: number; // milliseconds
  error?: string;
}

export default {
  getVirusScanConfig,
  ScanStatus,
};
