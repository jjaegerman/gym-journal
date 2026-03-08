-- Seed: sample running data for UI testing (can be deleted after review)
DO $$
DECLARE
  v_user_id uuid;
  v_workout_id uuid;
BEGIN
  -- Get the user who has existing workouts
  SELECT user_id INTO v_user_id FROM workouts LIMIT 1;
  IF v_user_id IS NULL THEN RETURN; END IF;

  -- Helper to insert a run: creates a workout + one log
  -- Runs spread across past 8 weeks, showing gradual progression

  -- Week 8 ago: easy 3 mi shakeout
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '57 days',
    now() - interval '57 days',
    now() - interval '57 days' + interval '28 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Ran 3 miles', 'Running', '[]', 3.0, 'miles', 'PT28M', now() - interval '57 days');

  -- Week 7 ago: 4 mi
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '50 days',
    now() - interval '50 days',
    now() - interval '50 days' + interval '37 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Ran 4 miles', 'Running', '[]', 4.0, 'miles', 'PT37M', now() - interval '50 days');

  -- Week 7 ago: second run same week
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '48 days',
    now() - interval '48 days',
    now() - interval '48 days' + interval '24 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Ran 2.5 miles easy', 'Running', '[]', 2.5, 'miles', 'PT24M', now() - interval '48 days');

  -- Week 6 ago: 5 mi long run
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '43 days',
    now() - interval '43 days',
    now() - interval '43 days' + interval '46 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Ran 5 miles', 'Running', '[]', 5.0, 'miles', 'PT46M', now() - interval '43 days');

  -- Week 5 ago: 4 mi tempo
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '36 days',
    now() - interval '36 days',
    now() - interval '36 days' + interval '34 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Tempo run 4 miles', 'Running', '[]', 4.0, 'miles', 'PT34M', now() - interval '36 days');

  -- Week 5 ago: second run
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '34 days',
    now() - interval '34 days',
    now() - interval '34 days' + interval '50 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Long run 5.5 miles', 'Running', '[]', 5.5, 'miles', 'PT50M', now() - interval '34 days');

  -- Week 4 ago: 4.5 mi
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '29 days',
    now() - interval '29 days',
    now() - interval '29 days' + interval '40 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Ran 4.5 miles', 'Running', '[]', 4.5, 'miles', 'PT40M', now() - interval '29 days');

  -- Week 3 ago: 6 mi long run, best pace so far
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '22 days',
    now() - interval '22 days',
    now() - interval '22 days' + interval '51 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Long run 6 miles', 'Running', '[]', 6.0, 'miles', 'PT51M', now() - interval '22 days');

  -- Week 2 ago: 5 mi at good pace
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '15 days',
    now() - interval '15 days',
    now() - interval '15 days' + interval '42 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Ran 5 miles', 'Running', '[]', 5.0, 'miles', 'PT42M', now() - interval '15 days');

  -- Week 2 ago: easy recovery 3 mi
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '13 days',
    now() - interval '13 days',
    now() - interval '13 days' + interval '29 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Easy recovery run 3 miles', 'Running', '[]', 3.0, 'miles', 'PT29M', now() - interval '13 days');

  -- Last week: 6.5 mi long run, new distance PR
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '8 days',
    now() - interval '8 days',
    now() - interval '8 days' + interval '55 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Long run 6.5 miles', 'Running', '[]', 6.5, 'miles', 'PT55M', now() - interval '8 days');

  -- This week: 5 mi tempo, fastest pace
  INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
  VALUES (gen_random_uuid(), v_user_id,
    now() - interval '2 days',
    now() - interval '2 days',
    now() - interval '2 days' + interval '40 minutes')
  RETURNING id INTO v_workout_id;
  INSERT INTO logs (id, workout_id, input, category, modifiers, distance, distance_unit, duration, datetime)
  VALUES (gen_random_uuid(), v_workout_id, 'Tempo run 5 miles', 'Running', '[]', 5.0, 'miles', 'PT40M', now() - interval '2 days');

END $$;
