revoke delete on table "public"."exercises" from "anon";

revoke insert on table "public"."exercises" from "anon";

revoke references on table "public"."exercises" from "anon";

revoke select on table "public"."exercises" from "anon";

revoke trigger on table "public"."exercises" from "anon";

revoke truncate on table "public"."exercises" from "anon";

revoke update on table "public"."exercises" from "anon";

revoke delete on table "public"."exercises" from "authenticated";

revoke insert on table "public"."exercises" from "authenticated";

revoke references on table "public"."exercises" from "authenticated";

revoke select on table "public"."exercises" from "authenticated";

revoke trigger on table "public"."exercises" from "authenticated";

revoke truncate on table "public"."exercises" from "authenticated";

revoke update on table "public"."exercises" from "authenticated";

revoke delete on table "public"."exercises" from "service_role";

revoke insert on table "public"."exercises" from "service_role";

revoke references on table "public"."exercises" from "service_role";

revoke select on table "public"."exercises" from "service_role";

revoke trigger on table "public"."exercises" from "service_role";

revoke truncate on table "public"."exercises" from "service_role";

revoke update on table "public"."exercises" from "service_role";

revoke delete on table "public"."logs" from "anon";

revoke insert on table "public"."logs" from "anon";

revoke references on table "public"."logs" from "anon";

revoke select on table "public"."logs" from "anon";

revoke trigger on table "public"."logs" from "anon";

revoke truncate on table "public"."logs" from "anon";

revoke update on table "public"."logs" from "anon";

revoke delete on table "public"."logs" from "authenticated";

revoke insert on table "public"."logs" from "authenticated";

revoke references on table "public"."logs" from "authenticated";

revoke select on table "public"."logs" from "authenticated";

revoke trigger on table "public"."logs" from "authenticated";

revoke truncate on table "public"."logs" from "authenticated";

revoke update on table "public"."logs" from "authenticated";

revoke delete on table "public"."logs" from "service_role";

revoke insert on table "public"."logs" from "service_role";

revoke references on table "public"."logs" from "service_role";

revoke select on table "public"."logs" from "service_role";

revoke trigger on table "public"."logs" from "service_role";

revoke truncate on table "public"."logs" from "service_role";

revoke update on table "public"."logs" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."workouts" from "anon";

revoke insert on table "public"."workouts" from "anon";

revoke references on table "public"."workouts" from "anon";

revoke select on table "public"."workouts" from "anon";

revoke trigger on table "public"."workouts" from "anon";

revoke truncate on table "public"."workouts" from "anon";

revoke update on table "public"."workouts" from "anon";

revoke delete on table "public"."workouts" from "authenticated";

revoke insert on table "public"."workouts" from "authenticated";

revoke references on table "public"."workouts" from "authenticated";

revoke select on table "public"."workouts" from "authenticated";

revoke trigger on table "public"."workouts" from "authenticated";

revoke truncate on table "public"."workouts" from "authenticated";

revoke update on table "public"."workouts" from "authenticated";

revoke delete on table "public"."workouts" from "service_role";

revoke insert on table "public"."workouts" from "service_role";

revoke references on table "public"."workouts" from "service_role";

revoke select on table "public"."workouts" from "service_role";

revoke trigger on table "public"."workouts" from "service_role";

revoke truncate on table "public"."workouts" from "service_role";

revoke update on table "public"."workouts" from "service_role";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_log(p_exercise_name text, p_weight numeric DEFAULT NULL::numeric, p_weight_unit text DEFAULT NULL::text, p_repetitions integer DEFAULT NULL::integer, p_duration integer DEFAULT NULL::integer, p_effort text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.add_log(p_exercise_variant text, p_exercise_type text DEFAULT NULL::text, p_equipment text DEFAULT NULL::text, p_weight numeric DEFAULT NULL::numeric, p_weight_unit text DEFAULT NULL::text, p_repetitions integer DEFAULT NULL::integer, p_duration integer DEFAULT NULL::integer, p_effort text DEFAULT NULL::text, p_distance numeric DEFAULT NULL::numeric, p_distance_unit text DEFAULT NULL::text, p_resistance_level integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_current_streak(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_longest_streak(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_exercise_stats(p_user_id uuid, p_days_back integer DEFAULT 90)
 RETURNS TABLE(exercise_type text, total_workouts bigint, total_sets bigint, max_weight numeric, max_reps integer, max_volume numeric, avg_weight numeric, workouts_per_week numeric, first_logged timestamp with time zone, last_logged timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_profile_stats(p_user_id uuid, p_days_back integer DEFAULT 90, p_timezone text DEFAULT 'UTC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_workouts(p_user_id uuid)
 RETURNS TABLE(id uuid, datetime timestamp with time zone, "exerciseCount" bigint, "logCount" bigint, "mostRecentLog" timestamp with time zone, "exercisePreview" jsonb, "totalVolume" numeric, "totalDistance" numeric, "distanceUnit" text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_workout_details(p_workout_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.user_id := auth.uid();
  return new;
end;
$function$
;


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  create policy "Anyone can upload an avatar."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'avatars'::text));



  create policy "Avatar images are publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



