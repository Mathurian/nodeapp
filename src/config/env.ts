/**
 * Typed Environment Configuration
 *
 * Provides type-safe access to environment variables with validation.
 * This module eliminates the need for bracket notation access to process.env
 * and provides IntelliSense support for all environment variables.
 *
 * @module config/env
 */

/**
 * Environment variable configuration interface
 */
interface EnvironmentConfig {
  // Environment & Application
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  PORT: number;
  APP_URL: string;
  FRONTEND_URL: string;
  API_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  ENABLE_API_DOCS: boolean;

  // Database
  DATABASE_URL: string;
  DATABASE_READ_URL?: string;
  DATABASE_MIGRATE_ON_START: boolean;
  DATABASE_SEED_ON_INIT: boolean;

  // Redis
  REDIS_URL: string;
  REDIS_ENABLE: boolean;
  REDIS_FALLBACK_TO_MEMORY: boolean;
  REDIS_PASSWORD?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_DB: number;
  REDIS_SOCKET?: string;
  REDIS_KEY_PREFIX?: string;
  REDIS_MAX_CONNECTIONS: number;

  // Authentication & Security
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  SESSION_SECRET: string;
  SESSION_TIMEOUT: number;
  SESSION_VERSION: number;
  CSRF_SECRET: string;
  CSRF_ENABLED: boolean;
  BCRYPT_ROUNDS: number;

  // MFA
  MFA_ENABLED: boolean;
  MFA_ISSUER: string;
  MFA_WINDOW: number;
  MFA_BACKUP_CODES_COUNT: number;

  // Account Security
  MAX_LOGIN_ATTEMPTS: number;
  ACCOUNT_LOCKOUT_DURATION: number;
  PASSWORD_MIN_LENGTH: number;
  PASSWORD_REQUIRE_UPPERCASE: boolean;
  PASSWORD_REQUIRE_LOWERCASE: boolean;
  PASSWORD_REQUIRE_NUMBER: boolean;
  PASSWORD_REQUIRE_SPECIAL: boolean;
  PASSWORD_EXPIRY_DAYS: number;

  // Rate Limiting
  RATE_LIMIT_ENABLED: boolean;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  AUTH_RATE_LIMIT_WINDOW_MS: number;
  AUTH_RATE_LIMIT_MAX_REQUESTS: number;
  API_RATE_LIMIT_PER_USER: number;

  // CORS & Security Headers
  ALLOWED_ORIGINS: string;
  HELMET_ENABLED: boolean;
  HELMET_CSP_ENABLED: boolean;
  XSS_PROTECTION: boolean;

  // File Upload & Virus Scanning
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string;
  CLAMAV_ENABLED: boolean;
  CLAMAV_HOST: string;
  CLAMAV_PORT: number;
  CLAMAV_SOCKET?: string;
  CLAMAV_FALLBACK_BEHAVIOR: 'allow' | 'reject';
  CLAMAV_TIMEOUT: number;
  CLAMAV_MAX_FILE_SIZE: number;
  CLAMAV_CONNECTION_RETRIES?: number;
  QUARANTINE_PATH?: string;
  SCAN_ON_UPLOAD?: boolean;
  REMOVE_INFECTED?: boolean;
  NOTIFY_ON_INFECTION?: boolean;
  FILE_ENCRYPTION_ENABLED: boolean;
  FILE_ENCRYPTION_KEY?: string;

  // Email (SMTP)
  SMTP_ENABLED: boolean;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  SMTP_FROM_NAME: string;
  EMAIL_RATE_LIMIT: number;
  EMAIL_TEMPLATE_DIR: string;
  SECURITY_EMAIL?: string;

  // Logging & Monitoring
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  LOG_FILE: string;
  LOG_ERROR_FILE: string;
  LOG_COMBINED_FILE: string;
  LOG_MAX_SIZE: string;
  LOG_MAX_FILES: number;
  LOG_DATE_PATTERN: string;
  LOG_DIRECTORY?: string;
  DISABLE_FILE_LOGGING?: boolean;
  LOG_DATABASE_QUERIES: boolean;
  LOG_SLOW_QUERIES: boolean;
  SLOW_QUERY_THRESHOLD_MS: number;
  SLOW_QUERY_THRESHOLD?: number;
  METRICS_ENABLED: boolean;
  ENABLE_METRICS?: boolean;
  METRICS_PREFIX?: string;
  METRICS_COLLECT_INTERVAL?: number;
  PROMETHEUS_ENABLED: boolean;
  PROMETHEUS_PORT: number;
  APM_ENABLED?: boolean;
  APM_SERVICE_NAME?: string;
  APM_SERVER_URL?: string;

