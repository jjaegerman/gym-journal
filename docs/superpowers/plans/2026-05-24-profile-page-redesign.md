# Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Profile tab's stat cards with a graph-driven layout (identity strip, range chips, multi-metric chart, PR timeline, calendar heatmap).

**Architecture:** Three new SECURITY DEFINER RPCs power three new data hooks behind a single page-level range chip. Six new components compose into a rewritten `ProfileSummary`. All backend changes are purely additive; no existing RPC or table is modified.

**Tech Stack:** Supabase Postgres (migrations + RPCs), React Native 0.81 + Expo 54, Tamagui, `react-native-gifted-charts`, AsyncStorage for chip persistence.

**Spec reference:** `docs/superpowers/specs/2026-05-24-profile-page-redesign-design.md`

**Testing approach:** SQL functions are tested manually via `docker exec ... psql` against local seed data (per CLAUDE.md gotcha #5: `psql` is not in PATH). UI components are verified visually in the iOS simulator after each component lands. No unit tests written — the project has none today and the work is UI-heavy.

**Important constraints:**
- Tamagui rules: no magic numbers (use `$N`), no hardcoded colors (use `$colorN`), text emphasis via color steps not opacity, built-in Tamagui components first.
- Use `@/*` path aliases for imports.
- Migrations are timestamp-ordered and immutable once applied to remote. Always `DROP FUNCTION IF EXISTS` before re-declaring a function whose signature changes.
- Always `GRANT EXECUTE ... TO authenticated` for new functions.
- Do not commit spec or plan files automatically. Per-task code commits are fine.

---

## Phase 1 — Backend Migration

### Task 1: Scaffold migration file with `get_user_profile_weekly_trends`

**Files:**
- Create: `supabase/migrations/20260524000001_profile_redesign_rpcs.sql`

- [ ] **Step 1: Create the migration file with the weekly trends function**

Write this content:

```sql
-- Profile page redesign: three new SECURITY DEFINER RPCs feeding the
-- multi-metric chart, PR timeline, and calendar heatmap.

-- =============================================================
-- 1. get_user_profile_weekly_trends
-- Returns weekly-bucketed workout count, total minutes, total volume.
-- Empty weeks within the range are returned with zeros (no client gap-fill).
-- =============================================================

DROP FUNCTION IF EXISTS public.get_user_profile_weekly_trends(date, date);

CREATE OR REPLACE FUNCTION public.get_user_profile_weekly_trends(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight_unit text;
  v_distance_unit text;
  v_weeks jsonb;
BEGIN
  -- Resolve user's preferred units (matches the pattern in
  -- get_filtered_exercise_stats). Defaults to lbs/miles if unset.
  SELECT
    COALESCE(preferred_weight_unit, 'lbs'),
    COALESCE(preferred_distance_unit, 'miles')
  INTO v_weight_unit, v_distance_unit
  FROM user_unit_preferences
  WHERE user_id = auth.uid();

  IF v_weight_unit IS NULL THEN v_weight_unit := 'lbs'; END IF;
  IF v_distance_unit IS NULL THEN v_distance_unit := 'miles'; END IF;

  -- Per-workout duration in minutes, computed from the first→last set datetime.
  WITH workout_durations AS (
    SELECT
      w.id,
      w.user_id,
      date_trunc('week', w.datetime)::date AS week_start,
      GREATEST(0, EXTRACT(EPOCH FROM (MAX(s.datetime) - MIN(s.datetime))) / 60.0) AS duration_minutes
    FROM workouts w
    LEFT JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= p_start_date
      AND w.datetime < (p_end_date + INTERVAL '1 day')
    GROUP BY w.id, w.user_id, w.datetime
  ),
  -- Volume per set, converted into the user's preferred weight unit.
  workout_volume AS (
    SELECT
      w.id AS workout_id,
      date_trunc('week', w.datetime)::date AS week_start,
      SUM(
        CASE
          WHEN s.weight IS NULL OR s.repetitions IS NULL THEN 0
          WHEN s.weight_unit = v_weight_unit THEN s.weight * s.repetitions
          WHEN s.weight_unit = 'kg' AND v_weight_unit = 'lbs' THEN s.weight * s.repetitions * 2.20462
          WHEN s.weight_unit = 'lbs' AND v_weight_unit = 'kg' THEN s.weight * s.repetitions / 2.20462
          ELSE s.weight * s.repetitions
        END
      ) AS volume
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= p_start_date
      AND w.datetime < (p_end_date + INTERVAL '1 day')
    GROUP BY w.id, w.datetime
  ),
  -- Spine of weeks across the range so empty weeks return 0.
  week_spine AS (
    SELECT generate_series(
      date_trunc('week', p_start_date)::date,
      date_trunc('week', p_end_date)::date,
      INTERVAL '1 week'
    )::date AS week_start
  ),
  weekly AS (
    SELECT
      ws.week_start,
      COUNT(DISTINCT wd.id) AS workout_count,
      COALESCE(SUM(wd.duration_minutes), 0)::numeric AS total_minutes,
      COALESCE(SUM(wv.volume), 0)::numeric AS total_volume
    FROM week_spine ws
    LEFT JOIN workout_durations wd ON wd.week_start = ws.week_start
    LEFT JOIN workout_volume wv ON wv.workout_id = wd.id
    GROUP BY ws.week_start
    ORDER BY ws.week_start
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'week_start', week_start,
      'workout_count', workout_count,
      'total_minutes', ROUND(total_minutes, 1),
      'total_volume', ROUND(total_volume, 1)
    )
  )
  INTO v_weeks
  FROM weekly;

  RETURN jsonb_build_object(
    'weight_unit', v_weight_unit,
    'distance_unit', v_distance_unit,
    'weeks', COALESCE(v_weeks, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_weekly_trends(date, date) TO authenticated;
```

- [ ] **Step 2: Apply migration locally**

Run: `supabase migration up`
Expected: New migration applied; no errors.

- [ ] **Step 3: Smoke test the function against seeded data**

Run:
```bash
docker exec supabase_db_gym-journal psql -U postgres -c "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '<test-user-id>'; SELECT public.get_user_profile_weekly_trends(CURRENT_DATE - INTERVAL '12 weeks', CURRENT_DATE);"
```
Replace `<test-user-id>` with a real user UUID from `auth.users` (find via `docker exec supabase_db_gym-journal psql -U postgres -c "SELECT id FROM auth.users LIMIT 1;"`).
Expected: JSON object with `weight_unit`, `distance_unit`, and a `weeks` array of length 13. Each `weeks` entry has `week_start`, `workout_count`, `total_minutes`, `total_volume`. Weeks with no workouts have zeros.

- [ ] **Step 4: Verify empty range returns empty weeks**

Run the same query with `CURRENT_DATE + INTERVAL '10 years'` for both bounds.
Expected: `weeks` array of length 1, all zeros. No error.

---

### Task 2: Append `get_daily_training_summary` to the migration

**Files:**
- Modify: `supabase/migrations/20260524000001_profile_redesign_rpcs.sql` (append)

- [ ] **Step 1: Append the function definition**

Append:

```sql
-- =============================================================
-- 2. get_daily_training_summary
-- Returns one row per day in [p_start_date, p_end_date] with workout_count
-- and total_minutes (0 for empty days). Used by the calendar heatmap.
-- =============================================================

DROP FUNCTION IF EXISTS public.get_daily_training_summary(date, date);

CREATE OR REPLACE FUNCTION public.get_daily_training_summary(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  day date,
  workout_count int,
  total_minutes int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH day_spine AS (
    SELECT generate_series(p_start_date, p_end_date, INTERVAL '1 day')::date AS day
  ),
  workout_minutes AS (
    SELECT
      w.id,
      w.datetime::date AS day,
      GREATEST(0, EXTRACT(EPOCH FROM (MAX(s.datetime) - MIN(s.datetime))) / 60.0) AS minutes
    FROM workouts w
    LEFT JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= p_start_date
      AND w.datetime < (p_end_date + INTERVAL '1 day')
    GROUP BY w.id, w.datetime
  )
  SELECT
    ds.day,
    COALESCE(COUNT(DISTINCT wm.id), 0)::int AS workout_count,
    COALESCE(ROUND(SUM(wm.minutes))::int, 0) AS total_minutes
  FROM day_spine ds
  LEFT JOIN workout_minutes wm ON wm.day = ds.day
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_training_summary(date, date) TO authenticated;
```

- [ ] **Step 2: Re-apply migration locally**

Because this is the same migration file, you need to drop the existing functions first and reset the migration record, OR roll forward via a second `supabase migration up` after editing. Easiest: `supabase db reset` to reapply all migrations cleanly (re-seeds data — be sure local seed is OK to lose).

Run: `supabase db reset`
Expected: All migrations reapplied. No errors.

- [ ] **Step 3: Smoke test the function**

Run:
```bash
docker exec supabase_db_gym-journal psql -U postgres -c "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '<test-user-id>'; SELECT * FROM public.get_daily_training_summary(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE) ORDER BY day DESC LIMIT 10;"
```
Expected: 91 rows total when the LIMIT is removed; LIMIT 10 returns the 10 most recent days, with `workout_count` and `total_minutes` populated only where workouts exist.

---

### Task 3: Append `get_user_pr_timeline` to the migration

**Files:**
- Modify: `supabase/migrations/20260524000001_profile_redesign_rpcs.sql` (append)

- [ ] **Step 1: Append the function definition**

Append:

```sql
-- =============================================================
-- 3. get_user_pr_timeline
-- Returns the user's most recent PRs in a time range. Five PR types:
--   weight, reps_at_top, distance, pace, duration, new_movement
-- PR group key = (exercise_kind, sorted modifiers[], equipment).
-- A PR requires a prior baseline in the group, except for 'new_movement'.
-- 'new_movement' only counted if user has 5+ total workouts.
-- =============================================================

DROP FUNCTION IF EXISTS public.get_user_pr_timeline(text, int, text, text);

CREATE OR REPLACE FUNCTION public.get_user_pr_timeline(
  p_time_range text DEFAULT '1_month',
  p_limit int DEFAULT 8,
  p_preferred_weight_unit text DEFAULT 'lbs',
  p_preferred_distance_unit text DEFAULT 'miles'
)
RETURNS TABLE(
  pr_type text,
  exercise_kind text,
  modifiers jsonb,
  equipment text,
  display_name text,
  value numeric,
  unit text,
  previous_value numeric,
  delta numeric,
  achieved_at timestamptz,
  workout_id uuid,
  set_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamptz;
  v_workout_count int;
BEGIN
  -- Resolve time range to a start cutoff.
  v_start_date := CASE p_time_range
    WHEN '1_month'   THEN NOW() - INTERVAL '1 month'
    WHEN '3_months'  THEN NOW() - INTERVAL '3 months'
    WHEN '1_year'    THEN NOW() - INTERVAL '1 year'
    WHEN 'all_time'  THEN '1970-01-01'::timestamptz
    ELSE NOW() - INTERVAL '1 month'
  END;

  -- Total workout count gates the 'new_movement' PR type.
  SELECT COUNT(*) INTO v_workout_count
  FROM workouts WHERE user_id = auth.uid();

  RETURN QUERY
  WITH
  -- Normalize sets with a stable group key. modifiers are sorted in jsonb so
  -- the group key is order-independent.
  normalized AS (
    SELECT
      s.id AS set_id,
      s.workout_id,
      s.datetime,
      s.exercise_kind,
      COALESCE(s.equipment, '') AS equipment,
      COALESCE(
        (SELECT jsonb_agg(m ORDER BY m) FROM jsonb_array_elements_text(s.modifiers) m),
        '[]'::jsonb
      ) AS modifiers_sorted,
      -- Weight converted to preferred unit
      CASE
        WHEN s.weight IS NULL THEN NULL
        WHEN s.weight_unit = p_preferred_weight_unit THEN s.weight
        WHEN s.weight_unit = 'kg' AND p_preferred_weight_unit = 'lbs' THEN s.weight * 2.20462
        WHEN s.weight_unit = 'lbs' AND p_preferred_weight_unit = 'kg' THEN s.weight / 2.20462
        ELSE s.weight
      END AS weight_pref,
      s.repetitions,
      -- Distance converted to preferred unit
      CASE
        WHEN s.distance IS NULL THEN NULL
        WHEN s.distance_unit = p_preferred_distance_unit THEN s.distance
        WHEN s.distance_unit = 'km' AND p_preferred_distance_unit = 'miles' THEN s.distance * 0.621371
        WHEN s.distance_unit = 'miles' AND p_preferred_distance_unit = 'km' THEN s.distance / 0.621371
        ELSE s.distance
      END AS distance_pref,
      -- Duration in seconds
      CASE
        WHEN s.duration IS NULL THEN NULL
        ELSE parse_iso8601_duration_to_seconds(s.duration)
      END AS duration_seconds,
      s.weight_unit,
      s.distance_unit
    FROM sets s
    JOIN workouts w ON w.id = s.workout_id
    WHERE w.user_id = auth.uid()
  ),
  grouped AS (
    SELECT
      n.*,
      jsonb_build_array(n.exercise_kind, n.modifiers_sorted, n.equipment) AS group_key
    FROM normalized n
  ),
  -- Running max per group ordered by datetime — used to detect strict improvements.
  with_running_maxes AS (
    SELECT
      g.*,
      -- weight PR
      MAX(g.weight_pref) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_weight,
      -- distance PR
      MAX(g.distance_pref) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_distance,
      -- duration PR (cardio without distance)
      MAX(g.duration_seconds) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_duration,
      -- pace PR (seconds per unit) — LOWER is better
      MIN(
        CASE
          WHEN g.duration_seconds IS NOT NULL AND g.distance_pref IS NOT NULL AND g.distance_pref > 0
          THEN g.duration_seconds / g.distance_pref
          ELSE NULL
        END
      ) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_best_pace,
      -- For "reps at top weight" PR
      MAX(g.repetitions) OVER (
        PARTITION BY g.group_key, g.weight_pref
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_reps_at_weight,
      ROW_NUMBER() OVER (PARTITION BY g.group_key ORDER BY g.datetime) AS group_row_num
    FROM grouped g
  ),
  prs AS (
    -- Weight PR
    SELECT
      'weight' AS pr_type,
      r.exercise_kind, r.modifiers_sorted AS modifiers, NULLIF(r.equipment, '') AS equipment,
      r.weight_pref AS value,
      p_preferred_weight_unit AS unit,
      r.prev_max_weight AS previous_value,
      (r.weight_pref - r.prev_max_weight) AS delta,
      r.datetime AS achieved_at,
      r.workout_id,
      r.set_id
    FROM with_running_maxes r
    WHERE r.weight_pref IS NOT NULL
      AND r.prev_max_weight IS NOT NULL
      AND r.weight_pref > r.prev_max_weight
      AND r.datetime >= v_start_date

    UNION ALL

    -- Reps at top weight PR
    SELECT
      'reps_at_top',
      r.exercise_kind, r.modifiers_sorted, NULLIF(r.equipment, ''),
      r.repetitions::numeric AS value,
      'reps' AS unit,
      r.prev_max_reps_at_weight::numeric AS previous_value,
      (r.repetitions - r.prev_max_reps_at_weight)::numeric AS delta,
      r.datetime AS achieved_at,
      r.workout_id,
      r.set_id
    FROM with_running_maxes r
    WHERE r.repetitions IS NOT NULL
      AND r.weight_pref IS NOT NULL
      AND r.prev_max_reps_at_weight IS NOT NULL
      AND r.repetitions > r.prev_max_reps_at_weight
      AND r.datetime >= v_start_date

    UNION ALL

    -- Distance PR
    SELECT
      'distance',
      r.exercise_kind, r.modifiers_sorted, NULLIF(r.equipment, ''),
      r.distance_pref AS value,
      p_preferred_distance_unit AS unit,
      r.prev_max_distance AS previous_value,
      (r.distance_pref - r.prev_max_distance) AS delta,
      r.datetime,
      r.workout_id,
      r.set_id
    FROM with_running_maxes r
    WHERE r.distance_pref IS NOT NULL
      AND r.prev_max_distance IS NOT NULL
      AND r.distance_pref > r.prev_max_distance
      AND r.datetime >= v_start_date

    UNION ALL

    -- Pace PR (lower seconds/unit is better)
    SELECT
      'pace',
      r.exercise_kind, r.modifiers_sorted, NULLIF(r.equipment, ''),
      (r.duration_seconds / r.distance_pref)::numeric AS value,
      ('s_per_' || p_preferred_distance_unit) AS unit,
      r.prev_best_pace AS previous_value,
      ((r.duration_seconds / r.distance_pref) - r.prev_best_pace)::numeric AS delta,
      r.datetime,
      r.workout_id,
      r.set_id
    FROM with_running_maxes r
    WHERE r.duration_seconds IS NOT NULL
      AND r.distance_pref IS NOT NULL
      AND r.distance_pref > 0
      AND r.prev_best_pace IS NOT NULL
      AND (r.duration_seconds / r.distance_pref) < r.prev_best_pace
      AND r.datetime >= v_start_date

    UNION ALL

    -- Duration PR (only when distance is null — pure-duration cardio like plank)
    SELECT
      'duration',
      r.exercise_kind, r.modifiers_sorted, NULLIF(r.equipment, ''),
      r.duration_seconds::numeric AS value,
      's' AS unit,
      r.prev_max_duration AS previous_value,
      (r.duration_seconds - r.prev_max_duration)::numeric AS delta,
      r.datetime,
      r.workout_id,
      r.set_id
    FROM with_running_maxes r
    WHERE r.duration_seconds IS NOT NULL
      AND r.distance_pref IS NULL
      AND r.prev_max_duration IS NOT NULL
      AND r.duration_seconds > r.prev_max_duration
      AND r.datetime >= v_start_date

    UNION ALL

    -- New movement PR (gated by >= 5 total workouts)
    SELECT
      'new_movement',
      r.exercise_kind, r.modifiers_sorted, NULLIF(r.equipment, ''),
      0::numeric AS value,
      '' AS unit,
      NULL::numeric AS previous_value,
      NULL::numeric AS delta,
      r.datetime,
      r.workout_id,
      r.set_id
    FROM with_running_maxes r
    WHERE r.group_row_num = 1
      AND r.datetime >= v_start_date
      AND v_workout_count >= 5
  )
  SELECT
    p.pr_type,
    p.exercise_kind,
    p.modifiers,
    p.equipment,
    -- display_name format matches the existing pattern: "{modifiers} {kind} ({equipment})"
    TRIM(
      COALESCE(
        (SELECT string_agg(m, ' ') FROM jsonb_array_elements_text(p.modifiers) m),
        ''
      ) || ' ' || p.exercise_kind ||
      CASE WHEN p.equipment IS NOT NULL AND p.equipment <> ''
        THEN ' (' || p.equipment || ')'
        ELSE ''
      END
    ) AS display_name,
    p.value,
    p.unit,
    p.previous_value,
    p.delta,
    p.achieved_at,
    p.workout_id,
    p.set_id
  FROM prs p
  ORDER BY p.achieved_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_pr_timeline(text, int, text, text) TO authenticated;
```

- [ ] **Step 2: Reset and reapply migrations**

Run: `supabase db reset`
Expected: All migrations apply cleanly. The function compiles without error.

- [ ] **Step 3: Smoke test the function**

Run:
```bash
docker exec supabase_db_gym-journal psql -U postgres -c "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '<test-user-id>'; SELECT pr_type, display_name, value, unit, previous_value, delta, achieved_at FROM public.get_user_pr_timeline('all_time', 20, 'lbs', 'miles');"
```
Expected: Up to 20 rows, most recent first. Each row has a recognizable PR type and the delta should be positive for weight/reps/distance/duration, negative for pace, NULL for new_movement.

- [ ] **Step 4: Spot-check correctness**

For a known strength-training user, manually verify one weight PR by querying:
```bash
docker exec supabase_db_gym-journal psql -U postgres -c "SELECT MAX(weight) FROM sets s JOIN workouts w ON w.id=s.workout_id WHERE w.user_id='<test-user-id>' AND exercise_kind='bench press';"
```
Expected: The max weight in raw data matches the most recent `weight` PR for bench press from the function (after unit conversion).

- [ ] **Step 5: Commit the migration**

```bash
git add supabase/migrations/20260524000001_profile_redesign_rpcs.sql
git commit -m "feat(profile): add weekly trends, daily summary, PR timeline RPCs"
```

---

## Phase 2 — API Layer + Hooks

### Task 4: Add TypeScript API wrappers and types

**Files:**
- Create: `lib/api/supabase/profileTrends.ts`

- [ ] **Step 1: Create the API wrappers file**

```typescript
import { supabase } from './client';

export interface WeeklyTrendPoint {
  week_start: string; // ISO date
  workout_count: number;
  total_minutes: number;
  total_volume: number;
}

export interface WeeklyTrends {
  weight_unit: 'kg' | 'lbs';
  distance_unit: 'km' | 'miles';
  weeks: WeeklyTrendPoint[];
}

export async function getProfileWeeklyTrends(
  startDate: string,
  endDate: string
): Promise<WeeklyTrends> {
  const { data, error } = await supabase.rpc('get_user_profile_weekly_trends', {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data as WeeklyTrends;
}

export interface DailySummaryPoint {
  day: string; // ISO date
  workout_count: number;
  total_minutes: number;
}

export async function getDailyTrainingSummary(
  startDate: string,
  endDate: string
): Promise<DailySummaryPoint[]> {
  const { data, error } = await supabase.rpc('get_daily_training_summary', {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return (data ?? []) as DailySummaryPoint[];
}

export type PrType = 'weight' | 'reps_at_top' | 'distance' | 'pace' | 'duration' | 'new_movement';

export interface PrTimelineEntry {
  pr_type: PrType;
  exercise_kind: string;
  modifiers: string[];
  equipment: string | null;
  display_name: string;
  value: number;
  unit: string;
  previous_value: number | null;
  delta: number | null;
  achieved_at: string;
  workout_id: string;
  set_id: string;
}

export type ProfileRange = '1_month' | '3_months' | '1_year' | 'all_time';

export async function getUserPrTimeline(
  range: ProfileRange,
  limit: number,
  weightUnit: 'kg' | 'lbs',
  distanceUnit: 'km' | 'miles'
): Promise<PrTimelineEntry[]> {
  const { data, error } = await supabase.rpc('get_user_pr_timeline', {
    p_time_range: range,
    p_limit: limit,
    p_preferred_weight_unit: weightUnit,
    p_preferred_distance_unit: distanceUnit,
  });
  if (error) throw error;
  return (data ?? []) as PrTimelineEntry[];
}

/**
 * Convert a profile range to absolute start/end dates (YYYY-MM-DD).
 * `all_time` returns 1970-01-01 as the start; callers can pass it
 * directly to the RPC.
 */
export function rangeToDates(
  range: ProfileRange,
  earliestWorkoutDate?: string | null
): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  let start: Date;
  switch (range) {
    case '1_month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case '3_months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      break;
    case '1_year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'all_time':
      return {
        startDate: earliestWorkoutDate ?? '1970-01-01',
        endDate,
      };
  }
  return { startDate: start.toISOString().slice(0, 10), endDate };
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `yarn tsc --noEmit`
Expected: No type errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add lib/api/supabase/profileTrends.ts
git commit -m "feat(profile): add API wrappers for profile trend RPCs"
```

---

### Task 5: Create AsyncStorage helper for range persistence

**Files:**
- Create: `lib/storage/profileRange.ts`

- [ ] **Step 1: Create the storage helper**

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProfileRange } from "@/lib/api/supabase/profileTrends";

