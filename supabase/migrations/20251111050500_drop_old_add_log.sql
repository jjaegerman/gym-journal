-- Drop the old add_log function without cardio parameters
DROP FUNCTION IF EXISTS public.add_log(text, text, text, numeric, text, integer, integer, text);
