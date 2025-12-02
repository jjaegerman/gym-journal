-- Force drop all triggers by querying pg_trigger directly

DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  -- Drop all triggers on workouts, logs, and workout_submissions tables
  FOR trigger_record IN
    SELECT
      t.tgname AS trigger_name,
      c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('workouts', 'logs', 'workout_submissions')
      AND t.tgisinternal = false
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER %I ON %I', trigger_record.trigger_name, trigger_record.table_name);
      RAISE NOTICE 'Dropped trigger % on table %', trigger_record.trigger_name, trigger_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop trigger % on table %: %', trigger_record.trigger_name, trigger_record.table_name, SQLERRM;
    END;
  END LOOP;
END $$;
