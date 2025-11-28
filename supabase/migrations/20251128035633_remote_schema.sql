


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_log"("p_exercise_name" "text", "p_weight" numeric DEFAULT NULL::numeric, "p_weight_unit" "text" DEFAULT NULL::"text", "p_repetitions" integer DEFAULT NULL::integer, "p_duration" integer DEFAULT NULL::integer, "p_effort" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_exercise_id uuid;
  v_log_id uuid;
begin
  -- 1️⃣ Find most recent workout within the last hour for this user
  select id into v_workout_id
  from workouts
  where user_id = v_user_id
    and datetime > now() - interval '1 hour'
  order by datetime desc
  limit 1;

  -- 2️⃣ If no recent workout, create one
  if v_workout_id is null then
    insert into workouts (user_id, datetime)
    values (v_user_id, now())
    returning id into v_workout_id;
  end if;

  -- 3️⃣ Find existing exercise in that workout (case-insensitive match)
  select id into v_exercise_id
  from exercises
  where workout_id = v_workout_id
    and lower(name) = lower(p_exercise_name)
  limit 1;

  -- 4️⃣ If exercise doesn't exist, create it
  if v_exercise_id is null then
    insert into exercises (workout_id, name, datetime)
    values (v_workout_id, p_exercise_name, now())
    returning id into v_exercise_id;
  end if;

  -- 5️⃣ Insert the log
  insert into logs (
    exercise_id,
    datetime,
    weight,
    weight_unit,
    repetitions,
    duration,
    effort
  )
  values (
    v_exercise_id,
    now(),
    p_weight,
    p_weight_unit,
    p_repetitions,
    p_duration,
    p_effort
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;


ALTER FUNCTION "public"."add_log"("p_exercise_name" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_log"("p_exercise_variant" "text", "p_exercise_type" "text" DEFAULT NULL::"text", "p_equipment" "text" DEFAULT NULL::"text", "p_weight" numeric DEFAULT NULL::numeric, "p_weight_unit" "text" DEFAULT NULL::"text", "p_repetitions" integer DEFAULT NULL::integer, "p_duration" integer DEFAULT NULL::integer, "p_effort" "text" DEFAULT NULL::"text", "p_distance" numeric DEFAULT NULL::numeric, "p_distance_unit" "text" DEFAULT NULL::"text", "p_resistance_level" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_exercise_id uuid;
  v_log_id uuid;
begin
  -- 1️⃣ Find most recent workout within the last hour for this user
  select id into v_workout_id
  from workouts
  where user_id = v_user_id
    and datetime > now() - interval '1 hour'
  order by datetime desc
  limit 1;

  -- 2️⃣ If no recent workout, create one
  if v_workout_id is null then
    insert into workouts (user_id, datetime)
    values (v_user_id, now())
    returning id into v_workout_id;
  end if;

  -- 3️⃣ Find existing exercise in that workout (case-insensitive match on variant)
  select id into v_exercise_id
  from exercises
  where workout_id = v_workout_id
    and lower(variant) = lower(p_exercise_variant)
  limit 1;

  -- 4️⃣ If exercise doesn't exist, create it with type and equipment
  if v_exercise_id is null then
    insert into exercises (workout_id, variant, type, equipment, datetime)
    values (v_workout_id, p_exercise_variant, p_exercise_type, p_equipment, now())
    returning id into v_exercise_id;
  else
    -- If exercise exists, update type and equipment if they're provided
    if p_exercise_type is not null or p_equipment is not null then
      update exercises
      set
        type = COALESCE(p_exercise_type, type),
        equipment = COALESCE(p_equipment, equipment)
      where id = v_exercise_id;
    end if;
  end if;

  -- 5️⃣ Insert the log with all fields including cardio metrics
  insert into logs (
    exercise_id,
    datetime,
    weight,
    weight_unit,
    repetitions,
    duration,
    effort,
    distance,
    distance_unit,
    resistance_level
  )
  values (
    v_exercise_id,
    now(),
    p_weight,
    p_weight_unit,
    p_repetitions,
    p_duration,
    p_effort,
    p_distance,
    p_distance_unit,
    p_resistance_level
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;


ALTER FUNCTION "public"."add_log"("p_exercise_variant" "text", "p_exercise_type" "text", "p_equipment" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text", "p_distance" numeric, "p_distance_unit" "text", "p_resistance_level" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_current_streak"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  current_streak integer := 0;
  check_date date := CURRENT_DATE;
  has_workout boolean;
BEGIN
  LOOP
    -- Check if user worked out on this date
    SELECT EXISTS(
      SELECT 1 FROM workouts
      WHERE user_id = p_user_id
        AND DATE(datetime) = check_date
    ) INTO has_workout;

    IF has_workout THEN
      current_streak := current_streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      -- Allow 1 day grace (today might not have workout yet)
      IF check_date = CURRENT_DATE THEN
        check_date := check_date - INTERVAL '1 day';
        CONTINUE;
      END IF;
      EXIT;
    END IF;
  END LOOP;

  RETURN current_streak;
END;
$$;


ALTER FUNCTION "public"."calculate_current_streak"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_longest_streak"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  max_streak integer := 0;
  current_streak integer := 0;
  prev_date date;
  workout_date date;
BEGIN
  FOR workout_date IN
    SELECT DISTINCT DATE(datetime) as workout_date
    FROM workouts
    WHERE user_id = p_user_id
    ORDER BY workout_date ASC
  LOOP
    IF prev_date IS NULL OR workout_date = prev_date + INTERVAL '1 day' THEN
      current_streak := current_streak + 1;
      max_streak := GREATEST(max_streak, current_streak);
    ELSE
      current_streak := 1;
    END IF;
    prev_date := workout_date;
  END LOOP;

  RETURN max_streak;
END;
$$;


ALTER FUNCTION "public"."calculate_longest_streak"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exercise_stats"("p_user_id" "uuid", "p_days_back" integer DEFAULT 90) RETURNS TABLE("exercise_type" "text", "total_workouts" bigint, "total_sets" bigint, "max_weight" numeric, "max_reps" integer, "max_volume" numeric, "avg_weight" numeric, "workouts_per_week" numeric, "first_logged" timestamp with time zone, "last_logged" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(e.type, 'Other') as exercise_type,
    COUNT(DISTINCT w.id) as total_workouts,
    COUNT(l.id) as total_sets,
    MAX(l.weight) as max_weight,
    MAX(l.repetitions) as max_reps,
    MAX(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as max_volume,
    AVG(l.weight) as avg_weight,
    (COUNT(DISTINCT w.id)::numeric /
      GREATEST(1, EXTRACT(EPOCH FROM (MAX(w.datetime) - MIN(w.datetime))) / 604800)
    ) as workouts_per_week,
    MIN(w.datetime) as first_logged,
    MAX(w.datetime) as last_logged
  FROM workouts w
  JOIN exercises e ON e.workout_id = w.id
  JOIN logs l ON l.exercise_id = e.id
  WHERE w.user_id = p_user_id
    AND w.datetime >= NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY e.type
  ORDER BY COUNT(DISTINCT w.id) DESC;
END;
$$;


ALTER FUNCTION "public"."get_exercise_stats"("p_user_id" "uuid", "p_days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile_stats"("p_user_id" "uuid", "p_days_back" integer DEFAULT 90, "p_timezone" "text" DEFAULT 'UTC'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  result jsonb;
  total_workouts_count integer;
  total_hours_count numeric;
  workouts_30_days integer;
  workouts_7_days integer;
  current_streak_val integer;
  longest_streak_val integer;
  avg_workouts_per_week numeric;
  most_common_day text;
BEGIN
  -- Calculate basic stats with workout duration
  -- Duration = time between first and last log in a workout
  WITH workout_durations AS (
    SELECT
      w.id,
      w.datetime,
      EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/3600 as duration_hours
    FROM workouts w
    LEFT JOIN exercises e ON e.workout_id = w.id
    LEFT JOIN logs l ON l.exercise_id = e.id
    WHERE w.user_id = p_user_id
      AND w.datetime >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY w.id, w.datetime
  )
  SELECT
    COUNT(DISTINCT id),
    COALESCE(SUM(duration_hours), 0),
    COUNT(DISTINCT id) FILTER (WHERE datetime >= NOW() - INTERVAL '30 days'),
    COUNT(DISTINCT id) FILTER (WHERE datetime >= NOW() - INTERVAL '7 days')
  INTO
    total_workouts_count,
    total_hours_count,
    workouts_30_days,
    workouts_7_days
  FROM workout_durations;

  -- Calculate streaks
  SELECT calculate_current_streak(p_user_id) INTO current_streak_val;
  SELECT calculate_longest_streak(p_user_id) INTO longest_streak_val;

  -- Calculate average workouts per week (last 12 weeks)
  SELECT
    (COUNT(DISTINCT w.id)::numeric / 12)
  INTO avg_workouts_per_week
  FROM workouts w
  WHERE w.user_id = p_user_id
    AND w.datetime >= NOW() - INTERVAL '12 weeks';

  -- Find most common workout day (converted to user's timezone)
  SELECT
    TO_CHAR(w.datetime AT TIME ZONE p_timezone, 'Day')
  INTO most_common_day
  FROM workouts w
  WHERE w.user_id = p_user_id
  GROUP BY TO_CHAR(w.datetime AT TIME ZONE p_timezone, 'Day'), EXTRACT(DOW FROM w.datetime AT TIME ZONE p_timezone)
  ORDER BY COUNT(*) DESC, EXTRACT(DOW FROM w.datetime AT TIME ZONE p_timezone)
  LIMIT 1;

  -- Build result
  result := jsonb_build_object(
    'total_workouts', total_workouts_count,
    'total_hours', ROUND(total_hours_count, 1),
    'workouts_last_30_days', workouts_30_days,
    'workouts_last_7_days', workouts_7_days,
    'current_streak_days', current_streak_val,
    'longest_streak_days', longest_streak_val,
    'avg_workouts_per_week', ROUND(avg_workouts_per_week, 1),
    'most_common_day', TRIM(COALESCE(most_common_day, 'N/A'))
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_profile_stats"("p_user_id" "uuid", "p_days_back" integer, "p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_workouts"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "datetime" timestamp with time zone, "exerciseCount" bigint, "logCount" bigint, "mostRecentLog" timestamp with time zone, "exercisePreview" "jsonb", "totalVolume" numeric, "totalDistance" numeric, "distanceUnit" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.datetime,
    COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL), 0) as "exerciseCount",
    COALESCE(COUNT(l.id), 0) as "logCount",
    COALESCE(MAX(l.datetime), w.datetime) as "mostRecentLog",

    -- Exercise preview: top 3 exercise types/names as JSON array
    (
      SELECT COALESCE(
        jsonb_agg(exercise_name),
        '[]'::jsonb
      )
      FROM (
        SELECT COALESCE(e.type, e.variant) as exercise_name
        FROM exercises e
        WHERE e.workout_id = w.id
        GROUP BY COALESCE(e.type, e.variant)
        ORDER BY MIN(e.datetime)
        LIMIT 3
      ) e2
    ) as "exercisePreview",

    -- Total volume (weight * reps summed)
    COALESCE(
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0))
      FILTER (WHERE l.weight IS NOT NULL AND l.repetitions IS NOT NULL),
      0
    ) as "totalVolume",

    -- Total distance (sum of all distance logs)
    COALESCE(
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL),
      0
    ) as "totalDistance",

    -- Distance unit (use the most common one in the workout)
    (
      SELECT l2.distance_unit
      FROM logs l2
      JOIN exercises e2 ON e2.id = l2.exercise_id
      WHERE e2.workout_id = w.id AND l2.distance_unit IS NOT NULL
      GROUP BY l2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit"

  FROM workouts w
  LEFT JOIN exercises e ON e.workout_id = w.id
  LEFT JOIN logs l ON l.exercise_id = e.id
  WHERE w.user_id = p_user_id
  GROUP BY w.id, w.datetime
  ORDER BY w.datetime DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_workouts"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workout_details"("p_workout_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', w.id,
    'datetime', w.datetime,
    'exercises', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'variant', e.variant,
          'type', e.type,
          'equipment', e.equipment,
          'logs', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'datetime', l.datetime,
                'weight', l.weight,
                'weightUnit', l.weight_unit,
                'repetitions', l.repetitions,
                'distance', l.distance,
                'distance_unit', l.distance_unit,
                'resistance_level', l.resistance_level,
                'duration', l.duration,
                'effort', l.effort
              )
              ORDER BY l.datetime
            ), '[]'::jsonb)
            FROM logs l
            WHERE l.exercise_id = e.id
          )
        )
        ORDER BY e.datetime
      ), '[]'::jsonb
    )
  )
  INTO v_result
  FROM workouts w
  LEFT JOIN exercises e ON e.workout_id = w.id
  WHERE w.id = p_workout_id
  GROUP BY w.id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_workout_details"("p_workout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_user_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "variant" "text" NOT NULL,
    "datetime" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text",
    "equipment" "text"
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exercises"."variant" IS 'Specific exercise variant with all modifiers (e.g., Barbell Back Squat)';