  // Real-time (Socket.IO)
  SOCKET_ENABLED: boolean;
  SOCKET_PORT: number;
  SOCKET_PATH: string;
  SOCKET_ORIGINS: string;
  SOCKET_MAX_CONNECTIONS: number;
  SOCKET_PING_TIMEOUT: number;
  SOCKET_PING_INTERVAL: number;
  SOCKET_IO_CLUSTERING_ENABLED?: boolean;

  // Background Jobs (BullMQ)
  BULL_ENABLED: boolean;
  BULL_REDIS_URL: string;
  BULL_PREFIX: string;
  JOB_CONCURRENCY_EMAIL: number;
  JOB_CONCURRENCY_REPORT: number;
  JOB_CONCURRENCY_BACKUP: number;
  JOB_RETAIN_COMPLETED: number;
  JOB_RETAIN_FAILED: number;

  // Multi-tenancy
  MULTI_TENANT_ENABLED: boolean;
  TENANT_ID_METHOD: 'subdomain' | 'domain' | 'header';
  DEFAULT_TENANT: string;
  TENANT_ISOLATION_METHOD: 'schema' | 'database';

  // Workflow
  WORKFLOW_ENABLED: boolean;
  WORKFLOW_MAX_STEPS: number;
  WORKFLOW_DEFAULT_TIMEOUT: number;

  // Custom Fields
  CUSTOM_FIELDS_ENABLED: boolean;
  CUSTOM_FIELDS_MAX_PER_ENTITY: number;

  // Audit Trail
  EVENT_LOG_ENABLED: boolean;
  EVENT_LOG_RETENTION_DAYS: number;
  AUDIT_TRAIL_LEVEL: 'minimal' | 'standard' | 'detailed';
  AUDIT_LOG_DB_QUERIES: boolean;

  // Disaster Recovery & Backups
  DR_ENABLED: boolean;
  DR_RTO: number;
  DR_RPO: number;
  BACKUP_ENABLED: boolean;
  BACKUP_DIR: string;
  BACKUP_RETENTION_DAYS: number;
  BACKUP_ENCRYPTION_ENABLED: boolean;
  BACKUP_ENCRYPTION_KEY?: string;
  BACKUP_SCHEDULE_FULL: string;
  BACKUP_SCHEDULE_INCREMENTAL: string;
  BACKUP_S3_ENABLED?: boolean;
  BACKUP_S3_BUCKET?: string;
  BACKUP_S3_REGION?: string;
  BACKUP_S3_ACCESS_KEY_ID?: string;
  BACKUP_S3_SECRET_ACCESS_KEY?: string;
  BACKUP_AZURE_ENABLED?: boolean;
  BACKUP_AZURE_ACCOUNT_NAME?: string;
  BACKUP_AZURE_ACCOUNT_KEY?: string;
  BACKUP_AZURE_CONTAINER?: string;
  BACKUP_GCP_ENABLED?: boolean;
  BACKUP_GCP_PROJECT_ID?: string;
  BACKUP_GCP_BUCKET?: string;
  BACKUP_GCP_KEY_FILE?: string;

  // Caching
  CACHE_ENABLED: boolean;
  CACHE_TTL_DEFAULT: number;
  CACHE_TTL_SHORT: number;
  CACHE_TTL_LONG: number;
  CACHE_INVALIDATION: string;
  CACHE_PREFIX_USER: string;
  CACHE_PREFIX_EVENT: string;
  CACHE_PREFIX_SCORE: string;

  // PWA
  PWA_ENABLED: boolean;
  SW_CACHE_NAME: string;
  SW_CACHE_STATIC: boolean;
  SW_CACHE_RUNTIME: boolean;
  OFFLINE_ENABLED: boolean;
  BACKGROUND_SYNC_ENABLED: boolean;
  PUSH_NOTIFICATIONS_ENABLED: boolean;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;

  // Accessibility & UI
  WCAG_LEVEL: string;
  HIGH_CONTRAST_MODE: boolean;
  RESPECT_REDUCED_MOTION: boolean;
  DEFAULT_LOCALE: string;
  SUPPORTED_LOCALES: string;
  DEFAULT_TIMEZONE: string;

  // Performance
  DB_POOL_MIN: number;
  DB_POOL_MAX: number;
  QUERY_CACHE_ENABLED: boolean;
  QUERY_CACHE_TTL: number;
  COMPRESSION_ENABLED: boolean;
  COMPRESSION_LEVEL: number;
  STATIC_CACHE_MAX_AGE: number;
  PERF_SAMPLE_RATE?: number;

