# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native fitness tracking app using Expo Router and Supabase backend. Records voice workouts via OpenAI API with structured output extraction for exercise categorization and metrics.

**Tech Stack:**
- **Frontend**: React Native 0.81, Expo 54, Expo Router (file-based routing), Tamagui (UI framework)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI `gpt-4o-transcribe` for audio, `gpt-4.1` for structured extraction
- **Package Manager**: Yarn 4.12.0
- **Schema Validation**: Zod for TypeScript and OpenAI schemas

## Development Commands

### Running the App
```bash
yarn start              # Start Expo dev server with cache clear
yarn ios               # Run on iOS simulator
yarn android           # Run on Android emulator
yarn web               # Run in web browser
yarn test              # Run Jest tests in watch mode
```

### Supabase Local Development
```bash
supabase start                                                     # Start local Supabase
supabase migration up                                              # Apply migrations locally
supabase functions serve --env-file ./supabase/.env.local \
  --no-verify-jwt --debug                                          # Serve edge functions locally
```

### Supabase Database Operations
```bash
supabase db pull       # Pull remote schema changes to local migrations
supabase db push       # Push local migrations to remote database
npx supabase status    # Check connection and service status
```

### Tamagui
```bash
yarn upgrade:tamagui           # Upgrade to latest stable
yarn upgrade:tamagui:canary    # Upgrade to canary
yarn check:tamagui             # Validate Tamagui config
```

## Architecture

### File-Based Routing (Expo Router)
- `app/` - Route screens using file system convention
  - `app/_layout.tsx` - Root layout with auth providers
  - `app/(tabs)/` - Tab navigation (index = workouts, history, stats, profile, recording)
  - `app/(tabs)/history.tsx` - Workout history with filtering
  - `app/(tabs)/stats.tsx` - Exercise statistics with filtering
  - `app/workout.tsx` - Workout details screen
  - `app/reset-password.tsx` - Password reset flow

### Component Organization
- `components/` - Presentational components
  - `components/features/` - Feature-specific components (auth, recording, profile, workout, stats)
  - `components/features/stats/` - ProgressChart, PersonalRecords, RecentSessions, StatsFilters
  - `components/features/workout/WorkoutFilters.tsx` - Workout history filter controls
  - `components/ui/` - Reusable UI primitives (buttons, dialogs, form inputs)
  - `components/ui/filters/` - FilterChip, FilterSheet, MoreFiltersSheet, DateRangePicker
  - `components/shared/` - Cross-feature shared components
  - `components/Provider.tsx` - Wraps app with Tamagui, Toast providers
  - `components/WorkoutView.tsx` - Detailed workout display with exercise summaries
  - `components/ExerciseLogs.tsx` - Dialog showing all logs for an exercise

### Data Layer
- `lib/api/supabase/` - Supabase API client and data fetching functions
  - `client.ts` - Configured Supabase client with AsyncStorage session persistence
  - `workouts.ts` - Workout CRUD operations
  - `stats.ts` - Exercise statistics aggregation
- `lib/hooks/` - React hooks for auth, workouts, sessions
  - `useWorkoutHistory` - Workout list with filtering support
  - `useFilteredExerciseStats` - Exercise stats with filter parameters
  - `useCurrentWorkout` - Active/most-recent workout state
- `lib/storage/` - Local persistence (inputMode, statsCategory) via AsyncStorage
- `lib/utils/` - Utility functions (date formatting, string manipulation)
  - `lib/utils/filterCascade.ts` - Cascading filter option computation from relationship data

### Type Safety
- `types/` - Zod schemas and TypeScript types
  - `types/exercise.ts` - Core domain types (Exercise, Log, Workout, WorkoutDetails)
  - All database responses validated through Zod schemas with `.parse()`

### Supabase Backend
- `supabase/migrations/` - Database schema migrations (timestamp-ordered, immutable once applied)
- `supabase/functions/` - Edge functions (Deno runtime)
  - `supabase/functions/_shared/types.ts` - Shared Zod schemas for OpenAI structured output
  - `supabase/functions/openai/` - Audio transcription + structured extraction endpoint

## Key Architectural Patterns

### Database Schema

#### Core Tables

**workouts** - Workout sessions (auto-created via 1-hour gap detection)
- `id`, `user_id`, `datetime`, `started_at`, `ended_at`

**logs** - Individual exercise entries (event sourcing model)
- `id`, `workout_id`, `submission_id` (audit trail)
- `input` (TEXT, NOT NULL) - Raw spoken/typed exercise (source of truth)
- `category` (TEXT, NOT NULL) - Structured category enum (18 types)
- `modifiers` (JSONB, default `[]`) - Variant descriptors (e.g., `["Incline", "Close Grip"]`)
- `equipment` (TEXT) - Equipment used
- Strength: `weight`, `weight_unit`, `repetitions`
- Cardio: `distance`, `distance_unit`, `duration` (ISO 8601), `resistance_level`
- `effort`, `datetime`