COMMENT ON COLUMN "public"."exercises"."type" IS 'Exercise type/category (e.g., Squat, Bench Press, Deadlift)';



COMMENT ON COLUMN "public"."exercises"."equipment" IS 'Primary equipment used (e.g., Barbell, Dumbbell, Bodyweight)';



CREATE TABLE IF NOT EXISTS "public"."logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "datetime" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weight" numeric,
    "weight_unit" "text",
    "repetitions" integer,
    "duration" integer,
    "effort" "text",
    "distance" numeric,
    "distance_unit" "text",
    "resistance_level" integer,
    CONSTRAINT "logs_effort_check" CHECK (("effort" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "logs_weight_unit_check" CHECK (("weight_unit" = ANY (ARRAY['kg'::"text", 'lbs'::"text"])))
);


ALTER TABLE "public"."logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."logs"."distance" IS 'Distance covered (for cardio exercises)';



COMMENT ON COLUMN "public"."logs"."distance_unit" IS 'Unit of distance (miles, km, meters)';



COMMENT ON COLUMN "public"."logs"."resistance_level" IS 'Resistance/incline/damper level (for cardio equipment)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "datetime" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "exercises_workout_id_datetime_idx" ON "public"."exercises" USING "btree" ("workout_id", "datetime" DESC);



CREATE INDEX "idx_exercises_type" ON "public"."exercises" USING "btree" ("type");



CREATE INDEX "logs_exercise_id_datetime_idx" ON "public"."logs" USING "btree" ("exercise_id", "datetime" DESC);



CREATE INDEX "workouts_user_datetime_idx" ON "public"."workouts" USING "btree" ("user_id", "datetime" DESC);



CREATE OR REPLACE TRIGGER "set_user_id_before_insert" BEFORE INSERT ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id"();



CREATE OR REPLACE TRIGGER "update_workouts_updated_at" BEFORE UPDATE ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "fk_parent" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "fk_parent" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow read access to all" ON "public"."exercises" FOR SELECT USING (true);



CREATE POLICY "Allow read access to all" ON "public"."logs" FOR SELECT USING (true);



CREATE POLICY "Allow read access to all" ON "public"."workouts" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can delete exercises only for their workouts" ON "public"."exercises" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "exercises"."workout_id") AND ("w"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete logs only for their exercises" ON "public"."logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."exercises" "e"
     JOIN "public"."workouts" "w" ON (("w"."id" = "e"."workout_id")))
  WHERE (("e"."id" = "logs"."exercise_id") AND ("w"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own workouts" ON "public"."workouts" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert exercises only for their workouts" ON "public"."exercises" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "exercises"."workout_id") AND ("w"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert logs only for their exercises" ON "public"."logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."exercises" "e"
     JOIN "public"."workouts" "w" ON (("w"."id" = "e"."workout_id")))
  WHERE (("e"."id" = "logs"."exercise_id") AND ("w"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert their own workouts" ON "public"."workouts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can modify exercises only for their workouts" ON "public"."exercises" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "exercises"."workout_id") AND ("w"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can modify logs only for their exercises" ON "public"."logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."exercises" "e"
     JOIN "public"."workouts" "w" ON (("w"."id" = "e"."workout_id")))
  WHERE (("e"."id" = "logs"."exercise_id") AND ("w"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can modify their own workouts" ON "public"."workouts" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_log"("p_exercise_name" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_log"("p_exercise_name" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_log"("p_exercise_name" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_log"("p_exercise_variant" "text", "p_exercise_type" "text", "p_equipment" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text", "p_distance" numeric, "p_distance_unit" "text", "p_resistance_level" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_log"("p_exercise_variant" "text", "p_exercise_type" "text", "p_equipment" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text", "p_distance" numeric, "p_distance_unit" "text", "p_resistance_level" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_log"("p_exercise_variant" "text", "p_exercise_type" "text", "p_equipment" "text", "p_weight" numeric, "p_weight_unit" "text", "p_repetitions" integer, "p_duration" integer, "p_effort" "text", "p_distance" numeric, "p_distance_unit" "text", "p_resistance_level" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_current_streak"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_current_streak"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_current_streak"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_longest_streak"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_longest_streak"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_longest_streak"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exercise_stats"("p_user_id" "uuid", "p_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercise_stats"("p_user_id" "uuid", "p_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercise_stats"("p_user_id" "uuid", "p_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile_stats"("p_user_id" "uuid", "p_days_back" integer, "p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile_stats"("p_user_id" "uuid", "p_days_back" integer, "p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile_stats"("p_user_id" "uuid", "p_days_back" integer, "p_timezone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_workouts"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_workouts"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_workouts"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workout_details"("p_workout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workout_details"("p_workout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workout_details"("p_workout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_id"() TO "service_role";


















GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."logs" TO "anon";
GRANT ALL ON TABLE "public"."logs" TO "authenticated";
GRANT ALL ON TABLE "public"."logs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