const PROFILE_RANGE_KEY = "profile.range";
const VALID: ProfileRange[] = ['1_month', '3_months', '1_year', 'all_time'];

export async function getProfileRange(): Promise<ProfileRange | null> {
  const raw = await AsyncStorage.getItem(PROFILE_RANGE_KEY);
  if (raw && (VALID as string[]).includes(raw)) {
    return raw as ProfileRange;
  }
  return null;
}

export async function setProfileRange(range: ProfileRange): Promise<void> {
  await AsyncStorage.setItem(PROFILE_RANGE_KEY, range);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/storage/profileRange.ts
git commit -m "feat(profile): add AsyncStorage helper for range persistence"
```

---

### Task 6: Create `useProfileRange` hook

**Files:**
- Create: `lib/hooks/useProfileRange.ts`
- Modify: `lib/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useState, useCallback } from 'react';
import type { ProfileRange } from '@/lib/api/supabase/profileTrends';
import { getProfileRange, setProfileRange } from '@/lib/storage/profileRange';

const DEFAULT_RANGE: ProfileRange = '3_months';

export function useProfileRange() {
  const [range, setRangeState] = useState<ProfileRange>(DEFAULT_RANGE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    getProfileRange()
      .then((stored) => {
        if (stored) setRangeState(stored);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const setRange = useCallback((next: ProfileRange) => {
    setRangeState(next);
    void setProfileRange(next).catch(() => {});
  }, []);

  return { range, setRange, hydrated };
}
```

- [ ] **Step 2: Export from hooks barrel**

Edit `lib/hooks/index.ts` and add:

```typescript
export { useProfileRange } from './useProfileRange';
```

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useProfileRange.ts lib/hooks/index.ts
git commit -m "feat(profile): add useProfileRange hook"
```

---

### Task 7: Create data hooks for the three new RPCs

**Files:**
- Create: `lib/hooks/useProfileWeeklyTrends.ts`
- Create: `lib/hooks/usePrTimeline.ts`
- Create: `lib/hooks/useDailyTrainingSummary.ts`
- Modify: `lib/hooks/index.ts`

- [ ] **Step 1: Create `useProfileWeeklyTrends`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import {
  getProfileWeeklyTrends,
  rangeToDates,
  type ProfileRange,
  type WeeklyTrends,
} from '@/lib/api/supabase/profileTrends';
import { useSession } from './useSession';

export function useProfileWeeklyTrends(range: ProfileRange, earliest?: string | null) {
  const { user } = useSession();
  const [data, setData] = useState<WeeklyTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = rangeToDates(range, earliest);
      const result = await getProfileWeeklyTrends(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch weekly trends'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, range, earliest]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
```

- [ ] **Step 2: Create `usePrTimeline`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import {
  getUserPrTimeline,
  type ProfileRange,
  type PrTimelineEntry,
} from '@/lib/api/supabase/profileTrends';
import { useSession } from './useSession';
import { useUnitPreferences } from './useUnitPreferences';

export function usePrTimeline(range: ProfileRange, limit: number = 8) {
  const { user } = useSession();
  const { prefs } = useUnitPreferences();
  const [data, setData] = useState<PrTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getUserPrTimeline(range, limit, prefs.weightUnit, prefs.distanceUnit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch PR timeline'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, range, limit, prefs.weightUnit, prefs.distanceUnit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
```

- [ ] **Step 3: Create `useDailyTrainingSummary`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import {
  getDailyTrainingSummary,
  rangeToDates,
  type ProfileRange,
  type DailySummaryPoint,
} from '@/lib/api/supabase/profileTrends';
import { useSession } from './useSession';

export function useDailyTrainingSummary(range: ProfileRange, earliest?: string | null) {
  const { user } = useSession();
  const [data, setData] = useState<DailySummaryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = rangeToDates(range, earliest);
      const result = await getDailyTrainingSummary(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch daily summary'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, range, earliest]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
```

- [ ] **Step 4: Export all three from `lib/hooks/index.ts`**

Append:

```typescript
export { useProfileWeeklyTrends } from './useProfileWeeklyTrends';
export { usePrTimeline } from './usePrTimeline';
export { useDailyTrainingSummary } from './useDailyTrainingSummary';
```

- [ ] **Step 5: Verify compiles**

Run: `yarn tsc --noEmit`
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useProfileWeeklyTrends.ts lib/hooks/usePrTimeline.ts lib/hooks/useDailyTrainingSummary.ts lib/hooks/index.ts
git commit -m "feat(profile): add data hooks for weekly trends, PR timeline, daily summary"
```

---

## Phase 3 — Components (bottom-up)

### Task 8: IdentityStrip component

**Files:**
- Create: `components/features/profile/IdentityStrip.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Card, YStack, XStack, H4, Paragraph, Separator, Theme, Text } from "tamagui";
import { Activity, Clock, Flame, TrendingUp } from "@tamagui/lucide-icons";
import type { ProfileStats } from "@/lib/api/supabase/stats";

interface Props {
  stats: ProfileStats;
}

export function IdentityStrip({ stats }: Props) {
  const hasNoWorkouts = stats.total_workouts === 0;

  if (hasNoWorkouts) {
    return (
      <Card bordered elevate p="$4" br="$6" bg="$color2">
        <YStack items="center" justify="center" gap="$2" py="$4">
          <Flame size={48} color="$color8" />
          <H4 color="$color11">Start your streak</H4>
          <Paragraph size="$3" color="$color10">
            Log your first workout to light this up
          </Paragraph>
        </YStack>
      </Card>
    );
  }

  const currentIsBest = stats.current_streak_days === stats.longest_streak_days && stats.current_streak_days > 0;

  return (
    <Card bordered elevate p="$4" br="$6" bg="$color2">
      <YStack gap="$3">
        <XStack gap="$3">
          <Theme name="orange">
            <Cell
              hero
              icon={<Flame size={28} color="$color11" />}
              value={stats.current_streak_days}
              unit="days"
              label="Current Streak"
            />
          </Theme>
          <Separator vertical borderColor="$color6" />
          <Cell
            icon={<Activity size={16} color="$color9" />}
            value={stats.total_workouts}
            label="Total Workouts"
            size="$9"
          />
        </XStack>
        <Separator borderColor="$color6" />
        <XStack gap="$3">
          <Cell
            icon={<Clock size={16} color="$color9" />}
            value={stats.total_hours}
            unit="h"
            label="Total Hours"
            size="$7"
          />
          <Separator vertical borderColor="$color6" />
          {currentIsBest ? (
            <YStack flex={1} gap="$1" justify="center">
              <Paragraph size="$2" color="$color11" tt="uppercase" letterSpacing={1}>
                Best Streak
              </Paragraph>
              <Theme name="accent">
                <Text fontSize="$7" fontWeight="bold" color="$color11">
                  PR
                </Text>
              </Theme>
            </YStack>
          ) : (
            <Cell
              icon={<TrendingUp size={16} color="$color9" />}
              value={stats.longest_streak_days}
              unit="days"
              label="Best Streak"
              size="$7"
            />
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

function Cell({
  hero,
  icon,
  value,
  unit,
  label,
  size = "$10",
}: {
  hero?: boolean;
  icon?: React.ReactNode;
  value: number | string;
  unit?: string;
  label: string;
  size?: any;
}) {
  return (
    <YStack flex={1} gap="$1">
      <XStack gap="$2" items="baseline">
        {hero && icon}
        <Text fontSize={size} fontWeight="bold" color={hero ? "$color11" : "$color12"}>
          {value}
        </Text>
        {unit && (
          <Text fontSize="$4" color="$color9">
            {unit}
          </Text>
        )}
      </XStack>
      <XStack gap="$1" items="center">
        {!hero && icon}
        <Paragraph size="$2" color="$color11" tt="uppercase" letterSpacing={1}>
          {label}
        </Paragraph>
      </XStack>
    </YStack>
  );
}
```

- [ ] **Step 2: Verify compiles**

Run: `yarn tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/features/profile/IdentityStrip.tsx
git commit -m "feat(profile): add IdentityStrip component"
```

---

### Task 9: RangeChips component

**Files:**
- Create: `components/features/profile/RangeChips.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { XStack, Button, Text } from "tamagui";
import type { ProfileRange } from "@/lib/api/supabase/profileTrends";

const RANGES: { value: ProfileRange; short: string; long: string }[] = [
  { value: '1_month',  short: '1M',  long: 'Last month' },
  { value: '3_months', short: '3M',  long: 'Last 3 months' },
  { value: '1_year',   short: '1Y',  long: 'Last year' },
  { value: 'all_time', short: 'All', long: 'All time' },
];

interface Props {
  value: ProfileRange;
  onChange: (next: ProfileRange) => void;
  disabled?: boolean;
}

export function RangeChips({ value, onChange, disabled }: Props) {
  return (
    <XStack gap="$2" py="$2" flexWrap="wrap">
      {RANGES.map((r) => {
        const selected = r.value === value;
        return (
          <Button
            key={r.value}
            size="$2"
            $sm={{ size: "$5" }}
            chromeless={!selected}
            bg={selected ? "$color5" : "$color3"}
            onPress={() => onChange(r.value)}
            disabled={disabled}
            borderRadius="$3"
            px="$3"
            accessibilityRole="button"
            accessibilityLabel={r.long}
            accessibilityState={{ selected, disabled: !!disabled }}
          >
            <Text
              fontSize="$2"
              $sm={{ fontSize: "$4" }}
              fontWeight={selected ? "600" : "400"}
              color={selected ? "$color12" : "$color11"}
            >
              {r.short}
            </Text>
          </Button>
        );
      })}
    </XStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/features/profile/RangeChips.tsx
git commit -m "feat(profile): add RangeChips component"
```

---

### Task 10: ProfileTrendChart component

**Files:**
- Create: `components/features/profile/ProfileTrendChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useMemo } from "react";
import { useWindowDimensions, View, LayoutChangeEvent } from "react-native";
import { YStack, XStack, Text, Button, useTheme, Theme, Card } from "tamagui";
import { LineChart } from "react-native-gifted-charts";
import type { WeeklyTrends } from "@/lib/api/supabase/profileTrends";

type Metric = "workouts" | "time" | "volume";

interface Props {
  trends: WeeklyTrends | null;
  loading: boolean;
}

const METRIC_LABELS: Record<Metric, string> = {
  workouts: "Workouts",
  time: "Time",
  volume: "Volume",
};

export function ProfileTrendChart({ trends, loading }: Props) {
  return (
    <Card bordered borderColor="$color6" bg="$color2" borderRadius="$4" p="$4" gap="$3">
      <Theme name="accent">
        <ChartBody trends={trends} loading={loading} />
      </Theme>
    </Card>
  );
}

function ChartBody({ trends, loading }: Props) {
  const baseTheme = useTheme();
  const gridColor = baseTheme.color6.val;
  const labelColor = baseTheme.color11.val;
  const lineColor = baseTheme.color10.val;
  const tooltipBg = baseTheme.color3.val;
  const tooltipValueColor = baseTheme.color12.val;
  const tooltipDateColor = baseTheme.color10.val;
  const inactiveBg = baseTheme.color3.val;
  const selectedBg = baseTheme.color5.val;
  const labelColorActive = baseTheme.color12.val;
  const labelColorInactive = baseTheme.color11.val;

  const { width: screenWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(screenWidth * 0.9);

  const weeks = trends?.weeks ?? [];
  const weightUnit = trends?.weight_unit ?? 'lbs';

  const available: Metric[] = useMemo(() => {
    const list: Metric[] = ["workouts", "time"];
    if (weeks.some((w) => w.total_volume > 0)) list.push("volume");
    return list;
  }, [weeks]);

  const [metric, setMetric] = useState<Metric>("workouts");
  const activeMetric = available.includes(metric) ? metric : available[0];

  const series = useMemo(() => {
    return weeks.map((w) => {
      const value =
        activeMetric === "workouts" ? w.workout_count :
        activeMetric === "time"     ? w.total_minutes :
                                       w.total_volume;
      return { week: w.week_start, value };
    });
  }, [weeks, activeMetric]);

  if (loading && weeks.length === 0) {
    return (
      <View style={{ height: 200, backgroundColor: tooltipBg, borderRadius: 8 }} />
    );
  }

  if (weeks.length === 0) {
    return (
      <YStack height={200} items="center" justify="center">
        <Text color="$color10">No workouts in this range</Text>
      </YStack>
    );
  }

  if (series.length < 2) {
    return (
      <YStack height={200} items="center" justify="center">
        <Text color="$color10">Need 2+ weeks to chart trends</Text>
      </YStack>
    );
  }

  const values = series.map((d) => d.value);
  const rawMax = Math.max(...values, 1);
  const noOfSections = 4;
  const roughStep = rawMax / noOfSections;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  let niceStep = Math.ceil(roughStep / magnitude) * magnitude;
  if (activeMetric === "workouts") niceStep = Math.max(Math.ceil(niceStep), 1);
  const maxValue = niceStep * noOfSections;

  const DOT_RADIUS = 4;
  const WRAPPER_PADDING = DOT_RADIUS + 2;
  const Y_LABEL_WIDTH = 44;
  const chartWidth = containerWidth - WRAPPER_PADDING * 2 - Y_LABEL_WIDTH;
  const chartHeight = 180;
  const spacing = series.length > 1 ? chartWidth / (series.length - 1) : 60;

  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const formatY = (raw: string) => {
    const n = parseFloat(raw);
    if (activeMetric === "time") {
      if (n >= 60) return (n / 60).toFixed(1).replace(/\.0$/, "") + "h";
      return Math.round(n) + "m";
    }
    if (activeMetric === "volume") {
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
      return Math.round(n).toString();
    }
    return Math.round(n).toString();
  };

  const formatValue = (n: number): string => {
    if (activeMetric === "workouts") {
      return n === 1 ? "1 workout" : `${n} workouts`;
    }
    if (activeMetric === "time") {
      const h = Math.floor(n / 60);
      const m = Math.round(n % 60);
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K " + weightUnit;
    return Math.round(n) + " " + weightUnit;
  };

  const formatWeekRange = (iso: string): string => {
    const start = new Date(iso);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const chartData = series.map((d) => ({ value: d.value, week: d.week }));

  return (
    <YStack gap="$3" width="100%" onLayout={handleLayout}>
      <XStack gap="$2" justify="center" flexWrap="wrap">
        {available.map((m) => (
          <Button
            key={m}
            size="$2"
            $sm={{ size: "$5" }}
            chromeless={activeMetric !== m}
            bg={activeMetric === m ? selectedBg : inactiveBg}
            onPress={() => setMetric(m)}
            borderRadius="$3"
            px="$3"
          >
            <Text
              fontSize="$2"
              $sm={{ fontSize: "$4" }}
              fontWeight={activeMetric === m ? "600" : "400"}
              color={activeMetric === m ? labelColorActive : labelColorInactive}
            >
              {METRIC_LABELS[m]}
            </Text>
          </Button>
        ))}
      </XStack>

      <View style={{ paddingHorizontal: WRAPPER_PADDING }}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          spacing={spacing}
          initialSpacing={0}
          endSpacing={series.length > 1 ? 10 - spacing : 0}
          rulesLength={chartWidth}
          xAxisLength={chartWidth}
          disableScroll
          color={lineColor}
          thickness={2}
          curved
          hideDataPoints={series.length > 12}
          dataPointsColor={lineColor}
          dataPointsRadius={DOT_RADIUS}
          noOfSections={noOfSections}
          maxValue={maxValue}
          rulesType="dashed"
          rulesColor={gridColor}
          yAxisColor="transparent"
          xAxisColor={gridColor}
          hideXAxisText
          xAxisLabelsHeight={0}
          yAxisLabelWidth={Y_LABEL_WIDTH}
          yAxisThickness={0}
          yAxisTextStyle={{ color: labelColor, fontSize: 10 }}
          formatYLabel={formatY}
          pointerConfig={{
            pointerStripHeight: chartHeight,
            pointerStripColor: "transparent",
            pointerStripWidth: 1,
            pointerColor: lineColor,
            radius: DOT_RADIUS,
            pointerLabelWidth: 120,
            pointerLabelHeight: 48,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: Array<{ value: number; week?: string }>) => {
              const item = items[0];
              const dateLabel = item?.week ? formatWeekRange(item.week) : "";
              return (
                <View
                  style={{
                    backgroundColor: tooltipBg,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <Text style={{ color: tooltipValueColor, fontSize: 12, fontWeight: "600" }}>
                    {formatValue(item?.value ?? 0)}
                  </Text>
                  <Text style={{ color: tooltipDateColor, fontSize: 10 }}>{dateLabel}</Text>
                </View>
              );
            },
          }}
        />
      </View>
    </YStack>
  );
}
```

- [ ] **Step 2: Verify compiles**

Run: `yarn tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/features/profile/ProfileTrendChart.tsx
git commit -m "feat(profile): add ProfileTrendChart with metric chips"
```

---

### Task 11: PR timeline components

**Files:**
- Create: `components/features/profile/PrTimelineCard.tsx`
- Create: `components/features/profile/PrTimeline.tsx`

- [ ] **Step 1: Create `PrTimelineCard`**

```tsx
import { Card, YStack, XStack, Text, Paragraph, Theme } from "tamagui";
import { Trophy, ChevronRight } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import type { PrTimelineEntry } from "@/lib/api/supabase/profileTrends";

interface Props {
  pr: PrTimelineEntry;
}

const TYPE_LABEL: Record<string, string> = {
  weight: "Weight PR",
  reps_at_top: "Reps PR",
  distance: "Distance PR",
  pace: "Pace PR",
  duration: "Duration PR",
  new_movement: "New Movement",
};

function formatValue(pr: PrTimelineEntry): string {
  if (pr.pr_type === 'new_movement') return '—';
  if (pr.pr_type === 'pace') {
    const total = Math.round(pr.value);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    const unitLabel = pr.unit.startsWith('s_per_') ? '/' + pr.unit.slice(6) : '';
    return `${mins}:${String(secs).padStart(2, '0')} ${unitLabel}`.trim();
  }
  if (pr.pr_type === 'duration') {
    const total = Math.round(pr.value);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  if (pr.pr_type === 'distance') return `${pr.value.toFixed(2)} ${pr.unit}`;
  if (pr.pr_type === 'weight') return `${Math.round(pr.value)} ${pr.unit}`;
  if (pr.pr_type === 'reps_at_top') return `${Math.round(pr.value)} reps`;
  return `${pr.value} ${pr.unit}`;
}

function formatDelta(pr: PrTimelineEntry): string | null {
  if (pr.delta == null) return null;
  if (pr.pr_type === 'weight')      return `+${Math.round(pr.delta)} ${pr.unit}`;
  if (pr.pr_type === 'reps_at_top') return `+${Math.round(pr.delta)} reps`;
  if (pr.pr_type === 'distance')    return `+${pr.delta.toFixed(2)} ${pr.unit}`;
  if (pr.pr_type === 'pace') {
    const secs = Math.round(Math.abs(pr.delta));
    return `-0:${String(secs).padStart(2, '0')}`;
  }
  if (pr.pr_type === 'duration') {
    const secs = Math.round(pr.delta);
    return `+${secs}s`;
  }
  return null;
}

function formatRelativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const ms = now.getTime() - then.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Today';
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PrTimelineCard({ pr }: Props) {
  const router = useRouter();
  const delta = formatDelta(pr);

  return (
    <Theme name="accent">
      <Card
        bordered
        bg="$color3"
        borderColor="$yellow7"
        borderRadius="$4"
        p="$3"
        width={280}
        pressStyle={{ opacity: 0.8 }}
        onPress={() => router.push(`/workout?id=${pr.workout_id}` as any)}
      >
        <YStack gap="$2">
          <XStack gap="$2" items="center">
            <Trophy size={16} color="$yellow10" />
            <Text fontSize="$3" color="$color11" fontWeight="600">
              {TYPE_LABEL[pr.pr_type] ?? 'PR'}
            </Text>
            <XStack flex={1} />
            <ChevronRight size={16} color="$color9" />
          </XStack>
          <Paragraph size="$3" color="$color12" numberOfLines={1}>
            {pr.display_name}
          </Paragraph>
          <Text fontSize="$7" $sm={{ fontSize: "$9" }} fontWeight="700" color="$color12">
            {formatValue(pr)}
          </Text>
          <XStack gap="$2" items="center">
            {delta && (
              <XStack bg="$color4" px="$2" py="$1" borderRadius="$2">
                <Text fontSize="$2" color="$green10" fontWeight="600">{delta}</Text>
              </XStack>
            )}
            <Paragraph size="$2" color="$color11">
              {formatRelativeDate(pr.achieved_at)}
            </Paragraph>
          </XStack>
        </YStack>
      </Card>
    </Theme>
  );
}
```

- [ ] **Step 2: Create `PrTimeline`**

```tsx
import { ScrollView } from "react-native";
import { YStack, XStack, H5, Paragraph } from "tamagui";
import { PrTimelineCard } from "./PrTimelineCard";
import type { PrTimelineEntry } from "@/lib/api/supabase/profileTrends";

interface Props {
  prs: PrTimelineEntry[];
  loading: boolean;
  hasAnyPrEver?: boolean;
}

export function PrTimeline({ prs, loading, hasAnyPrEver = true }: Props) {
  // Hide section entirely when range has no PRs but user has PRs elsewhere.
  if (!loading && prs.length === 0 && hasAnyPrEver) return null;

  return (
    <YStack gap="$2">
      <H5 color="$color11" fontWeight="600">Recent PRs</H5>
      {!loading && prs.length === 0 ? (
        <Paragraph size="$3" color="$color10">
          Log your first set to start tracking PRs
        </Paragraph>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$3" py="$1">
            {prs.map((pr) => (
              <PrTimelineCard key={pr.set_id} pr={pr} />
            ))}
          </XStack>
        </ScrollView>
      )}
    </YStack>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/features/profile/PrTimelineCard.tsx components/features/profile/PrTimeline.tsx
git commit -m "feat(profile): add PR timeline components"
```

---

### Task 12: CalendarHeatmap component

**Files:**
- Create: `components/features/profile/CalendarHeatmap.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { YStack, XStack, View, Text, Popover, Paragraph, Theme, useTheme } from "tamagui";
import { useRouter } from "expo-router";
import type { DailySummaryPoint } from "@/lib/api/supabase/profileTrends";
import type { ProfileRange } from "@/lib/api/supabase/profileTrends";

interface Props {
  days: DailySummaryPoint[];
  range: ProfileRange;
  loading: boolean;
}

function bucketIndex(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes <= 20) return 1;
  if (minutes <= 45) return 2;
  if (minutes <= 75) return 3;
  return 4;
}

const BUCKET_COLORS = ['$color3', '$color6', '$color8', '$color10', '$color12'] as const;

export function CalendarHeatmap({ days, range, loading }: Props) {
  return (
    <Theme name="accent">
      <HeatmapBody days={days} range={range} loading={loading} />
    </Theme>
  );
}

function HeatmapBody({ days, range, loading }: Props) {
  const theme = useTheme();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const router = useRouter();

  const cellSize = range === '1_month' ? 18 : range === '3_months' ? 14 : 10;
  const cellGap = range === '1_month' ? 6 : range === '3_months' ? 4 : 2;
  const isWide = range === '1_year' || range === 'all_time';

  const byDay = useMemo(() => {
    const map = new Map<string, DailySummaryPoint>();
    for (const d of days) map.set(d.day, d);
    return map;
  }, [days]);

  // Build week columns. Each column is Sunday→Saturday.
  const columns = useMemo(() => {
    if (days.length === 0) return [];
    const first = new Date(days[0].day);
    const startOfFirstWeek = new Date(first);
    startOfFirstWeek.setDate(first.getDate() - first.getDay());
    const last = new Date(days[days.length - 1].day);
    const cols: { weekStart: Date; cells: { date: Date; key: string }[] }[] = [];
    let cursor = new Date(startOfFirstWeek);
    while (cursor <= last) {
      const cells: { date: Date; key: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        d.setDate(cursor.getDate() + i);
        cells.push({ date: d, key: d.toISOString().slice(0, 10) });
      }
      cols.push({ weekStart: new Date(cursor), cells });
      cursor.setDate(cursor.getDate() + 7);
    }
    return cols;
  }, [days]);

  if (loading && days.length === 0) {
    return <View style={{ height: 140, backgroundColor: theme.color3.val, borderRadius: 8 }} />;
  }

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const grid = (
    <XStack gap={cellGap}>
      {columns.map((col, ci) => (
        <YStack key={ci} gap={cellGap}>
          {col.cells.map((cell) => {
            const summary = byDay.get(cell.key);
            const isFuture = cell.key > todayKey;
            const minutes = summary?.total_minutes ?? 0;
            const bucket = bucketIndex(minutes);

            if (isFuture) {
              return (
                <View
                  key={cell.key}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: theme.color5.val,
                    borderRadius: 2,
                  }}
                />
              );
            }

            const bg = theme[BUCKET_COLORS[bucket].replace('$', '') as keyof typeof theme]?.val ?? theme.color3.val;
            const isInteractive = (summary?.workout_count ?? 0) > 0;

            return (
              <Popover
                key={cell.key}
                open={openDay === cell.key}
                onOpenChange={(o) => setOpenDay(o ? cell.key : null)}
                placement="top"
              >
                <Popover.Trigger asChild>
                  <View
                    onTouchEnd={() => isInteractive && setOpenDay(cell.key)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bg as string,
                      borderRadius: 2,
                    }}
                  />
                </Popover.Trigger>
                {isInteractive && (
                  <Popover.Content
                    bordered
                    elevate
                    bg="$color2"
                    p="$3"
                    enterStyle={{ y: -4, opacity: 0 }}
                    exitStyle={{ y: -4, opacity: 0 }}
                  >
                    <YStack gap="$1">
                      <Paragraph size="$3" color="$color12" fontWeight="600">
                        {cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Paragraph>
                      <Paragraph size="$2" color="$color11">
                        {summary!.workout_count === 1 ? '1 workout' : `${summary!.workout_count} workouts`}
                        {minutes > 0 && ` · ${minutes} min`}
                      </Paragraph>
                      <Text
                        fontSize="$2"
                        color="$blue10"
                        onPress={() => {
                          setOpenDay(null);
                          router.push(`/?date=${cell.key}` as any);
                        }}
                      >
                        View workout →
                      </Text>
                    </YStack>
                  </Popover.Content>
                )}
              </Popover>
            );
          })}
        </YStack>
      ))}
    </XStack>
  );

  return (
    <YStack gap="$2">
      <XStack items="center" justify="space-between">
        <Text fontSize="$3" color="$color11" fontWeight="600">Training calendar</Text>
        <XStack gap="$1" items="center">
          <Text fontSize="$1" color="$color9">less</Text>
          {BUCKET_COLORS.map((c, i) => (
            <View key={i} style={{ width: 10, height: 10, backgroundColor: theme[c.replace('$', '') as keyof typeof theme]?.val ?? '', borderRadius: 2 }} />
          ))}
          <Text fontSize="$1" color="$color9">more</Text>
        </XStack>
      </XStack>
      {isWide ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {grid}
        </ScrollView>
      ) : (
        grid
      )}
    </YStack>
  );
}
```

- [ ] **Step 2: Verify compiles**

Run: `yarn tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/features/profile/CalendarHeatmap.tsx
git commit -m "feat(profile): add CalendarHeatmap component"
```

---

## Phase 4 — Integration

### Task 13: Rewrite `ProfileSummary` to compose all sections

**Files:**
- Modify: `components/features/profile/ProfileSummary.tsx` (full rewrite)
- Modify: `components/features/profile/index.ts` (add new exports)

- [ ] **Step 1: Rewrite `ProfileSummary.tsx`**

Replace the entire file with:

```tsx
import { ScrollView, YStack, Card } from "tamagui";
import { RefreshControl } from "react-native";
import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import {
  useProfileStats,
  useProfileRange,
  useProfileWeeklyTrends,
  usePrTimeline,
  useDailyTrainingSummary,
} from "@/lib/hooks";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { IdentityStrip } from "./IdentityStrip";
import { RangeChips } from "./RangeChips";
import { ProfileTrendChart } from "./ProfileTrendChart";
import { PrTimeline } from "./PrTimeline";
import { CalendarHeatmap } from "./CalendarHeatmap";

export function ProfileSummary() {
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useProfileStats();
  const { range, setRange, hydrated } = useProfileRange();

  const weekly = useProfileWeeklyTrends(range);
  const prs = usePrTimeline(range, 8);
  const daily = useDailyTrainingSummary(range);

  const [refreshing, setRefreshing] = useState(false);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetchStats();
      weekly.refetch();
      prs.refetch();
      daily.refetch();
    }, [refetchStats, weekly.refetch, prs.refetch, daily.refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchStats(),
      weekly.refetch(),
      prs.refetch(),
      daily.refetch(),
    ]);
    setRefreshing(false);
  };

  if (statsLoading && !stats) return <LoadingState message="Loading your stats..." />;
  if (statsError) {
    return <ErrorState title="Error loading stats" message={statsError.message} onRetry={refetchStats} />;
  }
  if (!stats) return <ErrorState title="No Data" message="No statistics available" />;

  return (
    <ScrollView
      flex={1}
      bg="$background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <YStack p="$4" gap="$4" width="90%" $sm={{ width: "80%" }} $md={{ width: "75%" }} self="center">
        <IdentityStrip stats={stats} />

        {stats.total_workouts > 0 && hydrated && (
          <>
            <RangeChips value={range} onChange={setRange} />

            <ProfileTrendChart trends={weekly.data} loading={weekly.loading} />

            {weekly.error && (
              <Card bordered bg="$color2" p="$3">
                <YStack gap="$1">
                  <YStack>Couldn't load trends. Pull to refresh.</YStack>
                </YStack>
              </Card>
            )}

            <PrTimeline
              prs={prs.data}
              loading={prs.loading}
              hasAnyPrEver={true}
            />

            <CalendarHeatmap
              days={daily.data}
              range={range}
              loading={daily.loading}
            />
          </>
        )}
      </YStack>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Update `components/features/profile/index.ts`**

Read existing file, then ensure exports include all new components. Final file:

```typescript
export { ProfileSummary } from './ProfileSummary';
export { StatCard } from './StatCard';
export { TrendIndicator } from './TrendIndicator';
export { IdentityStrip } from './IdentityStrip';
export { RangeChips } from './RangeChips';
export { ProfileTrendChart } from './ProfileTrendChart';
export { PrTimeline } from './PrTimeline';
export { PrTimelineCard } from './PrTimelineCard';
export { CalendarHeatmap } from './CalendarHeatmap';
```

- [ ] **Step 3: Verify the whole project still type-checks**

Run: `yarn tsc --noEmit`
Expected: No new errors. Address any.

- [ ] **Step 4: Commit**

```bash
git add components/features/profile/ProfileSummary.tsx components/features/profile/index.ts
git commit -m "feat(profile): compose redesigned profile page from new sections"
```

---

### Task 14: Local end-to-end verification

- [ ] **Step 1: Start Supabase + edge functions if not already running**

Run in separate terminals (skip if already running):
```bash
supabase start
supabase functions serve --env-file ./supabase/.env.local --no-verify-jwt --debug
```

- [ ] **Step 2: Start the Expo dev server**

Run: `yarn start`

- [ ] **Step 3: Open iOS simulator and exercise the profile tab**

Open the iOS simulator (press `i` in the Expo terminal). Sign in with a seeded user. Navigate to the Profile tab. Verify each section in order:

- **IdentityStrip:** four values render. Flame is orange, current streak is the largest value. If the user has 0 workouts, the empty-state card appears instead.
- **RangeChips:** 1M / 3M / 1Y / All chips appear. Selecting a new chip refetches the chart, PR timeline, and heatmap. Close the app and re-open: the previously selected range persists.
- **ProfileTrendChart:** chart renders with Workouts | Time | Volume chips. Volume chip is hidden for cardio-only users. Tap and drag along the line — tooltip shows "X workouts · Mar 3 – 9" style label.
- **PR Timeline:** horizontal scroll of yellow-bordered cards. Tap a card → navigates to the workout. Section is hidden if user has PRs outside the range but none in the selected range.
- **CalendarHeatmap:** GitHub-style grid renders. Empty days use the empty bucket color. Future days are dashed outlines. Tap a populated cell → popover with date, workout count, minutes, and "View workout" link.

- [ ] **Step 4: Test error containment**

In `lib/api/supabase/profileTrends.ts`, temporarily rename `'get_user_pr_timeline'` to `'nonexistent_rpc'`. Reload the simulator. Expected: the PR section gracefully hides or shows an empty state; the rest of the page keeps working. Revert the change before committing.

- [ ] **Step 5: Test empty / new-user state**

If possible, sign in as a user with 0 workouts. Expected: only the IdentityStrip's "Start your streak" empty card renders; chips, chart, PR timeline, and heatmap are not shown.

- [ ] **Step 6: Verify network calls**

In the Supabase Studio Logs tab (or via `supabase logs`), confirm that selecting a new range triggers three RPC calls: `get_user_profile_weekly_trends`, `get_user_pr_timeline`, `get_daily_training_summary`. Each returns 200.

---

### Task 15: Clean up dead code

**Files:**
- Modify or delete: `components/features/profile/TrendIndicator.tsx`
- Modify or delete: `components/features/profile/ExerciseStatsCard.tsx`
- Modify: `components/features/profile/index.ts`

- [ ] **Step 1: Verify `TrendIndicator` is no longer used**

Run: `grep -rn "TrendIndicator" --include="*.ts" --include="*.tsx" .`
Expected: Only the file itself and `components/features/profile/index.ts` reference it. If anything else does, leave the file as-is.

- [ ] **Step 2: Delete unused files**

If both files are unused (confirmed by grep), run:
```bash
git rm components/features/profile/TrendIndicator.tsx
git rm components/features/profile/ExerciseStatsCard.tsx
```

- [ ] **Step 3: Remove exports from `index.ts`**

Edit `components/features/profile/index.ts` and delete the two corresponding `export` lines.

- [ ] **Step 4: Verify project still type-checks**

Run: `yarn tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit cleanup**

```bash
git add components/features/profile/index.ts
git commit -m "chore(profile): drop unused TrendIndicator and ExerciseStatsCard"
```

---

## Self-Review (filled by plan author)

**Spec coverage:**
- Identity strip → Task 8 ✓
- Range chips + persistence → Tasks 5, 6, 9 ✓
- Multi-metric chart → Tasks 1, 4, 7, 10 ✓
- PR timeline → Tasks 3, 4, 7, 11 ✓
- Calendar heatmap → Tasks 2, 4, 7, 12 ✓
- Three new RPCs → Tasks 1, 2, 3 ✓
- ProfileSummary rewrite + section composition → Task 13 ✓
- Backward compat (additive migration, per-section error containment) → Task 14 step 4 verifies; spec describes the pattern ✓
- Dead-code cleanup → Task 15 ✓

**Placeholder scan:** None. All steps include full code or concrete commands.

**Type consistency:** `ProfileRange` is defined once in `lib/api/supabase/profileTrends.ts` and imported everywhere else. `WeeklyTrends`, `PrTimelineEntry`, `DailySummaryPoint` are also defined once and reused. Hook return shapes follow the same `{ data, loading, error, refetch }` contract.

**Known caveats during implementation:**
- The `display_name` SQL formatter uses `string_agg(m, ' ')` over `jsonb_array_elements_text` — Postgres requires this be in a scalar subquery (already structured as such). If the JSONB modifiers happen to be malformed for a row, the function will return an empty string for that prefix; not fatal.
- `parse_iso8601_duration_to_seconds` is assumed to exist (per CLAUDE.md it does). If a migration ever removed it, Task 3 will fail at apply time — fix by inlining the conversion or restoring the helper.
- The heatmap's `View workout` link uses `/?date=<day>` as a navigation hint — this assumes the index tab can read a `date` query param. If it can't, the link will simply land on the workouts list without filtering; refine in a follow-up if needed.
