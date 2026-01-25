-- Fix type mismatch in get_exercise_stats: max_reps returns integer but signature expects numeric

DROP FUNCTION IF EXISTS get_exercise_stats();

CREATE OR REPLACE FUNCTION get_exercise_stats()
RETURNS TABLE(
  category text,
  modifiers jsonb,
  equipment text,

  -- All-time stats
  total_workouts bigint,
  total_volume numeric,
  total_distance numeric,
  alltime_max_weight numeric,
  alltime_max_distance numeric,
  alltime_avg_pace numeric,
  alltime_max_reps numeric,

  -- Recent 4 weeks
  recent_workouts_per_week numeric,
  recent_volume_per_week numeric,
  recent_distance_per_week numeric,
  recent_max_weight numeric,
  recent_max_distance numeric,
  recent_avg_pace numeric,
  recent_max_reps numeric,

  -- Previous 4 weeks (for trends)
  prev_workouts_per_week numeric,
  prev_volume_per_week numeric,
  prev_distance_per_week numeric,
  prev_max_weight numeric,
  prev_max_distance numeric,
  prev_avg_pace numeric,
  prev_max_reps numeric,

  last_logged timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH exercise_groups AS (
    SELECT DISTINCT
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
  ),
  alltime_stats AS (
    SELECT
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment,
      COUNT(DISTINCT w.id) as total_workouts,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as total_volume,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) as total_distance,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM l.duration::interval)::NUMERIC / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(l.repetitions) as max_reps,
      MAX(w.datetime) as last_logged
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
    GROUP BY l.category, l.modifiers, l.equipment
  ),
  recent_stats AS (
    SELECT
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM l.duration::interval)::NUMERIC / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(l.repetitions) as max_reps
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '4 weeks'
    GROUP BY l.category, l.modifiers, l.equipment
  ),
  prev_stats AS (
    SELECT
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM l.duration::interval)::NUMERIC / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(l.repetitions) as max_reps
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '8 weeks'
      AND w.datetime < NOW() - INTERVAL '4 weeks'
    GROUP BY l.category, l.modifiers, l.equipment
  )
  SELECT
    eg.category,
    eg.modifiers,
    eg.equipment,

    -- All-time
    COALESCE(at.total_workouts, 0)::bigint,
    COALESCE(at.total_volume, 0)::numeric,
    COALESCE(at.total_distance, 0)::numeric,
    at.max_weight,
    at.max_distance,
    at.avg_pace,
    at.max_reps::numeric,

    -- Recent 4 weeks
    COALESCE(r.workouts_per_week, 0)::numeric,
    COALESCE(r.volume_per_week, 0)::numeric,
    COALESCE(r.distance_per_week, 0)::numeric,
    r.max_weight,
    r.max_distance,
    r.avg_pace,
    r.max_reps::numeric,

    -- Previous 4 weeks
    COALESCE(p.workouts_per_week, 0)::numeric,
    COALESCE(p.volume_per_week, 0)::numeric,
    COALESCE(p.distance_per_week, 0)::numeric,
    p.max_weight,
    p.max_distance,
    p.avg_pace,
    p.max_reps::numeric,

    at.last_logged
  FROM exercise_groups eg
  LEFT JOIN alltime_stats at
    ON at.category = eg.category
    AND at.modifiers = eg.modifiers
    AND COALESCE(at.equipment, '') = COALESCE(eg.equipment, '')
  LEFT JOIN recent_stats r
    ON r.category = eg.category
    AND r.modifiers = eg.modifiers
    AND COALESCE(r.equipment, '') = COALESCE(eg.equipment, '')
  LEFT JOIN prev_stats p
    ON p.category = eg.category
    AND p.modifiers = eg.modifiers
    AND COALESCE(p.equipment, '') = COALESCE(eg.equipment, '')
  WHERE at.total_workouts > 0
  ORDER BY at.total_workouts DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exercise_stats() TO authenticated;

COMMENT ON FUNCTION get_exercise_stats IS
  'Returns exercise statistics grouped by {category, modifiers, equipment}';