  // Development & Debugging
  DEV_MODE: boolean;
  HOT_RELOAD: boolean;
  DEBUG: boolean;
  DEBUG_NAMESPACE: string;
  SOURCE_MAPS: boolean;
  LOG_SQL_QUERIES: boolean;
  LOG_PRETTY_PRINT: boolean;
  DOCKER_ENV?: boolean;

  // External Integrations
  SLACK_ENABLED?: boolean;
  SLACK_WEBHOOK_URL?: string;
  TEAMS_ENABLED?: boolean;
  TEAMS_WEBHOOK_URL?: string;
  ZAPIER_ENABLED?: boolean;
  ZAPIER_WEBHOOK_URL?: string;
  SENTRY_DSN?: string;
  SENTRY_ENABLED?: boolean;
  SENTRY_ENVIRONMENT?: string;
  SENTRY_TRACES_SAMPLE_RATE?: number;
  SENTRY_PROFILES_SAMPLE_RATE?: number;
  SENTRY_DEBUG?: boolean;

  // Feature Flags
  FEATURE_MFA: boolean;
  FEATURE_WORKFLOWS: boolean;
  FEATURE_CUSTOM_FIELDS: boolean;
  FEATURE_EVENT_LOGS: boolean;
  FEATURE_MULTI_TENANCY: boolean;
  FEATURE_DR_MANAGEMENT: boolean;
  FEATURE_BULK_OPERATIONS: boolean;
  FEATURE_ADVANCED_SEARCH: boolean;
  FEATURE_PWA: boolean;
  FEATURE_NOTIFICATIONS: boolean;
  FEATURE_REAL_TIME: boolean;

  // Testing
  TEST_MODE: boolean;
  TEST_DATABASE_URL?: string;
  MOCK_EXTERNAL_SERVICES: boolean;
  E2E_BASE_URL?: string;
  E2E_HEADLESS?: boolean;

  // Advanced
  MAX_PAYLOAD_SIZE: number;
  REQUEST_TIMEOUT: number;
  SHUTDOWN_TIMEOUT: number;
  WORKER_THREADS: number;
  NODE_OPTIONS?: string;
}

/**
 * Parse boolean environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse integer environment variable
 */
function parseInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment variable with fallback
 */
function getString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get required environment variable (throws if missing)
 */
