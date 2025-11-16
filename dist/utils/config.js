"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfSampleRate = exports.maxFileSizeMB = exports.maxFileSize = exports.nodeEnv = exports.databaseUrl = exports.csrfSecret = exports.jwtSecret = exports.validateProductionConfig = void 0;
const validateProductionConfig = () => {
    const errors = [];
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
            errors.push('JWT_SECRET is required in production and must be changed from default value');
        }
        if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET === 'super-secret-csrf-key-change-in-production') {
            errors.push('CSRF_SECRET is required in production and must be changed from default value');
        }
        if (!process.env.DATABASE_URL) {
            errors.push('DATABASE_URL is required in production');
        }
        if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.trim() === '') {
            console.warn('⚠️  WARNING: ALLOWED_ORIGINS not set in production. CORS will deny all origins.');
        }
    }
    if (errors.length > 0) {
        const errorMessage = `Configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`;
        throw new Error(errorMessage);
    }
};
exports.validateProductionConfig = validateProductionConfig;
const getMaxFileSize = () => {
    const mb = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
    return mb * 1024 * 1024;
};
const getPerfSampleRate = () => {
    return parseFloat(process.env.PERF_SAMPLE_RATE || '0.2');
};
exports.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
exports.csrfSecret = process.env.CSRF_SECRET || 'super-secret-csrf-key-change-in-production';
exports.databaseUrl = process.env.DATABASE_URL;
exports.nodeEnv = process.env.NODE_ENV || 'development';
exports.maxFileSize = getMaxFileSize();
exports.maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
exports.perfSampleRate = getPerfSampleRate();
//# sourceMappingURL=config.js.map