**workout_submissions** - Immutable audit trail for raw input
- `id`, `user_id`, `workout_id`, `submission_type` (audio/text)
- `raw_text` - Original transcription (immutable)
- `ai_response` (JSONB) - Full OpenAI structured output
- `model_version`, `prompt_version`, `audio_duration_seconds`, `created_at`

**profiles** - User profile data
- `id` (FK to auth.users), `username`, `full_name`, `avatar_url`

#### Views

**workout_exercises** - Aggregates logs by `{input, category, modifiers, equipment}` within a workout
- Returns: `total_sets`, `max_weight`, `max_reps`, `avg_weight`, `total_volume`, `total_distance`

#### Key Design Patterns

- **Event Sourcing**: Raw input stored in `workout_submissions` (immutable), logs derived with extracted metadata
- **Workout Grouping**: 1-hour gap between logs = new workout (implemented in RPC functions)
- **Stats Aggregation**: Groups by `{category, modifiers, equipment}` for trend analysis
- **RLS**: Direct table access revoked; all reads via SECURITY DEFINER functions using `auth.uid()`
- **Empty Workout Cleanup**: `delete_log` auto-deletes workouts with 0 remaining logs; `get_user_workouts` uses INNER JOIN as defense-in-depth

### OpenAI Integration Flow
1. User records audio via Expo Audio (native iOS module fallback for better control)
2. Audio sent to `supabase/functions/openai/index.ts`
3. OpenAI transcribes with `gpt-4o-transcribe`, then extracts structured data via `responses.parse()` with Zod schema using `gpt-4.1`
4. Edge function calls `add_submission_with_logs()` RPC to insert submission + logs transactionally
5. Frontend refetches workout data

**Schema Definition**: `supabase/functions/_shared/types.ts` defines `OpenAILogDetails` schema with:
- `input`: Exercise exactly as spoken (source of truth)
- `category`: Enum (ExerciseCategory) - 18 broad categories
- `modifiers`: Array of applicable modifiers (Back, Incline, Pause, etc.)
- `equipment`: Optional enum (Equipment) - ~30 equipment types
- Strength metrics: weight, weightUnit, repetitions
- Cardio metrics: distance, distanceUnit, duration, resistanceLevel
- General: effort level

**OpenAI API Requirements:**
- Use `.nullable().optional()` instead of `.optional()` for optional fields
- Enum values passed via schema, don't enumerate in prompt (token efficiency)
- Prompts should be concise (target <100 tokens)

### Database Function Patterns
PostgreSQL functions in `supabase/migrations/` follow these conventions:

1. **Function Signature Changes Require DROP**: Cannot use `CREATE OR REPLACE` when changing return types or parameters - must `DROP FUNCTION IF EXISTS` first
2. **Function Overloading**: Multiple functions with same name but different parameter counts can conflict - drop old signatures explicitly
3. **RPC Naming**: Functions called via `supabase.rpc('function_name', params)` from frontend
4. **Return Types**: Use `RETURNS TABLE(...)` for result sets, `RETURNS void` for mutations

### RPC Functions Reference

#### Data Mutation

**add_submission_with_logs(p_raw_text, p_submission_type, p_ai_response, p_logs, p_model_version, p_prompt_version, p_audio_duration_seconds)** → UUID
- Primary function called by OpenAI edge function
- Creates submission + all logs atomically in one transaction
- Auto-groups into existing workout (if last log < 1 hour) or creates new workout
- Skips logs missing required `input` or `category` fields

**add_submission(...)** → UUID
- Creates submission record only (used before add_log for separate operations)

**add_log(p_submission_id, p_input, p_category, p_modifiers, p_equipment, p_weight, p_weight_unit, p_repetitions, p_duration, p_effort, p_distance, p_distance_unit, p_resistance_level)** → UUID
- Creates individual log entry linked to submission
- Validates submission belongs to current user

**delete_log(p_log_id)** → BOOLEAN
- Deletes a log entry belonging to the authenticated user
- Auto-deletes the parent workout if it has 0 remaining logs

#### Data Retrieval

**get_user_workouts()** → TABLE
- Returns all workouts for authenticated user
- Columns: `id`, `datetime`, `exerciseCount`, `logCount`, `mostRecentLog`, `exercisePreview` (JSONB, top 3), `totalVolume`, `totalDistance`, `distanceUnit`, `durationMinutes`
- Ordered by datetime DESC

**get_workout_details(p_workout_id)** → JSONB
- Returns full workout with exercises and nested logs
- Groups logs by `{input, category, modifiers, equipment}`
- Structure: `{ id, datetime, endTime, exercises: [{ id, input, category, modifiers, equipment, logs: [{ ..., input }] }] }`

**get_exercise_stats()** → TABLE
- Returns exercise statistics grouped by `{category, modifiers, equipment}`
- All-time: `total_workouts`, `total_volume`, `alltime_max_weight`, `alltime_max_reps`, `alltime_avg_pace`
- Recent 4 weeks: `recent_*` columns (per-week averages)
- Previous 4 weeks: `prev_*` columns (for trend comparison)