function getRequiredString(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Environment configuration singleton
 */
class EnvironmentConfiguration {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validate();
  }

  private loadConfig(): EnvironmentConfig {
    return {
      // Environment & Application
      NODE_ENV: (getString('NODE_ENV', 'production') as EnvironmentConfig['NODE_ENV']),
      PORT: parseInt(process.env['PORT'], 3000),
      APP_URL: getString('APP_URL', 'http://localhost:3001'),
      FRONTEND_URL: getString('FRONTEND_URL', 'http://localhost:3001'),
      API_URL: getString('API_URL', 'http://localhost:3000'),
      APP_NAME: getString('APP_NAME', 'Event Manager'),
      APP_VERSION: getString('APP_VERSION', '2.0.0'),
      ENABLE_API_DOCS: parseBoolean(process.env['ENABLE_API_DOCS'], true),

      // Database
      DATABASE_URL: getRequiredString('DATABASE_URL'),
      DATABASE_READ_URL: process.env['DATABASE_READ_URL'],
      DATABASE_MIGRATE_ON_START: parseBoolean(process.env['DATABASE_MIGRATE_ON_START'], false),
      DATABASE_SEED_ON_INIT: parseBoolean(process.env['DATABASE_SEED_ON_INIT'], false),

      // Redis
      REDIS_URL: getString('REDIS_URL', 'redis://localhost:6379'),
      REDIS_ENABLE: parseBoolean(process.env['REDIS_ENABLE'], true),
      REDIS_FALLBACK_TO_MEMORY: parseBoolean(process.env['REDIS_FALLBACK_TO_MEMORY'], true),
      REDIS_PASSWORD: process.env['REDIS_PASSWORD'],
      REDIS_DB: parseInt(process.env['REDIS_DB'], 0),
      REDIS_MAX_CONNECTIONS: parseInt(process.env['REDIS_MAX_CONNECTIONS'], 10),

      // Authentication & Security
      JWT_SECRET: getRequiredString('JWT_SECRET'),
      JWT_EXPIRES_IN: getString('JWT_EXPIRES_IN', '1h'),
      JWT_REFRESH_EXPIRES_IN: getString('JWT_REFRESH_EXPIRES_IN', '7d'),
      SESSION_SECRET: getRequiredString('SESSION_SECRET'),
      SESSION_TIMEOUT: parseInt(process.env['SESSION_TIMEOUT'], 1800000),
      SESSION_VERSION: parseInt(process.env['SESSION_VERSION'], 1),
      CSRF_SECRET: getRequiredString('CSRF_SECRET'),
      CSRF_ENABLED: parseBoolean(process.env['CSRF_ENABLED'], true),
      BCRYPT_ROUNDS: parseInt(process.env['BCRYPT_ROUNDS'], 12),

      // MFA
      MFA_ENABLED: parseBoolean(process.env['MFA_ENABLED'], true),
      MFA_ISSUER: getString('MFA_ISSUER', 'Event Manager'),
      MFA_WINDOW: parseInt(process.env['MFA_WINDOW'], 1),
      MFA_BACKUP_CODES_COUNT: parseInt(process.env['MFA_BACKUP_CODES_COUNT'], 10),

      // Account Security
      MAX_LOGIN_ATTEMPTS: parseInt(process.env['MAX_LOGIN_ATTEMPTS'], 5),
      ACCOUNT_LOCKOUT_DURATION: parseInt(process.env['ACCOUNT_LOCKOUT_DURATION'], 900000),
      PASSWORD_MIN_LENGTH: parseInt(process.env['PASSWORD_MIN_LENGTH'], 8),
      PASSWORD_REQUIRE_UPPERCASE: parseBoolean(process.env['PASSWORD_REQUIRE_UPPERCASE'], true),
      PASSWORD_REQUIRE_LOWERCASE: parseBoolean(process.env['PASSWORD_REQUIRE_LOWERCASE'], true),
      PASSWORD_REQUIRE_NUMBER: parseBoolean(process.env['PASSWORD_REQUIRE_NUMBER'], true),
      PASSWORD_REQUIRE_SPECIAL: parseBoolean(process.env['PASSWORD_REQUIRE_SPECIAL'], true),
      PASSWORD_EXPIRY_DAYS: parseInt(process.env['PASSWORD_EXPIRY_DAYS'], 90),

      // Rate Limiting
      RATE_LIMIT_ENABLED: parseBoolean(process.env['RATE_LIMIT_ENABLED'], true),
      RATE_LIMIT_WINDOW_MS: parseInt(process.env['RATE_LIMIT_WINDOW_MS'], 900000),
      RATE_LIMIT_MAX_REQUESTS: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'], 100),
      AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env['AUTH_RATE_LIMIT_WINDOW_MS'], 900000),
      AUTH_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env['AUTH_RATE_LIMIT_MAX_REQUESTS'], 5),
      API_RATE_LIMIT_PER_USER: parseInt(process.env['API_RATE_LIMIT_PER_USER'], 1000),

      // CORS & Security Headers
      ALLOWED_ORIGINS: getString('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001'),
      HELMET_ENABLED: parseBoolean(process.env['HELMET_ENABLED'], true),
      HELMET_CSP_ENABLED: parseBoolean(process.env['HELMET_CSP_ENABLED'], true),
      XSS_PROTECTION: parseBoolean(process.env['XSS_PROTECTION'], true),

      // File Upload & Virus Scanning
      UPLOAD_DIR: getString('UPLOAD_DIR', 'uploads'),
      MAX_FILE_SIZE: parseInt(process.env['MAX_FILE_SIZE'], 10485760),
      ALLOWED_FILE_TYPES: getString('ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/gif,application/pdf'),
      CLAMAV_ENABLED: parseBoolean(process.env['CLAMAV_ENABLED'], true),
      CLAMAV_HOST: getString('CLAMAV_HOST', 'localhost'),
      CLAMAV_PORT: parseInt(process.env['CLAMAV_PORT'], 3310),
      CLAMAV_SOCKET: process.env['CLAMAV_SOCKET'],
      CLAMAV_FALLBACK_BEHAVIOR: (getString('CLAMAV_FALLBACK_BEHAVIOR', 'allow') as 'allow' | 'reject'),
      CLAMAV_TIMEOUT: parseInt(process.env['CLAMAV_TIMEOUT'], 60000),
      CLAMAV_MAX_FILE_SIZE: parseInt(process.env['CLAMAV_MAX_FILE_SIZE'], 52428800),
      CLAMAV_CONNECTION_RETRIES: process.env['CLAMAV_CONNECTION_RETRIES'] ? parseInt(process.env['CLAMAV_CONNECTION_RETRIES'], 10) : undefined,
      QUARANTINE_PATH: process.env['QUARANTINE_PATH'],
      SCAN_ON_UPLOAD: process.env['SCAN_ON_UPLOAD'] !== 'false',
      REMOVE_INFECTED: process.env['REMOVE_INFECTED'] === 'true',
      NOTIFY_ON_INFECTION: process.env['NOTIFY_ON_INFECTION'] !== 'false',
      FILE_ENCRYPTION_ENABLED: parseBoolean(process.env['FILE_ENCRYPTION_ENABLED'], false),
      FILE_ENCRYPTION_KEY: process.env['FILE_ENCRYPTION_KEY'],

      // Email (SMTP)
      SMTP_ENABLED: parseBoolean(process.env['SMTP_ENABLED'], false),
      SMTP_HOST: getString('SMTP_HOST', 'smtp.example.com'),
      SMTP_PORT: parseInt(process.env['SMTP_PORT'], 587),
      SMTP_SECURE: parseBoolean(process.env['SMTP_SECURE'], false),
      SMTP_USER: getString('SMTP_USER', 'noreply@example.com'),
      SMTP_PASS: getString('SMTP_PASS', ''),
      SMTP_FROM: getString('SMTP_FROM', 'noreply@example.com'),
      SMTP_FROM_NAME: getString('SMTP_FROM_NAME', 'Event Manager'),
      EMAIL_RATE_LIMIT: parseInt(process.env['EMAIL_RATE_LIMIT'], 100),
      EMAIL_TEMPLATE_DIR: getString('EMAIL_TEMPLATE_DIR', 'src/templates/email'),
      SECURITY_EMAIL: process.env['SECURITY_EMAIL'],

      // Logging & Monitoring
      LOG_LEVEL: (getString('LOG_LEVEL', 'info') as EnvironmentConfig['LOG_LEVEL']),
      LOG_FILE: getString('LOG_FILE', 'logs/event-manager.log'),
      LOG_ERROR_FILE: getString('LOG_ERROR_FILE', 'logs/error.log'),
      LOG_COMBINED_FILE: getString('LOG_COMBINED_FILE', 'logs/combined.log'),
      LOG_MAX_SIZE: getString('LOG_MAX_SIZE', '10m'),
      LOG_MAX_FILES: parseInt(process.env['LOG_MAX_FILES'], 14),
      LOG_DATE_PATTERN: getString('LOG_DATE_PATTERN', 'YYYY-MM-DD'),
      LOG_DIRECTORY: getString('LOG_DIRECTORY', ''),
      DISABLE_FILE_LOGGING: parseBoolean(process.env['DISABLE_FILE_LOGGING'], false),
      LOG_DATABASE_QUERIES: parseBoolean(process.env['LOG_DATABASE_QUERIES'], false),
      LOG_SLOW_QUERIES: parseBoolean(process.env['LOG_SLOW_QUERIES'], true),
      SLOW_QUERY_THRESHOLD_MS: parseInt(process.env['SLOW_QUERY_THRESHOLD_MS'], 1000),
      SLOW_QUERY_THRESHOLD: parseInt(process.env['SLOW_QUERY_THRESHOLD'], parseInt(process.env['SLOW_QUERY_THRESHOLD_MS'] || '1000', 10)),
      PERF_SAMPLE_RATE: parseFloat(process.env['PERF_SAMPLE_RATE'] || '0.2'),
      METRICS_ENABLED: parseBoolean(process.env['METRICS_ENABLED'], true),
      PROMETHEUS_ENABLED: parseBoolean(process.env['PROMETHEUS_ENABLED'], true),
      PROMETHEUS_PORT: parseInt(process.env['PROMETHEUS_PORT'], 9090),
      APM_ENABLED: parseBoolean(process.env['APM_ENABLED'], false),
      APM_SERVICE_NAME: process.env['APM_SERVICE_NAME'],
      APM_SERVER_URL: process.env['APM_SERVER_URL'],

      // Real-time (Socket.IO)
      SOCKET_ENABLED: parseBoolean(process.env['SOCKET_ENABLED'], true),
      SOCKET_PORT: parseInt(process.env['SOCKET_PORT'], 3000),
      SOCKET_PATH: getString('SOCKET_PATH', '/socket.io'),
      SOCKET_ORIGINS: getString('SOCKET_ORIGINS', 'http://localhost:3000,http://localhost:3001'),
      SOCKET_MAX_CONNECTIONS: parseInt(process.env['SOCKET_MAX_CONNECTIONS'], 1000),
      SOCKET_PING_TIMEOUT: parseInt(process.env['SOCKET_PING_TIMEOUT'], 5000),
      SOCKET_PING_INTERVAL: parseInt(process.env['SOCKET_PING_INTERVAL'], 25000),

      // Background Jobs (BullMQ)
      BULL_ENABLED: parseBoolean(process.env['BULL_ENABLED'], true),
      BULL_REDIS_URL: getString('BULL_REDIS_URL', 'redis://localhost:6379'),
      BULL_PREFIX: getString('BULL_PREFIX', 'event-manager'),
      JOB_CONCURRENCY_EMAIL: parseInt(process.env['JOB_CONCURRENCY_EMAIL'], 5),
      JOB_CONCURRENCY_REPORT: parseInt(process.env['JOB_CONCURRENCY_REPORT'], 3),
      JOB_CONCURRENCY_BACKUP: parseInt(process.env['JOB_CONCURRENCY_BACKUP'], 1),
      JOB_RETAIN_COMPLETED: parseInt(process.env['JOB_RETAIN_COMPLETED'], 100),
      JOB_RETAIN_FAILED: parseInt(process.env['JOB_RETAIN_FAILED'], 500),

      // Multi-tenancy
      MULTI_TENANT_ENABLED: parseBoolean(process.env['MULTI_TENANT_ENABLED'], false),
      TENANT_ID_METHOD: (getString('TENANT_ID_METHOD', 'subdomain') as EnvironmentConfig['TENANT_ID_METHOD']),
      DEFAULT_TENANT: getString('DEFAULT_TENANT', 'default'),
      TENANT_ISOLATION_METHOD: (getString('TENANT_ISOLATION_METHOD', 'schema') as EnvironmentConfig['TENANT_ISOLATION_METHOD']),

      // Workflow
      WORKFLOW_ENABLED: parseBoolean(process.env['WORKFLOW_ENABLED'], true),
      WORKFLOW_MAX_STEPS: parseInt(process.env['WORKFLOW_MAX_STEPS'], 20),
      WORKFLOW_DEFAULT_TIMEOUT: parseInt(process.env['WORKFLOW_DEFAULT_TIMEOUT'], 168),

      // Custom Fields
      CUSTOM_FIELDS_ENABLED: parseBoolean(process.env['CUSTOM_FIELDS_ENABLED'], true),
      CUSTOM_FIELDS_MAX_PER_ENTITY: parseInt(process.env['CUSTOM_FIELDS_MAX_PER_ENTITY'], 50),

      // Audit Trail
      EVENT_LOG_ENABLED: parseBoolean(process.env['EVENT_LOG_ENABLED'], true),
      EVENT_LOG_RETENTION_DAYS: parseInt(process.env['EVENT_LOG_RETENTION_DAYS'], 365),
      AUDIT_TRAIL_LEVEL: (getString('AUDIT_TRAIL_LEVEL', 'standard') as EnvironmentConfig['AUDIT_TRAIL_LEVEL']),
      AUDIT_LOG_DB_QUERIES: parseBoolean(process.env['AUDIT_LOG_DB_QUERIES'], false),

      // Disaster Recovery & Backups
      DR_ENABLED: parseBoolean(process.env['DR_ENABLED'], true),
      DR_RTO: parseInt(process.env['DR_RTO'], 4),
      DR_RPO: parseInt(process.env['DR_RPO'], 1),
      BACKUP_ENABLED: parseBoolean(process.env['BACKUP_ENABLED'], true),
      BACKUP_DIR: getString('BACKUP_DIR', 'backups'),
      BACKUP_RETENTION_DAYS: parseInt(process.env['BACKUP_RETENTION_DAYS'], 30),
      BACKUP_ENCRYPTION_ENABLED: parseBoolean(process.env['BACKUP_ENCRYPTION_ENABLED'], false),
      BACKUP_ENCRYPTION_KEY: process.env['BACKUP_ENCRYPTION_KEY'],
      BACKUP_SCHEDULE_FULL: getString('BACKUP_SCHEDULE_FULL', '0 2 * * *'),
      BACKUP_SCHEDULE_INCREMENTAL: getString('BACKUP_SCHEDULE_INCREMENTAL', '0 * * * *'),
      BACKUP_S3_ENABLED: parseBoolean(process.env['BACKUP_S3_ENABLED'], false),
      BACKUP_S3_BUCKET: process.env['BACKUP_S3_BUCKET'],
      BACKUP_S3_REGION: process.env['BACKUP_S3_REGION'],
      BACKUP_S3_ACCESS_KEY_ID: process.env['BACKUP_S3_ACCESS_KEY_ID'],
      BACKUP_S3_SECRET_ACCESS_KEY: process.env['BACKUP_S3_SECRET_ACCESS_KEY'],
      BACKUP_AZURE_ENABLED: parseBoolean(process.env['BACKUP_AZURE_ENABLED'], false),
      BACKUP_AZURE_ACCOUNT_NAME: process.env['BACKUP_AZURE_ACCOUNT_NAME'],
      BACKUP_AZURE_ACCOUNT_KEY: process.env['BACKUP_AZURE_ACCOUNT_KEY'],
      BACKUP_AZURE_CONTAINER: process.env['BACKUP_AZURE_CONTAINER'],
      BACKUP_GCP_ENABLED: parseBoolean(process.env['BACKUP_GCP_ENABLED'], false),
      BACKUP_GCP_PROJECT_ID: process.env['BACKUP_GCP_PROJECT_ID'],
      BACKUP_GCP_BUCKET: process.env['BACKUP_GCP_BUCKET'],
      BACKUP_GCP_KEY_FILE: process.env['BACKUP_GCP_KEY_FILE'],

      // Caching
      CACHE_ENABLED: parseBoolean(process.env['CACHE_ENABLED'], true),
      CACHE_TTL_DEFAULT: parseInt(process.env['CACHE_TTL_DEFAULT'], 3600),
      CACHE_TTL_SHORT: parseInt(process.env['CACHE_TTL_SHORT'], 300),
      CACHE_TTL_LONG: parseInt(process.env['CACHE_TTL_LONG'], 86400),
      CACHE_INVALIDATION: getString('CACHE_INVALIDATION', 'event-driven'),
      CACHE_PREFIX_USER: getString('CACHE_PREFIX_USER', 'user:'),
      CACHE_PREFIX_EVENT: getString('CACHE_PREFIX_EVENT', 'event:'),
      CACHE_PREFIX_SCORE: getString('CACHE_PREFIX_SCORE', 'score:'),

      // PWA
      PWA_ENABLED: parseBoolean(process.env['PWA_ENABLED'], true),
      SW_CACHE_NAME: getString('SW_CACHE_NAME', 'event-manager-v1'),
      SW_CACHE_STATIC: parseBoolean(process.env['SW_CACHE_STATIC'], true),
      SW_CACHE_RUNTIME: parseBoolean(process.env['SW_CACHE_RUNTIME'], true),
      OFFLINE_ENABLED: parseBoolean(process.env['OFFLINE_ENABLED'], true),
      BACKGROUND_SYNC_ENABLED: parseBoolean(process.env['BACKGROUND_SYNC_ENABLED'], true),
      PUSH_NOTIFICATIONS_ENABLED: parseBoolean(process.env['PUSH_NOTIFICATIONS_ENABLED'], true),
      VAPID_PUBLIC_KEY: process.env['VAPID_PUBLIC_KEY'],
      VAPID_PRIVATE_KEY: process.env['VAPID_PRIVATE_KEY'],
      VAPID_SUBJECT: process.env['VAPID_SUBJECT'],

      // Accessibility & UI
      WCAG_LEVEL: getString('WCAG_LEVEL', 'AA'),
      HIGH_CONTRAST_MODE: parseBoolean(process.env['HIGH_CONTRAST_MODE'], true),
      RESPECT_REDUCED_MOTION: parseBoolean(process.env['RESPECT_REDUCED_MOTION'], true),
      DEFAULT_LOCALE: getString('DEFAULT_LOCALE', 'en-US'),
      SUPPORTED_LOCALES: getString('SUPPORTED_LOCALES', 'en-US,es-ES,fr-FR'),
      DEFAULT_TIMEZONE: getString('DEFAULT_TIMEZONE', 'UTC'),

      // Performance
      DB_POOL_MIN: parseInt(process.env['DB_POOL_MIN'], 2),
      DB_POOL_MAX: parseInt(process.env['DB_POOL_MAX'], 10),
      QUERY_CACHE_ENABLED: parseBoolean(process.env['QUERY_CACHE_ENABLED'], true),
      QUERY_CACHE_TTL: parseInt(process.env['QUERY_CACHE_TTL'], 600),
      COMPRESSION_ENABLED: parseBoolean(process.env['COMPRESSION_ENABLED'], true),
      COMPRESSION_LEVEL: parseInt(process.env['COMPRESSION_LEVEL'], 6),
      STATIC_CACHE_MAX_AGE: parseInt(process.env['STATIC_CACHE_MAX_AGE'], 31536000),

      // Development & Debugging
      DEV_MODE: parseBoolean(process.env['DEV_MODE'], false),
      HOT_RELOAD: parseBoolean(process.env['HOT_RELOAD'], false),
      DEBUG: parseBoolean(process.env['DEBUG'], false),
      DEBUG_NAMESPACE: getString('DEBUG_NAMESPACE', 'event-manager:*'),
      SOURCE_MAPS: parseBoolean(process.env['SOURCE_MAPS'], true),
      LOG_SQL_QUERIES: parseBoolean(process.env['LOG_SQL_QUERIES'], false),
      LOG_PRETTY_PRINT: parseBoolean(process.env['LOG_PRETTY_PRINT'], false),

      // External Integrations
      SLACK_ENABLED: parseBoolean(process.env['SLACK_ENABLED'], false),
      SLACK_WEBHOOK_URL: process.env['SLACK_WEBHOOK_URL'],
      TEAMS_ENABLED: parseBoolean(process.env['TEAMS_ENABLED'], false),
      TEAMS_WEBHOOK_URL: process.env['TEAMS_WEBHOOK_URL'],
      ZAPIER_ENABLED: parseBoolean(process.env['ZAPIER_ENABLED'], false),
      ZAPIER_WEBHOOK_URL: process.env['ZAPIER_WEBHOOK_URL'],
      SENTRY_DSN: process.env['SENTRY_DSN'],
      SENTRY_ENABLED: parseBoolean(process.env['SENTRY_ENABLED'], false),
      SENTRY_ENVIRONMENT: process.env['SENTRY_ENVIRONMENT'],
      SENTRY_TRACES_SAMPLE_RATE: parseFloat(process.env['SENTRY_TRACES_SAMPLE_RATE'] || '0.1'),

      // Feature Flags
      FEATURE_MFA: parseBoolean(process.env['FEATURE_MFA'], true),
      FEATURE_WORKFLOWS: parseBoolean(process.env['FEATURE_WORKFLOWS'], true),
      FEATURE_CUSTOM_FIELDS: parseBoolean(process.env['FEATURE_CUSTOM_FIELDS'], true),
      FEATURE_EVENT_LOGS: parseBoolean(process.env['FEATURE_EVENT_LOGS'], true),
      FEATURE_MULTI_TENANCY: parseBoolean(process.env['FEATURE_MULTI_TENANCY'], false),
      FEATURE_DR_MANAGEMENT: parseBoolean(process.env['FEATURE_DR_MANAGEMENT'], true),
      FEATURE_BULK_OPERATIONS: parseBoolean(process.env['FEATURE_BULK_OPERATIONS'], true),
      FEATURE_ADVANCED_SEARCH: parseBoolean(process.env['FEATURE_ADVANCED_SEARCH'], true),
      FEATURE_PWA: parseBoolean(process.env['FEATURE_PWA'], true),
      FEATURE_NOTIFICATIONS: parseBoolean(process.env['FEATURE_NOTIFICATIONS'], true),
      FEATURE_REAL_TIME: parseBoolean(process.env['FEATURE_REAL_TIME'], true),

      // Testing
      TEST_MODE: parseBoolean(process.env['TEST_MODE'], false),
      TEST_DATABASE_URL: process.env['TEST_DATABASE_URL'],
      MOCK_EXTERNAL_SERVICES: parseBoolean(process.env['MOCK_EXTERNAL_SERVICES'], false),
      E2E_BASE_URL: process.env['E2E_BASE_URL'],
      E2E_HEADLESS: parseBoolean(process.env['E2E_HEADLESS'], true),

      // Advanced
      MAX_PAYLOAD_SIZE: parseInt(process.env['MAX_PAYLOAD_SIZE'], 52428800),
      REQUEST_TIMEOUT: parseInt(process.env['REQUEST_TIMEOUT'], 30000),
      SHUTDOWN_TIMEOUT: parseInt(process.env['SHUTDOWN_TIMEOUT'], 10000),
      WORKER_THREADS: parseInt(process.env['WORKER_THREADS'], 4),
      NODE_OPTIONS: process.env['NODE_OPTIONS'],
    };
  }

  /**
   * Validate critical configuration
   */
  private validate(): void {
    const errors: string[] = [];

    // Validate required secrets in production
    if (this.config.NODE_ENV === 'production') {
      if (this.config.JWT_SECRET.includes('CHANGE_THIS')) {
        errors.push('JWT_SECRET must be changed from default value');
      }
      if (this.config.SESSION_SECRET.includes('CHANGE_THIS')) {
        errors.push('SESSION_SECRET must be changed from default value');
      }
      if (this.config.CSRF_SECRET.includes('CHANGE_THIS')) {
        errors.push('CSRF_SECRET must be changed from default value');
      }
    }

    // Validate port range
    if (this.config.PORT < 1 || this.config.PORT > 65535) {
      errors.push('PORT must be between 1 and 65535');
    }

    // Validate bcrypt rounds
    if (this.config.BCRYPT_ROUNDS < 10 || this.config.BCRYPT_ROUNDS > 20) {
      errors.push('BCRYPT_ROUNDS should be between 10 and 20');
    }

    if (errors.length > 0) {
      throw new Error(`Environment configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get configuration value
   */
  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key];
  }

  /**
   * Get all configuration
   */
  public getAll(): Readonly<EnvironmentConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Check if running in test mode
   */
  public isTest(): boolean {
    return this.config.NODE_ENV === 'test' || this.config.TEST_MODE;
  }
}

// Export singleton instance
export const env = new EnvironmentConfiguration();

// Export type for external use
export type { EnvironmentConfig };
