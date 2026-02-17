-- Add tenant FK coverage incrementally for every table containing tenantId.
-- Constraints are NOT VALID so existing data is not scanned immediately.
-- New writes are still checked.

DO $$
DECLARE
  rec RECORD;
  fk_name text;
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
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_schema = kcu.constraint_schema
         AND tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_schema = tc.constraint_schema
         AND ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = c.table_name
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'tenantId'
          AND ccu.table_name = 'tenants'
          AND ccu.column_name = 'id'
      )
    ORDER BY c.table_name
  LOOP
    fk_name := format('fk_%s_tenant_%s', left(rec.table_name, 24), substring(md5(rec.table_name) from 1 for 8));

    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE NOT VALID',
      rec.table_name,
      fk_name
    );
  END LOOP;
END
$$;

-- Optional follow-up in a low-traffic window:
-- ALTER TABLE <table_name> VALIDATE CONSTRAINT <constraint_name>;
