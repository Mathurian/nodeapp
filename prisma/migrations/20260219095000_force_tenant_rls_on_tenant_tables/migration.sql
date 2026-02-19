-- Force RLS so table owners (application role) do not bypass policies.
-- Without FORCE ROW LEVEL SECURITY, owner-role connections can still read/write
-- across tenants even when app.tenant_rls_mode='enforce'.

DO $$
DECLARE
  rec RECORD;
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
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', rec.table_name);
  END LOOP;
END
$$;
