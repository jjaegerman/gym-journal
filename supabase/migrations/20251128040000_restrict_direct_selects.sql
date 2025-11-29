-- Remove all direct SELECT access - force all reads through SECURITY DEFINER functions

DROP POLICY IF EXISTS "Allow read access to all" ON public.workouts;
DROP POLICY IF EXISTS "Allow read access to all" ON public.exercises;
DROP POLICY IF EXISTS "Allow read access to all" ON public.logs;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Now all reads must go through SECURITY DEFINER functions:
-- - get_user_workouts(p_user_id)
-- - get_workout_details(p_workout_id)
-- - get_exercise_stats(p_user_id, p_days_back)
-- - get_user_profile_stats(p_user_id, p_days_back, p_timezone)
-- - (add profile read function later as needed)

-- Direct SELECT queries will return empty results (RLS blocks them)
-- Functions bypass RLS and control what data is exposed