**get_user_profile_stats()** → JSONB
- Returns profile dashboard statistics
- Keys: `total_workouts`, `total_hours`, `current_streak_days`, `longest_streak_days`
- Recent/prev 4-week comparisons for trends

#### Helper Functions

**calculate_current_streak()** → INTEGER - Consecutive workout days (1-day grace period)
**calculate_longest_streak()** → INTEGER - Longest consecutive streak in history
**parse_iso8601_duration_to_seconds(duration_str)** → NUMERIC - Converts "PT30M" to seconds

#### Filtering

**filter_user_workouts(p_categories, p_equipment, p_date_from, p_date_to)** → TABLE
- Returns workouts matching category/equipment/date filters
- Same column shape as `get_user_workouts`

**get_workout_filter_options()** → TABLE
- Returns available categories and equipment for the authenticated user's workouts

**get_exercise_filter_options()** → TABLE
- Returns available categories, modifiers, and equipment for the authenticated user's exercises

**get_filtered_exercise_stats(p_categories, p_modifiers, p_equipment, p_time_range)** → TABLE
- Returns filtered exercise stats with PRs and progress trends
- Supports time range filtering (e.g., 4 weeks, 12 weeks, all-time)

**get_filter_relationships()** → TABLE
- Returns category/equipment/modifiers combinations present in user data
- Used for cascading filter UIs (selecting a category narrows available equipment/modifiers)

### Supabase Migration Workflow
- Migrations are **timestamp-ordered** (YYYYMMDDHHmmss_description.sql)
- Once applied to remote, migrations are **immutable** - create new migration to modify
- Use `supabase db pull` to sync remote changes before creating new migrations
- Use `supabase db push` to apply local migrations to remote
- Test locally with `supabase migration up` before pushing

## Common Gotchas

1. **Zod Schemas Must Match Across Boundaries**:
   - `supabase/functions/_shared/types.ts` (OpenAI schema)
   - `types/exercise.ts` (Frontend types)
   - Database column names must align with frontend types (use snake_case in DB, map to camelCase in Zod)

2. **PostgreSQL Function Updates**:
   - Changing return columns or parameter types requires `DROP FUNCTION` first
   - Function overloading conflicts resolved by dropping old signatures
   - Always grant permissions after function creation: `GRANT EXECUTE ON FUNCTION ... TO authenticated`

3. **AsyncStorage Session Persistence**:
   - Supabase client configured with AsyncStorage for session persistence
   - Auth state persists across app restarts

4. **OpenAI Structured Outputs**:
   - Optional fields must use `.nullable().optional()` not just `.optional()`
   - Enums automatically visible to model via schema - don't duplicate in prompt
   - Keep system prompts concise to minimize token usage

5. **Expo Router Navigation**:
   - File-based routing - create files in `app/` to add routes
   - Use `router.push()` from `expo-router` for navigation
   - Typed routes enabled in `app.json` - use autocomplete for route names

6. **Audio Recording Dual Strategy**:
   - iOS: Custom native module (`audio-session-manager`) for better control
   - Android/Web: Falls back to Expo Audio API
   - Check `Platform.OS === "ios" && AudioSessionManager?.startRecording` for native path

7. **TypeScript Path Aliases**:
   - All imports use `@/*` prefix (configured in `tsconfig.base.json`)
   - Example: `import { supabase } from "@/lib/api/supabase/client"`

8. **Required Log Fields**:
   - `input` and `category` are NOT NULL in database
   - `add_submission_with_logs` silently skips logs missing these fields
   - `add_log` raises exception if these are NULL or empty

9. **Duration Storage**:
   - Stored as TEXT in ISO 8601 format (e.g., "PT30M", "PT1H15M30S")
   - OpenAI returns ISO 8601 directly; stored without conversion
   - Use `parse_iso8601_duration_to_seconds()` for calculations

10. **Tamagui Sheet Ghost Press Pattern**:
    - When a Tamagui `<Sheet>` closes, its dismiss animation fires phantom touch events at the original tap coordinates. These ghost presses land on whatever content is now under that position and can re-trigger handlers.
    - Fix with a `committedRef = useRef(false)` guard in any interactive sheet:
      - Set `committedRef.current = true` at the start of the selection handler
      - Guard the handler: `if (committedRef.current) return`
      - Reset **only when the sheet opens** (`useEffect` on `open` prop, trigger only when `open === true`)
      - **Do NOT reset when `open` goes to `false`** — ghost presses fire during the close animation, after `open` is already `false`, so resetting on close lets them through
      - For options that keep the sheet open (e.g. "Custom" date range): reset via `setTimeout(..., 400)` instead so the user can still change their selection within the same session
    - Also avoid attaching the same handler to both `RadioGroup.onValueChange` AND `XStack.onPress` — both fire on a single tap, causing double invocation. Use only `XStack.onPress`.
    - See `components/ui/filters/DateRangePicker.tsx` and `components/ui/filters/FilterSheet.tsx` for reference implementations.
