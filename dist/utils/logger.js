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
exports.LOG_DIRECTORY = exports.getLogLevel = exports.refreshLogLevels = exports.createRequestLogger = exports.createLogger = exports.logger = exports.Logger = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const LOG_DIRECTORY = process.env.LOG_DIRECTORY ||
    (process.env.NODE_ENV === 'test'
        ? path_1.default.join(os_1.default.tmpdir(), 'event-manager-test-logs')
        : path_1.default.join(__dirname, '../../logs'));
exports.LOG_DIRECTORY = LOG_DIRECTORY;
const DISABLE_FILE_LOGGING = process.env.DISABLE_FILE_LOGGING === 'true' || process.env.NODE_ENV === 'test';
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};
let logLevelCache = {
    default: 'INFO',
    api: 'INFO',
    database: 'WARN',
    auth: 'INFO',
    backup: 'INFO'
};
const ensureLogDirectory = async () => {
    if (DISABLE_FILE_LOGGING) {
        return;
    }
    try {
        await promises_1.default.mkdir(LOG_DIRECTORY, { recursive: true });
    }
    catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Failed to create logs directory:', error);
        }
    }
};
const loadLogLevels = async () => {
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const settings = await prisma.systemSetting.findMany({
            where: { key: { startsWith: 'logging_' } }
        });
        logLevelCache = {
            default: 'INFO',
            api: 'INFO',
            database: 'WARN',
            auth: 'INFO',
            backup: 'INFO'
        };
        settings.forEach((setting) => {
            const key = setting.key.replace('logging_', '');
            if (key in logLevelCache) {
                logLevelCache[key] = setting.value;
            }
        });
        await prisma.$disconnect();
    }
    catch (error) {
        console.error('Failed to load log levels:', error);
    }
};
const refreshLogLevels = async () => {
    await loadLogLevels();
};
exports.refreshLogLevels = refreshLogLevels;
const getLogLevel = (category = 'default') => {
    return logLevelCache[category] || logLevelCache.default || 'INFO';
};
exports.getLogLevel = getLogLevel;
const shouldLog = (level, category = 'default') => {
    const categoryLevel = getLogLevel(category);
    const messageLevel = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
    const thresholdLevel = LOG_LEVELS[categoryLevel] ?? LOG_LEVELS.INFO;
    return messageLevel <= thresholdLevel;
};
const formatDate = (date, formatStr) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    if (formatStr === 'yyyy-MM-dd') {
        return `${year}-${month}-${day}`;
    }
    else if (formatStr === 'yyyy-MM-dd HH:mm:ss') {
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    return d.toISOString();
};
const writeToFile = async (level, category, message, meta = {}) => {
    if (DISABLE_FILE_LOGGING) {
        return;
    }
    try {
        await ensureLogDirectory();
        const timestamp = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const logDate = formatDate(new Date(), 'yyyy-MM-dd');
        const logFileName = `app-${category}-${logDate}.log`;
        const logFilePath = path_1.default.join(LOG_DIRECTORY, logFileName);
        let logEntry = `[${timestamp}] [${level}] [${category.toUpperCase()}] ${message}`;
        if (Object.keys(meta).length > 0) {
            logEntry += ` | ${JSON.stringify(meta)}`;
        }
        logEntry += '\n';
        await promises_1.default.appendFile(logFilePath, logEntry, 'utf8');
        const generalLogFile = `app-${logDate}.log`;
        const generalLogPath = path_1.default.join(LOG_DIRECTORY, generalLogFile);
        await promises_1.default.appendFile(generalLogPath, logEntry, 'utf8');
    }
    catch (error) {
        const errorObj = error;
        if (process.env.NODE_ENV !== 'test') {
            console.error(`Failed to write log to file: ${errorObj.message || 'Unknown error'}`);
        }
    }
};
class Logger {
    category;
    constructor(category = 'default') {
        this.category = category;
    }
    async log(level, message, meta = {}) {
        if (!shouldLog(level, this.category)) {
            return;
        }
        const consoleMethod = level === 'ERROR' ? console.error :
            level === 'WARN' ? console.warn :
                level === 'DEBUG' ? console.debug :
                    console.log;
        const formattedMessage = `[${this.category.toUpperCase()}] ${message}`;
        if (Object.keys(meta).length > 0) {
            consoleMethod(formattedMessage, meta);
        }
        else {
            consoleMethod(formattedMessage);
        }
        writeToFile(level, this.category, message, meta).catch((err) => {
            const errorObj = err;
            console.error('Log file write error:', errorObj);
        });
    }
    error(message, meta = {}) {
        return this.log('ERROR', message, meta);
    }
    warn(message, meta = {}) {
        return this.log('WARN', message, meta);
    }
    info(message, meta = {}) {
        return this.log('INFO', message, meta);
    }
    debug(message, meta = {}) {
        return this.log('DEBUG', message, meta);
    }
}
exports.Logger = Logger;
loadLogLevels().catch(err => {
    console.error('Failed to initialize log levels:', err);
});
const createRequestLogger = (req, category = 'default') => {
    const baseLogger = new Logger(category);
    const getRequestMeta = (meta = {}) => {
        if (!req || typeof req !== 'object') {
            return meta;
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
        };
    };
    return {
        error: (message, meta = {}) => {
            return baseLogger.error(message, getRequestMeta(meta));
        },
        warn: (message, meta = {}) => {
            return baseLogger.warn(message, getRequestMeta(meta));
        },
        info: (message, meta = {}) => {
            return baseLogger.info(message, getRequestMeta(meta));
        },
        debug: (message, meta = {}) => {
            return baseLogger.debug(message, getRequestMeta(meta));
        },
        log: (level, message, meta = {}) => {
            return baseLogger.log(level, message, getRequestMeta(meta));
        }
    };
};
exports.createRequestLogger = createRequestLogger;
exports.logger = new Logger('default');
const createLogger = (category = 'default') => new Logger(category);
exports.createLogger = createLogger;
//# sourceMappingURL=logger.js.map