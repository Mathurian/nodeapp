"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorSeverity = void 0;
exports.trackError = trackError;
exports.getErrorStats = getErrorStats;
exports.getErrorsBySeverity = getErrorsBySeverity;
exports.getErrorsInTimeRange = getErrorsInTimeRange;
exports.clearOldErrors = clearOldErrors;
exports.exportErrors = exportErrors;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
class ErrorTracker {
    errors = [];
    maxErrors = 1000;
    errorLogPath;
    constructor() {
        const logDir = process.env.NODE_ENV === 'test'
            ? path_1.default.join(process.env.LOG_DIRECTORY || require('os').tmpdir(), 'event-manager-test-logs')
            : path_1.default.join(process.cwd(), 'logs');
        this.errorLogPath = path_1.default.join(logDir, 'errors.json');
        this.ensureLogDirectory();
        this.loadErrorsFromDisk();
    }
    async ensureLogDirectory() {
        const logDir = path_1.default.dirname(this.errorLogPath);
        try {
            await promises_1.default.mkdir(logDir, { recursive: true });
        }
        catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Failed to create log directory:', error);
            }
        }
    }
    async loadErrorsFromDisk() {
        try {
            const data = await promises_1.default.readFile(this.errorLogPath, 'utf-8');
            const loaded = JSON.parse(data);
            if (Array.isArray(loaded)) {
                this.errors = loaded.slice(-this.maxErrors);
            }
        }
        catch (error) {
            this.errors = [];
        }
    }
    async saveErrorsToDisk() {
        if (process.env.NODE_ENV === 'test' || process.env.DISABLE_FILE_LOGGING === 'true') {
            return;
        }
        try {
            await promises_1.default.writeFile(this.errorLogPath, JSON.stringify(this.errors, null, 2), 'utf-8');
        }
        catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Failed to save errors to disk:', error);
            }
        }
    }
    async trackError(error, severity = ErrorSeverity.MEDIUM, context) {
        const errorEntry = {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            severity,
            message: error?.message || String(error),
            stack: error?.stack,
            context,
            error: this.sanitizeError(error)
        };
        this.errors.push(errorEntry);
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }
        this.logToConsole(errorEntry);
        this.saveErrorsToDisk().catch(console.error);
        if (process.env.NODE_ENV === 'production' && severity === ErrorSeverity.CRITICAL) {
            this.notifyCriticalError(errorEntry);
        }
        return errorEntry.id;
    }
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    sanitizeError(error) {
        if (!error)
            return null;
        const sanitized = {
            name: error.name,
            message: error.message,
            code: error.code
        };
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
        if (error.context) {
            sanitized.context = { ...error.context };
            sensitiveFields.forEach(field => {
                if (field in sanitized.context) {
                    sanitized.context[field] = '[REDACTED]';
                }
            });
        }
        return sanitized;
    }
    logToConsole(errorEntry) {
        const severityColors = {
            [ErrorSeverity.LOW]: '\x1b[36m',
            [ErrorSeverity.MEDIUM]: '\x1b[33m',
            [ErrorSeverity.HIGH]: '\x1b[35m',
            [ErrorSeverity.CRITICAL]: '\x1b[31m'
        };
        const color = severityColors[errorEntry.severity];
        const reset = '\x1b[0m';
        console.error(`${color}[${errorEntry.severity.toUpperCase()}]${reset} ` +
            `[${errorEntry.timestamp}] ` +
            `${errorEntry.message}`);
        if (errorEntry.context?.requestId) {
            console.error(`  Request ID: ${errorEntry.context.requestId}`);
        }
        if (errorEntry.stack && process.env.NODE_ENV === 'development') {
            console.error(errorEntry.stack);
        }
    }
    async notifyCriticalError(errorEntry) {
        console.error(`🚨 CRITICAL ERROR DETECTED: ${errorEntry.id}`);
    }
    getStats() {
        const bySeverity = {
            [ErrorSeverity.LOW]: 0,
            [ErrorSeverity.MEDIUM]: 0,
            [ErrorSeverity.HIGH]: 0,
            [ErrorSeverity.CRITICAL]: 0
        };
        this.errors.forEach(err => {
            bySeverity[err.severity]++;
        });
        const errorCounts = new Map();
        this.errors.forEach(err => {
            const count = errorCounts.get(err.message) || 0;
            errorCounts.set(err.message, count + 1);
        });
        const topErrors = Array.from(errorCounts.entries())
            .map(([message, count]) => ({ message, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return {
            total: this.errors.length,
            bySeverity,
            recent: this.errors.slice(-20).reverse(),
            topErrors
        };
    }
    getErrorsBySeverity(severity) {
        return this.errors.filter(err => err.severity === severity);
    }
    getErrorsInTimeRange(startDate, endDate) {
        return this.errors.filter(err => {
            const errDate = new Date(err.timestamp);
            return errDate >= startDate && errDate <= endDate;
        });
    }
    async clearOldErrors(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const originalLength = this.errors.length;
        this.errors = this.errors.filter(err => {
            const errDate = new Date(err.timestamp);
            return errDate >= cutoffDate;
        });
        const removed = originalLength - this.errors.length;
        if (removed > 0) {
            await this.saveErrorsToDisk();
            console.log(`Cleared ${removed} old errors (older than ${daysToKeep} days)`);
        }
        return removed;
    }
    async exportErrors(filePath) {
        await promises_1.default.writeFile(filePath, JSON.stringify(this.errors, null, 2), 'utf-8');
    }
}
const errorTracker = new ErrorTracker();
function trackError(error, severity = ErrorSeverity.MEDIUM, context) {
    return errorTracker.trackError(error, severity, context);
}
function getErrorStats() {
    return errorTracker.getStats();
}
function getErrorsBySeverity(severity) {
    return errorTracker.getErrorsBySeverity(severity);
}
function getErrorsInTimeRange(startDate, endDate) {
    return errorTracker.getErrorsInTimeRange(startDate, endDate);
}
function clearOldErrors(daysToKeep = 30) {
    return errorTracker.clearOldErrors(daysToKeep);
}
function exportErrors(filePath) {
    return errorTracker.exportErrors(filePath);
}
exports.default = errorTracker;
//# sourceMappingURL=errorTracking.js.map