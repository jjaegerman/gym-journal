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

## Dev Best Practices

- **No magic numbers** — use Tamagui `$N` size tokens for all sizing/spacing, never raw pixel values
- **No hardcoded colors** — never use hex values, `rgba()`, named CSS colors, or `opacity` for text emphasis in components. All colors come from theme tokens.
- **Tamagui components first** — check if a built-in component handles it before writing custom layout (e.g. `ListItem`, `Popover`, `Sheet`)
- **Theme variables over custom styles** — use built-in props (`hoverTheme`, `pressTheme`, `bordered`, `elevate`) instead of inline styles

### Color Tokens (Radix 12-Step Scale)

Use semantic `$colorN` tokens — they respond to theme changes. Raw tokens (`$gray5`, `$blue10`) only for intentionally fixed colors (errors, success, links, exercise category icons).

| Steps | Role | Examples |
|-------|------|----------|
| 1–2 | Background | `$background`, tab/header bg |
| 3–5 | UI surfaces | 3=cards/panels, 4=hover, 5=active/selected |
| 6–8 | Borders | 6=subtle (most), 7=strong/focused, 8=hover only |
| 9–12 | Foreground | 9=tertiary text, 10=metadata, 11=labels/headers, 12=primary text |

- **Text emphasis via color steps, never opacity.** `$color11` for headers, `$color10` for descriptions, `$color9` for hints.
- **Accent colors**: wrap with `<Theme name="accent">` and use the same `$colorN` tokens.
- **Use `@/*` path aliases** for all imports
- **Zod schemas must match across boundaries** — `supabase/functions/_shared/types.ts`, `types/exercise.ts`, and DB columns must stay in sync. DB uses snake_case; JSONB from RPCs uses camelCase.
- **Don't call `supabase.rpc()` directly in components** — use `lib/api/supabase/` wrapper functions
- **Don't add auth/session logic in components** — auth is enforced in `Provider.tsx`
- **Unit preferences via `useUnitPreferences()` hook only** — never local `useState`
- **No heavy-import hooks in barrels** — `lib/hooks/index.ts` excludes `useAudioRecording` because re-exporting it loaded `expo-audio` on every page, triggering mic prompts on share routes. Import such hooks directly.
- **Token reference**: `node -e "const c=require('.tamagui/tamagui.config.cjs'); console.log(c.config.tokens.size)"`

## Key Design Patterns

- **Event Sourcing**: Raw input stored in `log_submissions` (immutable), `sets` derived with extracted metadata
- **Workout Grouping**: 1-hour gap between sets = new workout (in RPC functions)
- **Stats Aggregation**: Groups by `{exercise_kind, modifiers, equipment}` for trends
- **RLS**: Direct table access revoked; all reads via SECURITY DEFINER functions using `auth.uid()`
- **Empty Workout Cleanup**: `delete_set` auto-deletes workouts with 0 remaining sets
- **Unit defaulting**: Edge function's responsibility — always sends `weight_unit`/`distance_unit` using user preference as fallback. DB DEFAULT is last-resort safety net only.
- **Duration**: Stored as ISO 8601 text (e.g., "PT30M"). Use `parse_iso8601_duration_to_seconds()` for calculations.
- **Public share routes**: `app/share/*` bypasses auth via `useSegments()` in `Provider.tsx`. Uses parallel `get_public_*` RPCs (granted to `anon`, take `p_user_id` param instead of `auth.uid()`). Components thread `readonly?: boolean` to hide mutation UI.
- **Share URLs**: All built via `lib/share/links.ts` — never construct inline. `user_id` in stats URLs is temporary; swap for handles in that one file later.
- **Universal/App Links**: `app.json` → `associatedDomains` + `intentFilters` for `gym-journal.com`. Backing files at `public/.well-known/*`.

## OpenAI Integration

1. User records audio → sent to `supabase/functions/openai/index.ts`
2. `gpt-4o-transcribe` transcribes → `gpt-4.1` extracts structured data via `responses.parse()` with Zod schema
3. Edge function calls `add_submission_with_sets()` RPC (atomic insert)
4. Frontend refetches workout data

**API Requirements:**
- Use `.nullable().optional()` not just `.optional()` for optional fields
- Enum values passed via schema — don't enumerate in prompt
- Keep system prompts concise (<100 tokens)

## Supabase Migrations

- Timestamp-ordered, immutable once applied to remote
- Changing function return types/params requires `DROP FUNCTION IF EXISTS` first
- Always `GRANT EXECUTE ON FUNCTION ... TO authenticated` after creation
- Test locally before pushing: `supabase migration up`
- psql not in PATH — use: `docker exec supabase_db_gym-journal psql -U postgres -c "..."`

## Common Gotchas

1. **Tamagui Sheet Ghost Press**: Closing sheets fire phantom touch events. Fix with `committedRef` guard — see `DateRangePicker.tsx`, `FilterSheet.tsx`, `MoreFiltersSheet.tsx` for reference. Also: don't attach handlers to both input callback AND `XStack.onPress` (double-fires).

2. **Two `formatDuration` functions**: `lib/utils/date.ts` takes minutes (re-exported from barrel); `lib/utils/formatters.ts` takes seconds (direct import only). Don't mix them.

3. **Audio Recording**: iOS uses native module (`audio-session-manager`); Android/Web falls back to Expo Audio. Check `Platform.OS === "ios" && AudioSessionManager?.startRecording`. Permission setup is lazy on web (first record tap), eager on Android (mount) — via `ensureAudioSetup` in `useAudioRecording.ts`. Don't unconditionally call `requestRecordingPermissionsAsync()` on mount.

4. **`Sheet.Overlay`** requires explicit `opacity` (e.g. `opacity={0.5}`) — default renders fully opaque black.

5. **`Popover` vs `Sheet`**: Use `Popover` for small contextual menus (3–5 items); reserve `Sheet` for full panel content.

6. **`input` and `exercise_kind` are NOT NULL**: `add_submission_with_sets` silently skips sets missing these; `add_set` raises exception.
