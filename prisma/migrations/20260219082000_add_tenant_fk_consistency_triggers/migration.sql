-- Enforce tenant consistency across parent/child relationships where both
-- tables carry tenantId and child references parent.id via a single-column FK.
--
-- This is additive and safe for rollout:
-- - Existing rows are not rewritten.
-- - New inserts/updates are guarded against cross-tenant linkage.

CREATE OR REPLACE FUNCTION enforce_tenant_fk_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_table_name text := TG_ARGV[0];
  child_fk_column_name text := TG_ARGV[1];
  child_tenant_id text;
  child_fk_value text;
  parent_tenant_id text;
BEGIN
  child_tenant_id := to_jsonb(NEW) ->> 'tenantId';
  IF child_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  child_fk_value := to_jsonb(NEW) ->> child_fk_column_name;
  IF child_fk_value IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT "tenantId"::text FROM %I WHERE id::text = $1 LIMIT 1',
    parent_table_name
  )
  INTO parent_tenant_id
  USING child_fk_value;

  -- Parent existence is already enforced by the regular FK path.
  IF parent_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF parent_tenant_id <> child_tenant_id THEN
    RAISE EXCEPTION
      USING ERRCODE = '23514',
            MESSAGE = format(
              'Tenant consistency violation: %I.%I references %I(id) across tenants (%s != %s)',
              TG_TABLE_NAME,
              child_fk_column_name,
              parent_table_name,
              child_tenant_id,
              parent_tenant_id
            );
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  rec RECORD;
  trigger_name text;
BEGIN
  FOR rec IN
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_column,
      ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_schema = kcu.constraint_schema
     AND tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_schema = tc.constraint_schema
     AND ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.column_name = 'id'
      AND kcu.column_name <> 'tenantId'
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns child_cols
        WHERE child_cols.table_schema = 'public'
          AND child_cols.table_name = tc.table_name
          AND child_cols.column_name = 'tenantId'
      )
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns parent_cols
        WHERE parent_cols.table_schema = 'public'
          AND parent_cols.table_name = ccu.table_name
          AND parent_cols.column_name = 'tenantId'
      )
      AND 1 = (
        SELECT count(*)
        FROM information_schema.key_column_usage fk_cols
        WHERE fk_cols.constraint_schema = tc.constraint_schema
          AND fk_cols.constraint_name = tc.constraint_name
      )
    ORDER BY tc.table_name, kcu.column_name
  LOOP
    trigger_name := format(
      'tg_tenant_fk_%s_%s',
      left(rec.child_table, 18),
      substring(md5(rec.child_table || ':' || rec.child_column || '->' || rec.parent_table) from 1 for 8)
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class cls
        ON cls.oid = t.tgrelid
      JOIN pg_namespace ns
        ON ns.oid = cls.relnamespace
      WHERE ns.nspname = 'public'
        AND cls.relname = rec.child_table
        AND t.tgname = trigger_name
        AND NOT t.tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF "tenantId", %I ON %I FOR EACH ROW EXECUTE FUNCTION enforce_tenant_fk_consistency(%L, %L)',
        trigger_name,
        rec.child_column,
        rec.child_table,
        rec.parent_table,
        rec.child_column
      );
    END IF;
  END LOOP;
END
$$;
