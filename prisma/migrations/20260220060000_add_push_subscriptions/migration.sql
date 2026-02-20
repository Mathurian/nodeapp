-- Add persistent web push subscription storage with tenant-aware isolation.

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "expirationTime" TIMESTAMP(3),
  "userAgent" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_tenantId_endpoint_key"
  ON "push_subscriptions"("tenantId", "endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_tenantId_idx"
  ON "push_subscriptions"("tenantId");
CREATE INDEX IF NOT EXISTS "push_subscriptions_tenantId_userId_isActive_idx"
  ON "push_subscriptions"("tenantId", "userId", "isActive");
CREATE INDEX IF NOT EXISTS "push_subscriptions_tenantId_userId_idx"
  ON "push_subscriptions"("tenantId", "userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_userId_fkey'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_tenantId_fkey'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_tenantId_fkey"
      FOREIGN KEY ("tenantId")
      REFERENCES "tenants"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- Keep new table aligned with tenant RLS enforcement used across tenant-owned tables.
CREATE OR REPLACE FUNCTION app_rls_mode()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.tenant_rls_mode', true), ''), 'off')
$$;

CREATE OR REPLACE FUNCTION app_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_super_admin', true), ''), 'false') = 'true'
$$;

ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'tenant_rls_push_subscriptions'
  ) THEN
    CREATE POLICY tenant_rls_push_subscriptions
      ON "push_subscriptions"
      USING (
        app_rls_mode() <> 'enforce'
        OR app_is_super_admin()
        OR COALESCE("tenantId"::text, '') = COALESCE(app_tenant_id(), '')
      )
      WITH CHECK (
        app_rls_mode() <> 'enforce'
        OR app_is_super_admin()
        OR COALESCE("tenantId"::text, '') = COALESCE(app_tenant_id(), '')
      );
  END IF;
END
$$;
