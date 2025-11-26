import fs from 'fs/promises';
import { env } from '../config/env';
import path from 'path';
import os from 'os';
// S4-2: Import request context for correlation IDs
import { getRequestContext } from '../middleware/correlationId';

// Use environment variable for log directory, or default to project logs directory
// In test environment, use temp directory to avoid permission issues
const LOG_DIRECTORY = env.get('LOG_DIRECTORY') ||
  (env.isTest()
    ? path.join(os.tmpdir(), 'event-manager-test-logs')
    : path.join(__dirname, '../../logs'))
const DISABLE_FILE_LOGGING = env.get('DISABLE_FILE_LOGGING') || env.isTest()
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

// Cache for log levels from database
let logLevelCache = {
  default: 'INFO',
  api: 'INFO',
  database: 'WARN',
  auth: 'INFO',
  backup: 'INFO'
}

// Map log categories to folder names
const categoryFolderMap: Record<string, string> = {
  'api': 'api',
  'database': 'database',
  'auth': 'auth',
  'backup': 'backup',
  'error': 'error',
  'default': 'general'
};

// Get folder name for a category
const getCategoryFolder = (category: string): string => {
  return categoryFolderMap[category.toLowerCase()] || 'general';
};

// Ensure logs directory and category subdirectories exist
const ensureLogDirectory = async (category: string = 'default') => {
  // Skip in test environment if file logging is disabled
  if (DISABLE_FILE_LOGGING) {
    return;
  }
  
  try {
    // Ensure base log directory exists
    await fs.mkdir(LOG_DIRECTORY, { recursive: true });
    
    // Ensure category subdirectory exists
    const categoryFolder = getCategoryFolder(category);
    const categoryLogDir = path.join(LOG_DIRECTORY, categoryFolder);
    await fs.mkdir(categoryLogDir, { recursive: true });
    
    // Ensure general folder exists (for general log file)
    const generalLogDir = path.join(LOG_DIRECTORY, 'general');
    await fs.mkdir(generalLogDir, { recursive: true });
  } catch (error) {
    // In test environment, silently fail
    if (!env.isTest()) {
      // Logger not available yet - use console as fallback
      console.error('Failed to create logs directory:', error)
    }
  }
}

// Load log levels from database (with caching)
const loadLogLevels = async () => {
  try {
    const prisma = (await import('../config/database')).default;
    const settings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: 'logging_' } }
    })
    
    // Reset to defaults
    logLevelCache = {
      default: 'INFO',
      api: 'INFO',
      database: 'WARN',
      auth: 'INFO',
      backup: 'INFO'
    }
    
    // Override with database values
    settings.forEach((setting: { key: string; value: string }) => {
      const key = setting.key.replace('logging_', '');
      if (key in logLevelCache) {
        (logLevelCache as Record<string, string>)[key] = setting.value;
      }
    });
    
    // No need to disconnect - using singleton
  } catch (error) {
    // Silently fail - use defaults
    // Note: Can't use logger here as it would cause circular dependency
    // This is acceptable as it's a fallback scenario
  }
}

// Refresh log levels (call this after updating settings)
const refreshLogLevels = async () => {
  await loadLogLevels()
}

// Get effective log level for a category
const getLogLevel = (category: string = 'default'): string => {
  return (logLevelCache as Record<string, string>)[category] || logLevelCache.default || 'INFO';
};

// Check if message should be logged based on level
const shouldLog = (level: string, category: string = 'default'): boolean => {
  const categoryLevel = getLogLevel(category);
  const messageLevel = (LOG_LEVELS as Record<string, number>)[level] ?? LOG_LEVELS.INFO;
  const thresholdLevel = (LOG_LEVELS as Record<string, number>)[categoryLevel] ?? LOG_LEVELS.INFO;
  
  return messageLevel <= thresholdLevel;
};

// Format date helper
const formatDate = (date: Date, formatStr: string): string => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  if (formatStr === 'yyyy-MM-dd') {
    return `${year}-${month}-${day}`
  } else if (formatStr === 'yyyy-MM-dd HH:mm:ss') {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  return d.toISOString()
}

