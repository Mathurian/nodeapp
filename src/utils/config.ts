/**
 * Centralized configuration validation and management
 * Validates required environment variables in production
 */

export const validateProductionConfig = (): void => {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Validate JWT_SECRET
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      errors.push('JWT_SECRET is required in production and must be changed from default value');
    }

    // Validate CSRF_SECRET
    if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET === 'super-secret-csrf-key-change-in-production') {
      errors.push('CSRF_SECRET is required in production and must be changed from default value');
    }

    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }

    // Warn if CORS is too permissive (no ALLOWED_ORIGINS set)
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.trim() === '') {
      console.warn('⚠️  WARNING: ALLOWED_ORIGINS not set in production. CORS will deny all origins.');
    }
  }

  if (errors.length > 0) {
    const errorMessage = `Configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(errorMessage);
  }
};

// Get max file size in bytes (default 20MB)
const getMaxFileSize = (): number => {
  const mb = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
  return mb * 1024 * 1024;
};

// Get performance logging sample rate (default 0.2 = 20%)
const getPerfSampleRate = (): number => {
  return parseFloat(process.env.PERF_SAMPLE_RATE || '0.2');
};

// Export configuration values
export const jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key';
export const csrfSecret: string = process.env.CSRF_SECRET || 'super-secret-csrf-key-change-in-production';
export const databaseUrl: string | undefined = process.env.DATABASE_URL;
export const nodeEnv: string = process.env.NODE_ENV || 'development';
export const maxFileSize: number = getMaxFileSize();
export const maxFileSizeMB: number = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
export const perfSampleRate: number = getPerfSampleRate();

