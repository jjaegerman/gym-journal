-- Seed script: Realistic workout data with periodization and variation
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

DO $$
DECLARE
  v_user_id uuid;
  v_workout_id uuid;
  v_submission_id uuid;
  v_date timestamp with time zone;
  v_day_num int;
  v_week_num int;
  v_phase text;
  v_phase_week int;
  v_is_deload boolean;
  v_intensity numeric;
  v_volume_mult numeric;
  v_rep_target int;
BEGIN
  -- Get the first user from profiles
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found. Please sign up first.';
  END IF;

  RAISE NOTICE 'Clearing existing data for user: %', v_user_id;

  -- Delete existing data
  DELETE FROM logs WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = v_user_id);
  DELETE FROM workout_submissions WHERE user_id = v_user_id;
  DELETE FROM workouts WHERE user_id = v_user_id;

  RAISE NOTICE 'Seeding realistic data...';

  -- Generate ~52 weeks of training
  FOR v_week_num IN 0..51 LOOP

    -- Determine training phase (12-week cycles: 8 hypertrophy, 3 strength, 1 deload)
    v_phase_week := v_week_num % 12;
    IF v_phase_week < 8 THEN
      v_phase := 'hypertrophy';
      v_rep_target := 10 + floor(random() * 3)::int; -- 10-12 reps
      v_intensity := 0.65 + (v_phase_week * 0.02); -- 65-79%
      v_volume_mult := 1.0;
    ELSIF v_phase_week < 11 THEN
      v_phase := 'strength';
      v_rep_target := 4 + floor(random() * 3)::int; -- 4-6 reps
      v_intensity := 0.80 + ((v_phase_week - 8) * 0.05); -- 80-90%
      v_volume_mult := 0.8;
    ELSE
      v_phase := 'deload';
      v_rep_target := 8;
      v_intensity := 0.5;
      v_volume_mult := 0.5;
    END IF;

    v_is_deload := v_phase = 'deload';

    -- Progressive overload across the year (base multiplier)
    v_intensity := v_intensity * (1.0 + (v_week_num::numeric / 400));

    -- 3-5 workouts per week depending on phase
    FOR v_day_num IN 1..5 LOOP
      -- Skip some days (more consistent in strength phase, less in deload)
      IF (v_phase = 'strength' AND random() > 0.15) OR
         (v_phase = 'hypertrophy' AND random() > 0.25) OR
         (v_phase = 'deload' AND random() > 0.5 AND v_day_num <= 3) THEN

        -- Calculate date
        v_date := now() - ((51 - v_week_num) * 7 + (5 - v_day_num)) * interval '1 day';
        v_date := v_date + (floor(random() * 5) + 6) * interval '1 hour';

        -- Create workout
        INSERT INTO workouts (id, user_id, datetime, started_at, ended_at)
        VALUES (gen_random_uuid(), v_user_id, v_date, v_date, v_date + interval '75 min')
        RETURNING id INTO v_workout_id;

        -- Create submission
        INSERT INTO workout_submissions (id, user_id, workout_id, submission_type, raw_text, ai_response, model_version, prompt_version, created_at)
        VALUES (gen_random_uuid(), v_user_id, v_workout_id, 'text', 'Seeded workout', '{}', 'seed-v2', 'seed-v2', v_date)
        RETURNING id INTO v_submission_id;

        -- DAY 1: Push (Chest/Shoulders/Triceps)
        IF v_day_num = 1 THEN
          -- Main compound: Bench variations rotate by phase cycle
          IF (v_week_num / 12) % 3 = 0 THEN
            -- Cycle 1: Flat barbell focus
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Barbell bench press', 'Bench Press', '[]', 'Barbell', round((175 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Barbell bench press', 'Bench Press', '[]', 'Barbell', round((185 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '4 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Barbell bench press', 'Bench Press', '[]', 'Barbell', round((195 * v_intensity)::numeric, -1), 'lbs', greatest(v_rep_target - 2, 3), v_date + interval '8 min');
          ELSIF (v_week_num / 12) % 3 = 1 THEN
            -- Cycle 2: Incline dumbbell focus
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Incline dumbbell press', 'Bench Press', '["Incline"]', 'Dumbbell', round((65 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Incline dumbbell press', 'Bench Press', '["Incline"]', 'Dumbbell', round((70 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '3 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Incline dumbbell press', 'Bench Press', '["Incline"]', 'Dumbbell', round((75 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '6 min');
          ELSE
            -- Cycle 3: Close grip for tricep emphasis
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Close grip bench press', 'Bench Press', '["Close Grip"]', 'Barbell', round((155 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Close grip bench press', 'Bench Press', '["Close Grip"]', 'Barbell', round((165 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '4 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Close grip bench press', 'Bench Press', '["Close Grip"]', 'Barbell', round((175 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '8 min');
          END IF;

          -- Secondary press (skip on deload)
          IF NOT v_is_deload THEN
            IF random() > 0.5 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Standing overhead press', 'Overhead Press', '["Standing"]', 'Barbell', round((95 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '15 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Standing overhead press', 'Overhead Press', '["Standing"]', 'Barbell', round((105 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '18 min');
            ELSE
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Seated dumbbell press', 'Overhead Press', '["Seated"]', 'Dumbbell', round((50 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '15 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Seated dumbbell press', 'Overhead Press', '["Seated"]', 'Dumbbell', round((55 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '18 min');
            END IF;
          END IF;

          -- Isolation work (hypertrophy phase only has more volume)
          IF v_phase = 'hypertrophy' THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Cable flyes', 'Chest Fly', '["Cable Crossover"]', 'Cable Machine', round((25 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '25 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Cable flyes', 'Chest Fly', '["Cable Crossover"]', 'Cable Machine', round((30 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '27 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Lateral raises', 'Lateral Raise', '[]', 'Dumbbell', round((15 * v_intensity)::numeric, 0), 'lbs', 15, v_date + interval '32 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Lateral raises', 'Lateral Raise', '[]', 'Dumbbell', round((15 * v_intensity)::numeric, 0), 'lbs', 15, v_date + interval '34 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Lateral raises', 'Lateral Raise', '[]', 'Dumbbell', round((15 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '36 min');
          END IF;

          -- Triceps
          IF NOT v_is_deload THEN
            IF random() > 0.5 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Tricep pushdowns', 'Tricep Extension', '["Pushdown"]', 'Cable Machine', round((50 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '42 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Tricep pushdowns', 'Tricep Extension', '["Pushdown"]', 'Cable Machine', round((55 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '44 min');
            ELSE
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Skull crushers', 'Tricep Extension', '["Skull Crusher"]', 'EZ Bar', round((45 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '42 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Skull crushers', 'Tricep Extension', '["Skull Crusher"]', 'EZ Bar', round((50 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '44 min');
            END IF;
          END IF;

        -- DAY 2: Pull (Back/Biceps)
        ELSIF v_day_num = 2 THEN
          -- Main pull: Deadlift variations
          IF v_phase = 'strength' THEN
            -- Heavy conventional in strength phase
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Conventional deadlift', 'Deadlift', '["Conventional"]', 'Barbell', round((315 * v_intensity)::numeric, -1), 'lbs', 3, v_date),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Conventional deadlift', 'Deadlift', '["Conventional"]', 'Barbell', round((335 * v_intensity)::numeric, -1), 'lbs', 3, v_date + interval '5 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Conventional deadlift', 'Deadlift', '["Conventional"]', 'Barbell', round((355 * v_intensity)::numeric, -1), 'lbs', 2, v_date + interval '10 min');
          ELSIF NOT v_is_deload THEN
            IF (v_week_num / 12) % 2 = 0 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Conventional deadlift', 'Deadlift', '["Conventional"]', 'Barbell', round((275 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Conventional deadlift', 'Deadlift', '["Conventional"]', 'Barbell', round((295 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '4 min');
            ELSE
              -- Sumo variation in alternate cycles
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Sumo deadlift', 'Deadlift', '["Sumo"]', 'Barbell', round((265 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Sumo deadlift', 'Deadlift', '["Sumo"]', 'Barbell', round((285 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '4 min');
            END IF;
          END IF;

          -- Rows
          IF random() > 0.4 THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Barbell rows', 'Row', '[]', 'Barbell', round((135 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '18 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Barbell rows', 'Row', '[]', 'Barbell', round((155 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '21 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Barbell rows', 'Row', '[]', 'Barbell', round((165 * v_intensity)::numeric, -1), 'lbs', v_rep_target - 2, v_date + interval '24 min');
          ELSE
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell rows', 'Row', '["Single Arm"]', 'Dumbbell', round((65 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '18 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell rows', 'Row', '["Single Arm"]', 'Dumbbell', round((70 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '21 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell rows', 'Row', '["Single Arm"]', 'Dumbbell', round((75 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '24 min');
          END IF;

          -- Vertical pull
          IF v_week_num > 20 THEN
            -- After 20 weeks, sometimes do weighted pull-ups
            IF random() > 0.6 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Weighted pull-ups', 'Pull-up', '["Weighted"]', NULL, round((25 * v_intensity)::numeric, 0), 'lbs', 8, v_date + interval '32 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Weighted pull-ups', 'Pull-up', '["Weighted"]', NULL, round((35 * v_intensity)::numeric, 0), 'lbs', 6, v_date + interval '35 min');
            ELSE
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Pull-ups', 'Pull-up', '[]', NULL, NULL, NULL, 10, v_date + interval '32 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Pull-ups', 'Pull-up', '[]', NULL, NULL, NULL, 8, v_date + interval '35 min');
            END IF;
          ELSE
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Lat pulldown', 'Lat Pulldown', '[]', 'Cable Machine', round((120 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '32 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Lat pulldown', 'Lat Pulldown', '[]', 'Cable Machine', round((130 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '35 min');
          END IF;

          -- Biceps (more in hypertrophy)
          IF v_phase = 'hypertrophy' THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'EZ bar curls', 'Bicep Curl', '[]', 'EZ Bar', round((55 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '42 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'EZ bar curls', 'Bicep Curl', '[]', 'EZ Bar', round((60 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '44 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Hammer curls', 'Bicep Curl', '["Hammer"]', 'Dumbbell', round((25 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '48 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Hammer curls', 'Bicep Curl', '["Hammer"]', 'Dumbbell', round((25 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '50 min');
          ELSIF NOT v_is_deload THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell curls', 'Bicep Curl', '[]', 'Dumbbell', round((25 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '42 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell curls', 'Bicep Curl', '[]', 'Dumbbell', round((30 * v_intensity)::numeric, 0), 'lbs', 8, v_date + interval '44 min');
          END IF;

          -- Face pulls for shoulder health
          IF NOT v_is_deload THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Face pulls', 'Rear Delt', '["Face Pull"]', 'Cable Machine', round((30 * v_intensity)::numeric, 0), 'lbs', 15, v_date + interval '54 min');
          END IF;

        -- DAY 3: Legs
        ELSIF v_day_num = 3 THEN
          -- Main squat variation
          IF v_phase = 'strength' THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Back squat', 'Squat', '["Back"]', 'Barbell', round((275 * v_intensity)::numeric, -1), 'lbs', 3, v_date),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Back squat', 'Squat', '["Back"]', 'Barbell', round((295 * v_intensity)::numeric, -1), 'lbs', 3, v_date + interval '5 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Back squat', 'Squat', '["Back"]', 'Barbell', round((315 * v_intensity)::numeric, -1), 'lbs', 2, v_date + interval '10 min');
          ELSIF NOT v_is_deload THEN
            IF (v_week_num / 12) % 3 = 0 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Back squat', 'Squat', '["Back"]', 'Barbell', round((225 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Back squat', 'Squat', '["Back"]', 'Barbell', round((245 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '4 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Back squat', 'Squat', '["Back"]', 'Barbell', round((255 * v_intensity)::numeric, -1), 'lbs', v_rep_target - 2, v_date + interval '8 min');
            ELSIF (v_week_num / 12) % 3 = 1 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Front squat', 'Squat', '["Front"]', 'Barbell', round((175 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Front squat', 'Squat', '["Front"]', 'Barbell', round((185 * v_intensity)::numeric, -1), 'lbs', v_rep_target, v_date + interval '4 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Front squat', 'Squat', '["Front"]', 'Barbell', round((195 * v_intensity)::numeric, -1), 'lbs', v_rep_target - 2, v_date + interval '8 min');
            ELSE
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Goblet squat', 'Squat', '["Goblet"]', 'Kettlebell', round((60 * v_intensity)::numeric, 0), 'lbs', v_rep_target, v_date),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Goblet squat', 'Squat', '["Goblet"]', 'Kettlebell', round((70 * v_intensity)::numeric, 0), 'lbs', v_rep_target, v_date + interval '3 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Goblet squat', 'Squat', '["Goblet"]', 'Kettlebell', round((70 * v_intensity)::numeric, 0), 'lbs', v_rep_target, v_date + interval '6 min');
            END IF;
          END IF;

          -- Hip hinge accessory
          IF NOT v_is_deload THEN
            IF random() > 0.5 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Romanian deadlift', 'Hip Hinge', '["Romanian"]', 'Barbell', round((165 * v_intensity)::numeric, -1), 'lbs', 10, v_date + interval '18 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Romanian deadlift', 'Hip Hinge', '["Romanian"]', 'Barbell', round((185 * v_intensity)::numeric, -1), 'lbs', 10, v_date + interval '21 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Romanian deadlift', 'Hip Hinge', '["Romanian"]', 'Barbell', round((195 * v_intensity)::numeric, -1), 'lbs', 8, v_date + interval '24 min');
            ELSE
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell RDL', 'Hip Hinge', '["Romanian"]', 'Dumbbell', round((55 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '18 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell RDL', 'Hip Hinge', '["Romanian"]', 'Dumbbell', round((60 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '21 min');
            END IF;
          END IF;

          -- Lunges / Split squats
          IF v_phase = 'hypertrophy' THEN
            IF random() > 0.5 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Walking lunges', 'Lunge', '[]', 'Dumbbell', round((40 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '32 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Walking lunges', 'Lunge', '[]', 'Dumbbell', round((45 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '35 min');
            ELSE
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Bulgarian split squat', 'Lunge', '["Bulgarian"]', 'Dumbbell', round((35 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '32 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Bulgarian split squat', 'Lunge', '["Bulgarian"]', 'Dumbbell', round((40 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '35 min');
            END IF;
          END IF;

          -- Leg curl
          IF NOT v_is_deload THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Lying leg curl', 'Leg Curl', '["Lying"]', 'Weight Machine', round((80 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '42 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Lying leg curl', 'Leg Curl', '["Lying"]', 'Weight Machine', round((90 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '44 min');
          END IF;

          -- Leg extension (hypertrophy only)
          IF v_phase = 'hypertrophy' THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Leg extension', 'Leg Extension', '[]', 'Weight Machine', round((100 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '50 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Leg extension', 'Leg Extension', '[]', 'Weight Machine', round((110 * v_intensity)::numeric, 0), 'lbs', 10, v_date + interval '52 min');
          END IF;

          -- Calf raises
          IF NOT v_is_deload THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Standing calf raises', 'Calf Raise', '["Standing"]', 'Weight Machine', round((200 * v_intensity)::numeric, -1), 'lbs', 15, v_date + interval '56 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Seated calf raises', 'Calf Raise', '["Seated"]', 'Weight Machine', round((90 * v_intensity)::numeric, 0), 'lbs', 15, v_date + interval '58 min');
          END IF;

        -- DAY 4: Upper (lighter, more accessories)
        ELSIF v_day_num = 4 AND NOT v_is_deload THEN
          -- Dips or Push-ups
          IF random() > 0.5 THEN
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dips', 'Dip', '[]', NULL, NULL, NULL, 12, v_date),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dips', 'Dip', '[]', NULL, NULL, NULL, 12, v_date + interval '2 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Dips', 'Dip', '[]', NULL, NULL, NULL, 10, v_date + interval '4 min');
          ELSE
            INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Push-ups', 'Push-up', '[]', NULL, NULL, NULL, 20, v_date),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Push-ups', 'Push-up', '[]', NULL, NULL, NULL, 18, v_date + interval '2 min'),
              (gen_random_uuid(), v_workout_id, v_submission_id, 'Incline push-ups', 'Push-up', '["Incline"]', NULL, NULL, NULL, 15, v_date + interval '4 min');
          END IF;

          -- Cable/machine work
          INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Seated cable rows', 'Row', '["Seated"]', 'Cable Machine', round((130 * v_intensity)::numeric, -1), 'lbs', 12, v_date + interval '12 min'),
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Seated cable rows', 'Row', '["Seated"]', 'Cable Machine', round((140 * v_intensity)::numeric, -1), 'lbs', 10, v_date + interval '15 min');

          -- Shoulders
          INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Lateral raises', 'Lateral Raise', '[]', 'Dumbbell', round((15 * v_intensity)::numeric, 0), 'lbs', 15, v_date + interval '22 min'),
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Lateral raises', 'Lateral Raise', '[]', 'Dumbbell', round((15 * v_intensity)::numeric, 0), 'lbs', 15, v_date + interval '24 min'),
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Rear delt fly', 'Rear Delt', '[]', 'Dumbbell', round((15 * v_intensity)::numeric, 0), 'lbs', 15, v_date + interval '28 min');

          -- Shrugs
          INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell shrugs', 'Shrug', '[]', 'Dumbbell', round((70 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '34 min'),
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Dumbbell shrugs', 'Shrug', '[]', 'Dumbbell', round((75 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '36 min');

          -- Arms superset
          INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, weight, weight_unit, repetitions, datetime) VALUES
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Cable curls', 'Bicep Curl', '[]', 'Cable Machine', round((40 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '42 min'),
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Tricep pushdowns', 'Tricep Extension', '["Pushdown"]', 'Cable Machine', round((45 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '43 min'),
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Cable curls', 'Bicep Curl', '[]', 'Cable Machine', round((40 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '45 min'),
            (gen_random_uuid(), v_workout_id, v_submission_id, 'Tricep pushdowns', 'Tricep Extension', '["Pushdown"]', 'Cable Machine', round((45 * v_intensity)::numeric, 0), 'lbs', 12, v_date + interval '46 min');

        -- DAY 5: Cardio/Core (optional, more frequent in certain months)
        ELSIF v_day_num = 5 THEN
          -- More cardio in "cut" months (weeks 20-32)
          IF v_week_num BETWEEN 20 AND 32 THEN
            IF random() > 0.3 THEN
              IF random() > 0.5 THEN
                INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, distance, distance_unit, duration, datetime) VALUES
                  (gen_random_uuid(), v_workout_id, v_submission_id, 'Treadmill run', 'Running', '[]', 'Treadmill', round((2.5 + random() * 2)::numeric, 1), 'miles', 'PT' || (25 + floor(random() * 20))::text || 'M', v_date);
              ELSE
                INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, duration, resistance_level, datetime) VALUES
                  (gen_random_uuid(), v_workout_id, v_submission_id, 'Stationary bike', 'Cycling', '[]', 'Stationary Bike', 'PT' || (20 + floor(random() * 25))::text || 'M', floor(random() * 5 + 6)::int, v_date);
              END IF;

              -- Core work after cardio
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, repetitions, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Hanging leg raises', 'Core', '[]', NULL, 15, v_date + interval '30 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Hanging leg raises', 'Core', '[]', NULL, 12, v_date + interval '32 min'),
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Ab wheel rollouts', 'Core', '[]', 'Ab Wheel', 10, v_date + interval '36 min');
            END IF;
          ELSE
            -- Less cardio rest of year, skip most day 5s
            IF random() > 0.7 THEN
              INSERT INTO logs (id, workout_id, submission_id, input, category, modifiers, equipment, duration, datetime) VALUES
                (gen_random_uuid(), v_workout_id, v_submission_id, 'Rowing machine', 'Rowing Machine', '[]', 'Rowing Machine', 'PT' || (15 + floor(random() * 10))::text || 'M', v_date);
            END IF;
          END IF;
        END IF;

      END IF;
    END LOOP;
  END LOOP;

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '=== Seeding Complete ===';
  RAISE NOTICE 'Total workouts: %', (SELECT COUNT(*) FROM workouts WHERE user_id = v_user_id);
  RAISE NOTICE 'Total logs: %', (SELECT COUNT(*) FROM logs l INNER JOIN workouts w ON l.workout_id = w.id WHERE w.user_id = v_user_id);
  RAISE NOTICE '';
  RAISE NOTICE 'Categories used: %', (SELECT COUNT(DISTINCT category) FROM logs l INNER JOIN workouts w ON l.workout_id = w.id WHERE w.user_id = v_user_id);
  RAISE NOTICE 'Equipment types: %', (SELECT COUNT(DISTINCT equipment) FROM logs l INNER JOIN workouts w ON l.workout_id = w.id WHERE w.user_id = v_user_id AND equipment IS NOT NULL);

END $$;
