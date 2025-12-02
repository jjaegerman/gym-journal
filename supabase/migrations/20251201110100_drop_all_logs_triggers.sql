-- Drop ALL triggers on logs table to fix updated_at error

-- Drop by specific names we know might exist
DROP TRIGGER IF EXISTS update_logs_updated_at ON logs;
DROP TRIGGER IF EXISTS set_updated_at ON logs;
DROP TRIGGER IF EXISTS set_updated_at_logs ON logs;
DROP TRIGGER IF EXISTS handle_updated_at ON logs;

-- Drop any trigger that calls set_updated_at function
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT tgname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'logs'
      AND t.tgisinternal = false
      AND pg_get_triggerdef(t.oid) LIKE '%set_updated_at%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON logs', trigger_record.tgname);
    RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
  END LOOP;
END $$;

-- Also ensure logs table doesn't have updated_at column
ALTER TABLE logs DROP COLUMN IF EXISTS updated_at;

COMMENT ON TABLE logs IS
  'Exercise logs - no updated_at tracking (immutable records)';
