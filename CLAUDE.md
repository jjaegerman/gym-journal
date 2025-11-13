# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native fitness tracking app using Expo Router and Supabase backend. Records voice workouts via OpenAI API with structured output extraction for exercise categorization and metrics.

**Tech Stack:**
- **Frontend**: React Native 0.81, Expo 54, Expo Router (file-based routing), Tamagui (UI framework)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI Structured Outputs API for transcription-to-data extraction
- **Package Manager**: Yarn 4.5.0
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
  - `app/(tabs)/` - Tab navigation (index = workouts, profile, recording)
  - `app/workout.tsx` - Workout details screen
  - `app/reset-password.tsx` - Password reset flow

### Component Organization
- `components/` - Presentational components
  - `components/features/` - Feature-specific components (auth, recording, profile, workout)
  - `components/ui/` - Reusable UI primitives (buttons, dialogs, form inputs)
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
- `lib/utils/` - Utility functions (date formatting, string manipulation)

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

### Exercise Data Model
Exercises use a **hierarchical categorization system** to group variants:

1. **Exercise Type** (18 categories): Broad movement patterns (e.g., "Squat", "Deadlift", "Cardio")
2. **Exercise Variant**: Full descriptive name with ALL modifiers (e.g., "Barbell Back Squat", "Treadmill Running")
3. **Primary Equipment**: Optional enum for main equipment used

**Database Schema:**
- `exercises` table: `id`, `variant` (text), `type` (text), `equipment` (text), `workout_id`
- `logs` table: Individual sets with `weight`, `repetitions`, `distance`, `distance_unit`, `resistance_level`, `duration`, `effort`

**Stats Aggregation**: Groups by `type` only (not variant/equipment) to show combined statistics across all variants of the same exercise type.

### OpenAI Integration Flow
1. User records audio via Expo Audio
2. Audio sent to `supabase/functions/openai/index.ts`
3. OpenAI transcribes and extracts structured data via `responses.parse()` with Zod schema
4. Edge function calls `add_log()` RPC function to insert into PostgreSQL
5. Frontend refetches workout data via React Query

**Schema Definition**: `supabase/functions/_shared/types.ts` defines `OpenAILogDetails` schema with:
- `exerciseType`: Enum (ExerciseCategory) - 18 broad categories
- `exerciseVariant`: String - full name with modifiers
- `primaryEquipment`: Optional enum (Equipment) - ~30 equipment types
- Strength metrics: weight, weightUnit, repetitions, sets
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
