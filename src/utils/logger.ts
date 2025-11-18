import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Use environment variable for log directory, or default to project logs directory
// In test environment, use temp directory to avoid permission issues
const LOG_DIRECTORY = process.env.LOG_DIRECTORY || 
  (process.env.NODE_ENV === 'test' 
    ? path.join(os.tmpdir(), 'event-manager-test-logs')
    : path.join(__dirname, '../../logs'))
const DISABLE_FILE_LOGGING = process.env.DISABLE_FILE_LOGGING === 'true' || process.env.NODE_ENV === 'test'
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

// Ensure logs directory exists
const ensureLogDirectory = async () => {
  // Skip in test environment if file logging is disabled
  if (DISABLE_FILE_LOGGING) {
    return;
  }
  
  try {
    await fs.mkdir(LOG_DIRECTORY, { recursive: true })
  } catch (error) {
    // In test environment, silently fail
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to create logs directory:', error)
    }
  }
}

// Load log levels from database (with caching)
const loadLogLevels = async () => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
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
    
    await prisma.$disconnect()
  } catch (error) {
    // Silently fail - use defaults
    console.error('Failed to load log levels:', error)
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
const writeToFile = async (level: string, category: string, message: string, meta: Record<string, unknown> = {}): Promise<void> => {
  // Skip file writing if disabled (e.g., in test environment with permission issues)
  if (DISABLE_FILE_LOGGING) {
    return;
  }

  try {
    await ensureLogDirectory()
    
    const timestamp = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')
    const logDate = formatDate(new Date(), 'yyyy-MM-dd')
    
    // Create category-specific log file
    const logFileName = `app-${category}-${logDate}.log`
    const logFilePath = path.join(LOG_DIRECTORY, logFileName)
    
    // Format log entry
    let logEntry = `[${timestamp}] [${level}] [${category.toUpperCase()}] ${message}`
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logEntry += ` | ${JSON.stringify(meta)}`
    }
    
    logEntry += '\n'
    
    // Append to file
    await fs.appendFile(logFilePath, logEntry, 'utf8')
    
    // Also write to general log file
    const generalLogFile = `app-${logDate}.log`
    const generalLogPath = path.join(LOG_DIRECTORY, generalLogFile)
    await fs.appendFile(generalLogPath, logEntry, 'utf8')
    
  } catch (error: unknown) {
    // Fallback to console if file writing fails (don't throw in test environment)
    const errorObj = error as { message?: string; code?: string };
    if (process.env.NODE_ENV !== 'test') {
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

  async log(level: string, message: string, meta: Record<string, unknown> = {}) {
    // Check if we should log this message
    if (!shouldLog(level, this.category)) {
      return
    }
    
    // Always output to console for immediate visibility
    const consoleMethod = level === 'ERROR' ? console.error : 
                         level === 'WARN' ? console.warn :
                         level === 'DEBUG' ? console.debug :
                         console.log
    
    const formattedMessage = `[${this.category.toUpperCase()}] ${message}`
    if (Object.keys(meta).length > 0) {
      consoleMethod(formattedMessage, meta)
    } else {
      consoleMethod(formattedMessage)
    }
    
    // Write to file asynchronously (don't await to avoid blocking)
    writeToFile(level, this.category, message, meta).catch((err: unknown) => {
      const errorObj = err as { message?: string };
      console.error('Log file write error:', errorObj);
    });
  }

  error(message: string, meta: Record<string, unknown> = {}) {
    return this.log('ERROR', message, meta)
  }

  warn(message: string, meta: Record<string, unknown> = {}) {
    return this.log('WARN', message, meta)
  }

  info(message: string, meta: Record<string, unknown> = {}) {
    return this.log('INFO', message, meta)
  }

  debug(message: string, meta: Record<string, unknown> = {}) {
    return this.log('DEBUG', message, meta)
  }
}

// Initialize log levels on startup
loadLogLevels().catch(err => {
  console.error('Failed to initialize log levels:', err)
})

// Create a request-aware logger that includes user context
const createRequestLogger = (req: Record<string, unknown>, category: string = 'default') => {
  const baseLogger = new Logger(category);

  // Safely get request metadata
  const getRequestMeta = (meta: Record<string, unknown> = {}) => {
    if (!req || typeof req !== 'object') {
      return meta
    }
    return {
      ...meta,
      requestId: req.id || (req.headers && req.headers['x-request-id']) || 'unknown',
      method: req.method || 'UNKNOWN',
      path: req.path || req.url || 'unknown',
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null,
      ip: req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'
    }
  }
  
  return {
    error: (message: string, meta: Record<string, unknown> = {}) => {
      return baseLogger.error(message, getRequestMeta(meta));
    },
    warn: (message: string, meta: Record<string, unknown> = {}) => {
      return baseLogger.warn(message, getRequestMeta(meta));
    },
    info: (message: string, meta: Record<string, unknown> = {}) => {
      return baseLogger.info(message, getRequestMeta(meta));
    },
    debug: (message: string, meta: Record<string, unknown> = {}) => {
      return baseLogger.debug(message, getRequestMeta(meta));
    },
    log: (level: string, message: string, meta: Record<string, unknown> = {}) => {
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

