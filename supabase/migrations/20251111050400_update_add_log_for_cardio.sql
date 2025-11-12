-- Drop old version and create new add_log function to accept cardio fields with new column names
DROP FUNCTION IF EXISTS public.add_log(text, text, text, numeric, text, integer, integer, text);

CREATE FUNCTION public.add_log(
  p_exercise_variant text,
  p_exercise_type text DEFAULT NULL::text,
  p_equipment text DEFAULT NULL::text,
  p_weight numeric DEFAULT NULL::numeric,
  p_weight_unit text DEFAULT NULL::text,
  p_repetitions integer DEFAULT NULL::integer,
  p_duration integer DEFAULT NULL::integer,
  p_effort text DEFAULT NULL::text,
  p_distance numeric DEFAULT NULL::numeric,
  p_distance_unit text DEFAULT NULL::text,
  p_resistance_level integer DEFAULT NULL::integer
)
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
$function$;
