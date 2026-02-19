-- Tenant RLS shadow mode
--
-- This migration enables row-level security on tenant-owned tables and installs
-- policies that are inert unless session GUC app.tenant_rls_mode='enforce'.
--
-- Policy behavior:
-- - mode != enforce: allow (shadow mode, no behavior change)
-- - mode = enforce:
--     - allow when app.is_super_admin=true
--     - allow when row.tenantId == app.tenant_id
--     - otherwise deny

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

DO $$
DECLARE
  rec RECORD;
  policy_name text;
BEGIN
  FOR rec IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenantId'
      AND c.table_name <> 'tenants'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', rec.table_name);

    policy_name := format(
      'tenant_rls_%s_%s',
      left(rec.table_name, 20),
      substring(md5(rec.table_name) from 1 for 8)
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = rec.table_name
        AND p.policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I USING (
          app_rls_mode() <> ''enforce''
          OR app_is_super_admin()
          OR COALESCE("tenantId"::text, '''') = COALESCE(app_tenant_id(), '''')
        ) WITH CHECK (
          app_rls_mode() <> ''enforce''
          OR app_is_super_admin()
          OR COALESCE("tenantId"::text, '''') = COALESCE(app_tenant_id(), '''')
        )',
        policy_name,
        rec.table_name
      );
    END IF;
  END LOOP;
END
$$;