// Write log to file
const writeToFile = async (level: string, category: string, message: string, meta: unknown = {}): Promise<void> => {
  // Skip file writing if disabled (e.g., in test environment with permission issues)
  if (DISABLE_FILE_LOGGING) {
    return;
  }

  try {
    await ensureLogDirectory(category)
    
    const timestamp = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')
    const logDate = formatDate(new Date(), 'yyyy-MM-dd')
    
    // Get category folder
    const categoryFolder = getCategoryFolder(category);
    const categoryLogDir = path.join(LOG_DIRECTORY, categoryFolder);
    
    // Create category-specific log file in subfolder
    const logFileName = `app-${category}-${logDate}.log`
    const logFilePath = path.join(categoryLogDir, logFileName)
    
    // Format log entry
    let logEntry = `[${timestamp}] [${level}] [${category.toUpperCase()}] ${message}`

    // Add metadata if present
    if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
      logEntry += ` | ${JSON.stringify(meta)}`
    }
    
    logEntry += '\n'
    
    // Append to category-specific file
    await fs.appendFile(logFilePath, logEntry, 'utf8')
    
    // Also write to general log file (for backward compatibility and overview)
    const generalLogDir = path.join(LOG_DIRECTORY, 'general');
    const generalLogFile = `app-${logDate}.log`
    const generalLogPath = path.join(generalLogDir, generalLogFile)
    await fs.appendFile(generalLogPath, logEntry, 'utf8')
    
  } catch (error: unknown) {
    // Fallback to console if file writing fails (don't throw in test environment)
    const errorObj = error as { message?: string; code?: string };
    if (!env.isTest()) {
      console.error(`Failed to write log to file: ${errorObj.message || 'Unknown error'}`);
    }
    // In test environment, silently ignore file write errors
  }
}

// Logger class
class Logger {
  category: string;
  
  constructor(category: string = 'default') {
    this.category = category;
  }

  async log(level: string, message: string, meta: unknown = {}) {
    // Check if we should log this message
    if (!shouldLog(level, this.category)) {
      return
    }

    // S4-2: Get request context for correlation IDs
    const context = getRequestContext();
    const enrichedMeta = {
      ...(meta && typeof meta === 'object' ? meta : {}),
      ...(context ? {
        requestId: context.requestId,
        correlationId: context.correlationId,
        userId: context.userId,
        tenantId: context.tenantId,
        userEmail: context.userEmail,
      } : {})
    };

    // Always output to console for immediate visibility
    const consoleMethod = level === 'ERROR' ? console.error :
                         level === 'WARN' ? console.warn :
                         level === 'DEBUG' ? console.debug :
                         console.log

    const formattedMessage = `[${this.category.toUpperCase()}] ${message}`
    if (Object.keys(enrichedMeta).length > 0) {
      consoleMethod(formattedMessage, enrichedMeta)
    } else {
      consoleMethod(formattedMessage)
    }

    // Write to file asynchronously (don't await to avoid blocking)
    writeToFile(level, this.category, message, enrichedMeta).catch((err: unknown) => {
      const errorObj = err as { message?: string };
      console.error('Log file write error:', errorObj);
    });
  }

  error(message: string, meta: unknown = {}) {
    return this.log('ERROR', message, meta)
  }

  warn(message: string, meta: unknown = {}) {
    return this.log('WARN', message, meta)
  }

  info(message: string, meta: unknown = {}) {
    return this.log('INFO', message, meta)
  }

  debug(message: string, meta: unknown = {}) {
    return this.log('DEBUG', message, meta)
  }
}

// Initialize log levels on startup
loadLogLevels().catch(err => {
  console.error('Failed to initialize log levels:', err)
})

// Create a request-aware logger that includes user context
const createRequestLogger = (req: unknown, category: string = 'default') => {
  const baseLogger = new Logger(category);

  // Safely get request metadata
  const getRequestMeta = (meta: unknown = {}) => {
    if (!req || typeof req !== 'object') {
      return meta
    }
    const reqObj = req as Record<string, unknown>;
    const metaObj = meta && typeof meta === 'object' ? meta as Record<string, unknown> : {};
    return {
      ...metaObj,
      requestId: reqObj['id'] || (reqObj['headers'] && (reqObj['headers'] as Record<string, unknown>)['x-request-id']) || 'unknown',
      method: reqObj['method'] || 'UNKNOWN',
      path: reqObj['path'] || reqObj['url'] || 'unknown',
      user: reqObj['user'] ? {
        id: (reqObj['user'] as { id?: unknown }).id,
        email: (reqObj['user'] as { email?: unknown }).email,
        role: (reqObj['user'] as { role?: unknown }).role
      } : null,
      ip: reqObj['ip'] || (reqObj['connection'] && (reqObj['connection'] as { remoteAddress?: unknown }).remoteAddress) || 'unknown'
    }
  }

  return {
    error: (message: string, meta: unknown = {}) => {
      return baseLogger.error(message, getRequestMeta(meta));
    },
    warn: (message: string, meta: unknown = {}) => {
      return baseLogger.warn(message, getRequestMeta(meta));
    },
    info: (message: string, meta: unknown = {}) => {
      return baseLogger.info(message, getRequestMeta(meta));
    },
    debug: (message: string, meta: unknown = {}) => {
      return baseLogger.debug(message, getRequestMeta(meta));
    },
    log: (level: string, message: string, meta: unknown = {}) => {
      return baseLogger.log(level, message, getRequestMeta(meta));
    }
  };
};

// Export logger factory and utility functions
export { Logger };
// Create a default logger instance for easy use
export const logger = new Logger('default');
// Export factory function as well
export const createLogger = (category: string = 'default') => new Logger(category);
export { createRequestLogger, refreshLogLevels, getLogLevel, LOG_DIRECTORY };

