/**
 * Centralized configuration validation and management
 * Validates required environment variables in production
 */

import { env } from './environment';

export const validateProductionConfig = (): void => {
  const errors: string[] = [];
  const isProduction = env.isProduction();

  if (isProduction) {
    // Validate JWT_SECRET
    const jwtSecret = env.get('JWT_SECRET');
    if (!jwtSecret || jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
      errors.push('JWT_SECRET is required in production and must be changed from default value');
    }

    // Validate CSRF_SECRET
    const csrfSecret = env.get('CSRF_SECRET');
    if (!csrfSecret || csrfSecret === 'super-secret-csrf-key-change-in-production') {
      errors.push('CSRF_SECRET is required in production and must be changed from default value');
    }

    // Validate DATABASE_URL
    const databaseUrl = env.get('DATABASE_URL');
    if (!databaseUrl) {
      errors.push('DATABASE_URL is required in production');
    }

    // Warn if CORS is too permissive (no ALLOWED_ORIGINS set)
    const allowedOrigins = env.get('ALLOWED_ORIGINS');
    if (!allowedOrigins || allowedOrigins.trim() === '') {
      console.warn('⚠️  WARNING: ALLOWED_ORIGINS not set in production. CORS will deny all origins.');
    }
  }

  if (errors.length > 0) {
    const errorMessage = `Configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(errorMessage);
  }
};

// Get max file size in bytes
const getMaxFileSize = (): number => {
  return env.get('MAX_FILE_SIZE');
};

// Get performance logging sample rate
const getPerfSampleRate = (): number => {
  return parseFloat(process.env['PERF_SAMPLE_RATE'] || '0.2');
};

// Export configuration values
export const jwtSecret: string = env.get('JWT_SECRET');
export const csrfSecret: string = env.get('CSRF_SECRET');
export const databaseUrl: string = env.get('DATABASE_URL');
export const nodeEnv: string = env.get('NODE_ENV');
export const maxFileSize: number = getMaxFileSize();
export const maxFileSizeMB: number = Math.round(env.get('MAX_FILE_SIZE') / (1024 * 1024));
export const perfSampleRate: number = getPerfSampleRate();

