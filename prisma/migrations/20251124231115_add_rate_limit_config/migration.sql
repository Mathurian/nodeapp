-- CreateTable
CREATE TABLE "rate_limit_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT,
    "tenantId" TEXT,
    "userId" TEXT,
    "endpoint" TEXT,
    "requestsPerHour" INTEGER NOT NULL DEFAULT 1000,
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 50,
    "burstLimit" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "rate_limit_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_configs_tenantId_idx" ON "rate_limit_configs"("tenantId");

-- CreateIndex
CREATE INDEX "rate_limit_configs_userId_idx" ON "rate_limit_configs"("userId");

-- CreateIndex
CREATE INDEX "rate_limit_configs_tier_idx" ON "rate_limit_configs"("tier");

-- CreateIndex
CREATE INDEX "rate_limit_configs_endpoint_idx" ON "rate_limit_configs"("endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_configs_tenantId_userId_idx" ON "rate_limit_configs"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "rate_limit_configs_tenantId_endpoint_idx" ON "rate_limit_configs"("tenantId", "endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_configs_enabled_idx" ON "rate_limit_configs"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_configs_tenantId_userId_endpoint_key" ON "rate_limit_configs"("tenantId", "userId", "endpoint");

-- AddForeignKey
ALTER TABLE "rate_limit_configs" ADD CONSTRAINT "rate_limit_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limit_configs" ADD CONSTRAINT "rate_limit_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default tier configurations
INSERT INTO "rate_limit_configs" ("id", "name", "tier", "requestsPerHour", "requestsPerMinute", "burstLimit", "enabled", "priority", "description", "createdAt", "updatedAt") VALUES
  ('default_free', 'Free Tier Default', 'free', 100, 10, 20, true, 0, 'Default rate limits for free tier users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default_standard', 'Standard Tier Default', 'standard', 1000, 50, 100, true, 0, 'Default rate limits for standard tier users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default_premium', 'Premium Tier Default', 'premium', 5000, 200, 400, true, 0, 'Default rate limits for premium tier users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default_enterprise', 'Enterprise Tier Default', 'enterprise', 10000, 500, 1000, true, 0, 'Default rate limits for enterprise tier users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default_internal', 'Internal/Admin Default', 'internal', 100000, 5000, 10000, true, 0, 'Default rate limits for internal/admin operations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert endpoint-specific configurations
INSERT INTO "rate_limit_configs" ("id", "name", "tier", "endpoint", "requestsPerHour", "requestsPerMinute", "burstLimit", "enabled", "priority", "description", "createdAt", "updatedAt") VALUES
  ('endpoint_auth_login', 'Auth Login Limit', NULL, '/api/auth/login', 20, 5, 10, true, 100, 'Strict limits for login endpoint to prevent brute force', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endpoint_auth_register', 'Auth Register Limit', NULL, '/api/auth/register', 10, 2, 5, true, 100, 'Strict limits for registration to prevent spam accounts', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endpoint_auth_reset', 'Password Reset Limit', NULL, '/api/auth/reset-password', 5, 1, 3, true, 100, 'Very strict limits for password reset to prevent email bombing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endpoint_file_upload', 'File Upload Limit', NULL, '/api/files/upload', 100, 10, 20, true, 50, 'Moderate limits for file uploads (resource intensive)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endpoint_report_gen', 'Report Generation Limit', NULL, '/api/reports/generate', 50, 5, 10, true, 50, 'Moderate limits for report generation (CPU intensive)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
