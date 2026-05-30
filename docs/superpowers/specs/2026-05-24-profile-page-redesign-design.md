# Profile Page Redesign — Design Spec

**Date:** 2026-05-24
**Status:** Draft, pending user review

## Goal

Replace the current Profile tab's "last 4 weeks vs. previous 4 weeks" cards with a graph-driven layout that conveys progress over time, supports an at-a-glance status check, and produces a screenshot-worthy "identity card." User-selectable time range drives the analytical surfaces (chart + heatmap) coherently.

## Non-goals

- No new account/settings affordances.
- No changes to the Stats tab (which keeps its existing single-exercise drilldown).
- No share-page changes in this spec (share routes will receive parallel `get_public_*` RPCs as a follow-up but UI work for the share variant is out of scope here).
- No "biggest PR jump" leaderboards, social, or comparison-to-others features.

## Page Structure

Top to bottom, in a single scrollable container (`ScrollView` with `RefreshControl`):

1. **Identity strip** — all-time totals + streaks, screenshot anchor
2. **Range chips** — `1M / 3M / 1Y / All`, drives sections 3–5 below
3. **Multi-metric chart** — single chart card with chips: Workouts | Time | Volume
4. **PR timeline** — horizontally scrolling trophy cards
5. **Calendar heatmap** — GitHub-style grid

Container constraints match the existing `ProfileSummary`: `width="90%"`, `$sm={{ width: "80%" }}`, `$md={{ width: "75%" }}`, `self="center"`, `gap="$4"`.

---

## Section 1 — Identity Strip

### Layout

Single `Card` (`bordered`, `elevate`, `p="$4"`, `br="$6"`, `bg="$color2"`) containing a 2x2 grid of inner `YStack` cells separated by `$color6` `Separator`s (vertical between columns, horizontal between rows). The card reads as one cohesive identity unit rather than four floating tiles.

### Hierarchy

- **Current Streak (hero, top-left):** value at `size="$10"`, `Flame` icon inline-leading the number, wrapped in `<Theme name="orange">` so flame + value pick up orange `$color11`. Live, primary stat.
- **Total Workouts (top-right):** secondary anchor at `size="$9"`.
- **Total Hours (bottom-left)** and **Best Streak (bottom-right):** supporting context at `size="$7"`.
- If `current_streak === longest_streak`, Best Streak cell shows a "PR" badge instead of the number to avoid redundancy.

### Typography & tokens

- Value: `H3`/`H4`, `fontWeight="bold"`, `color="$color12"` (hero inherits orange `$color11`).
- Label: `Paragraph size="$2"`, `color="$color11"`, uppercase, letter-spaced.
- Unit suffix (`h`, `days`): sibling `Paragraph size="$4" color="$color9"`, baseline-aligned, never inline with the value.
- Separators: `$color6`.

### Icons

Keep existing Lucide icons (Activity, Clock, Flame, TrendingUp). Position top-right of each cell at `size={16}`, `color="$color9"` — quiet metadata. Hero Flame is `size={28}`, inline with the value, orange-themed.

### Empty state

For users with 0 workouts: collapse the grid to a single full-width inner cell with the same card shell. Flame icon at `$color8`, headline "Start your streak" (`H4`, `$color11`), subcopy "Log your first workout to light this up" (`Paragraph size="$3" color="$color10"`). Same outer dimensions so the page doesn't jump after the first log.

### Component

**New component:** `components/features/profile/IdentityStrip.tsx`. Do NOT reuse `StatCard` — the strip needs asymmetric sizing, accent theming on the hero, inline icon-with-value, and a shared card shell that would balloon `StatCard`'s props. `StatCard` is retained but no longer used on the Profile tab (deletable from this page; the file stays for any future reuse).

### Data

All four values come from the existing `get_user_profile_stats` RPC's `total_workouts`, `total_hours`, `current_streak_days`, `longest_streak_days`. No backend changes.

---

## Section 2 — Range Chips

### Visual treatment

A single `XStack gap="$2"` of `Button` chips, mirroring the metric-toggle row in `ProgressChart.tsx`.

- Unselected: `chromeless`, `bg="$color3"`, label `color="$color11"`, `fontWeight="400"`.
- Selected: `bg="$color5"`, label `color="$color12"`, `fontWeight="600"`.
- `borderRadius="$3"`, `px="$3"`, `size="$2"` with `$sm={{ size: "$5" }}`.
- Labels: short form, `1M / 3M / 1Y / All`. Long form ("Last 3 months") used for `accessibilityLabel` only.

### State

Single `range` state in the new `ProfileSummary`, type `'1_month' | '3_months' | '1_year' | 'all_time'` (matches the existing `get_filtered_exercise_stats` enum). Persisted via AsyncStorage under key `profile.range` — selection sticks across launches, the same pattern as `useUnitPreferences`. Default seed: `3_months`.

### Layout

Left-aligned inside the page's main `YStack`, `py="$2"`, `flexWrap="wrap"` as a safety net (should never trigger with four short labels).

### Loading

Don't add chip-level spinners — rely on the chart's and heatmap's own loading states. Apply `disabled` on chips while a fetch is in-flight to prevent rapid-fire taps.

### Accessibility

`accessibilityRole="button"`, `accessibilityState={{ selected }}`, `accessibilityLabel` is the long form. Bumped tap size via `$sm={{ size: "$5" }}` matches existing patterns.

### Component

**New component:** `components/features/profile/RangeChips.tsx`. Props: `value`, `onChange`. State persistence lives in a small `useProfileRange()` hook in `lib/hooks/`.

---

## Section 3 — Multi-Metric Chart

### Metrics & chart type

A **single line chart** for all three metrics (Workouts | Time | Volume), curved with optional dots — visually identical to `ProgressChart.tsx`. Switching chart type per metric would break visual continuity.

- **Workouts/week:** integer count. Y-labels rounded to integers; `niceStep = Math.max(niceStep, 1)`.
- **Time/week:** minutes. Y-labels formatted as `1h` / `30m`.
- **Volume/week:** value in user's preferred weight unit. Hidden via `availableMetrics` filtering when all weeks have `total_volume === 0`.

### Component

**New component:** `components/features/profile/ProfileTrendChart.tsx`. Build new, do NOT extend `ProgressChart` — `ProgressChart` is exercise-scoped with 7 coupled metric branches. Lift shared visual primitives (nice-step Y math, pointer-shift hack, `xLabelIndices` footer) into `lib/charts/` helpers so both charts share the gifted-charts quirks but each owns its data shape.

### Y-axis scaling

Reuse the nice-step math from `ProgressChart.tsx` (lines 224–232): `niceStep = ceil(rawMax/4 / magnitude) * magnitude`, `maxValue = niceStep * 4`. Force integer step for Workouts.

### Tooltip

Tap-and-drag with `pointerConfig`, `activatePointersOnLongPress: false` — matches `ProgressChart`. Two lines:

- Line 1 (value, `$color12`, 12px, weight 600): `4 workouts` / `3h 20m` / `12,450 lbs`
- Line 2 (week range, `$color10`, 10px): `Mar 3 – 9`

Week-range labeling (not single date) is the differentiator from `ProgressChart`.

### Empty states

- **Zero workouts in window:** 200-tall placeholder, copy "No workouts in this range" with subtle `<Text color="$color9">Try All</Text>` CTA.
- **Cardio-only (volume = 0 across all weeks):** Volume chip suppressed via `availableMetrics`. No standalone state.
- **<2 weeks of data:** placeholder "Need 2+ weeks to chart trends" (mirrors `metricSeries.length < 2` guard in `ProgressChart`).

### Loading + range change

Preserve old chart with a shimmer overlay during range-change refetch (`$color3` overlay at `opacity={0.5}`, absolutely positioned over the chart body). Avoids height-jank on every chip tap. True skeleton (`$color3` rounded rectangle, `height={200}`) only on initial mount with no cached data.

### New RPC

```
get_user_profile_weekly_trends(
  p_start_date date,
  p_end_date date
) RETURNS jsonb
```

- `SECURITY DEFINER`, `SET search_path = public`, uses `auth.uid()`.
- Generates a `generate_series(date_trunc('week', p_start_date), p_end_date, '1 week')` spine. LEFT JOIN against `workouts` / `sets` so empty weeks return `0` — no client-side gap-fill needed (drop `ProgressChart`'s interpolation logic for this chart).
- Returns `{ weight_unit, weeks: [{ week_start, workout_count, total_minutes, total_volume }] }`. `weight_unit` resolved server-side from `user_unit_preferences` with `lbs` fallback.
- Volume aggregation: `SUM(weight * repetitions)` with kg↔lbs conversion (`* 2.20462` / `/ 2.20462`) to match user's preferred unit.
- Time per workout: matches the `get_user_profile_stats` precedent (sum of per-workout durations derived from sets' `datetime` range or stored `duration`).
- `GRANT EXECUTE ... TO authenticated`. No `anon` grant (private; share variant deferred).

Page-level range chip computes `p_start_date` client-side; `all_time` passes the user's earliest workout date.

### Visual tokens

Wrapped in `<Theme name="accent">`:

- Line: `$color10`, dots `$color10` (radius 4).
- Gridlines (dashed): `$color6`. X-axis line: `$color6`.
- Y/X-axis labels: `$color11`, 10px.
- Tooltip bg `$color3`, value `$color12`, date `$color10`.
- Chip active: `bg="$color3"`, `color="$color11"`, `fontWeight="600"`. Inactive: `chromeless`.
- Card container: `bg="$color2"`, `bordered`, `borderColor="$color6"`, `borderRadius="$4"`, `p="$4"`, `gap="$3"`.

### Hook

**New hook:** `lib/hooks/useProfileWeeklyTrends(range)` — exposes `data`, `loading`, `refetching`, `error`, `refetch`.

---

## Section 4 — PR Timeline

### PR definition

A PR is the first time a `{exercise_kind, sorted_modifiers[], equipment}` group's metric crosses a previous ceiling. Four PR types, each gated by what the group's data supports:

- **Heaviest weight** — strength sets with `weight` present.
- **Most reps at top weight** — `reps` at the group's current max `weight`.
- **Distance or pace** — cardio sets with `distance` present; pace PR requires `distance` + `duration`. Pace wins if it's a pace improvement; otherwise distance. One per set, not both.
- **Duration** — for cardio without distance (e.g. plank).
- **New movement** — first-ever set in a group, only counted if user has 5+ total workouts (avoids spamming new users).

A PR requires a prior baseline in that group (no "PR on your very first set"), except for the explicit "New movement" type.

### Visual format

**Horizontal scroll of trophy cards.** A small sparkline row at the top (PR-event dots over the selected range) gives the at-a-glance density read; cards below give the substance. Each card is its own "moment."

- Card surface: `Card bordered bg="$color3" radius="$4" p="$3"`, `pressStyle={{ opacity: 0.8 }}`.
- Card width ~ `$18` (~280) so two peek on a standard phone — discoverable scroll affordance.
- `<Theme name="accent">` wraps the section to harmonize with the existing `PersonalRecords` card.
- Trophy accent: `$yellow10` icon, `borderColor="$yellow7"` on the card. This is the intentional fixed accent permitted by the styling rules (alongside category icons / success / error). All four PR types share the gold treatment; differentiation is via the type label.

### Sort & cap

- Sort: most recent first.
- Cap: 8 cards in the selected range. If more exist, append a "+N more" card opening a sheet with the full list.

### Per-card content

- Trophy icon + PR-type label: "Weight PR" / "Reps PR" / "Distance PR" / "Pace PR" / "Duration PR" / "New Movement"
- Exercise display name (existing `{modifiers} {kind} ({equipment})` formatter)
- Value: `185 lbs × 8`, `5.2 mi`, `8:32 /mi`, `12:00`
- Delta vs previous PR: `+5 lbs`, `+2 reps`, `-0:14 /mi` (negative is better for pace; color accordingly). Omitted for "New Movement."
- Relative date: `3d ago`, or `Mar 12` for older.
- Tap → navigate to workout detail via `workout_id`, mirroring `PersonalRecords.tsx`'s `onPRPress`. ChevronRight only when `workout_id` is present.

### Delta colors

- Improvement pill: `$green10` text on `$color4` bg.
- Pace regression edge case (defensive): `$red10`.

### Empty state

- Range has zero PRs but user has PRs outside the range: **hide the section entirely** (less demoralizing on a potentially shareable profile).
- Brand-new user with zero PRs anywhere: single static card "Log your first set to start tracking PRs" — shown only on `1_month` / `all_time`.

### New RPC

```sql
get_user_pr_timeline(
  p_time_range text DEFAULT '1_month',
  p_limit int DEFAULT 8,
  p_preferred_weight_unit text DEFAULT 'lbs',
  p_preferred_distance_unit text DEFAULT 'miles'
) RETURNS TABLE(
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
```

- Derive in DB. Per group: `ROW_NUMBER()` + running `MAX(...) OVER (PARTITION BY group_key ORDER BY datetime ROWS UNBOUNDED PRECEDING)` to find rows where the metric strictly exceeds the prior running max. Filter by time range, union the PR types, `ORDER BY achieved_at DESC LIMIT p_limit`.
- Unit conversion uses the existing coalesce-default pattern.
- `SECURITY DEFINER`, `auth.uid()`, `GRANT EXECUTE ... TO authenticated`.

### Hook

**New hook:** `lib/hooks/usePrTimeline(range)`.

### Components

- `components/features/profile/PrTimeline.tsx` (section container + sparkline + horizontal scroll)
- `components/features/profile/PrTimelineCard.tsx` (individual trophy card)

---

## Section 5 — Calendar Heatmap

### Intensity metric

**Workout duration (minutes) per day**, summed when multiple workouts occur on the same day. Volume is meaningless for cardio; set count undercounts long cardio. Duration is the only fair signal across cardio + strength + mixed users.

### Layout per range

GitHub-style orientation throughout: columns = weeks, rows = days, Sunday top → Saturday bottom.

- **1M (~5 cols × 7 rows):** larger cells (~`$1.5`), `gap="$1.5"`. Show day-of-month numerals inside larger cells at `$color11`. Include trailing future days in the current week.
- **3M (13 × 7):** standard cells (~`$1`), `gap="$1"`. Default range.
- **1Y (52 × 7):** small cells (~`$0.75`), `gap="$0.25"`. Wrap in horizontal `ScrollView` for narrow phones.
- **All:** cap visually at the most recent **2 years**; compress older data into a caption above ("+ 314 workouts before May 2024").

### Color scale

Wrapped in `<Theme name="accent">`, five buckets via accent `$colorN`:

- 0 min → `$color3` (empty)
- 1–20 min → `$color6`
- 21–45 min → `$color8`
- 46–75 min → `$color10`
- 76+ min → `$color12`

Bucket thresholds are duration-based, not percentile-based (percentile scales lie to consistent users).

### Labels

- **Month labels** along the top, only at the first column of each month, `$color10`, `$1` font.
- **Day labels** on the left, sparse: Mon / Wed / Fri only, `$color9`.
- 1M view: no month labels (single month is obvious).

### Empty / future days

- Empty: `$color3` filled square, no border. Reads as scaffolding, not data.
- Future: transparent fill with 1px `$color5` dashed border. Distinct from empty.

### Interaction

Tap → small Tamagui `Popover` anchored to the cell showing date, workout count, total minutes, and a "View workout" link.

- Single workout → navigates to detail.
- Multiple workouts → navigates to that day's filtered workout list.
- Empty / future cells are non-interactive.
- No long-press (RN long-press on small cells is finicky).

### Streak tie-in

Skip. The identity strip already surfaces the streak number; outlining the trailing N cells adds noise. The unbroken run of filled cells at the right edge reads as the streak naturally.

### New RPC

```sql
get_daily_training_summary(
  p_start_date date,
  p_end_date date
) RETURNS TABLE(day date, workout_count int, total_minutes int)
```

- `auth.uid()`, `SECURITY DEFINER`, `GRANT EXECUTE ... TO authenticated`.
- Aggregates `sets` joined to `workouts`, summing `parse_iso8601_duration_to_seconds(duration) / 60` per day.
- Max ~730 rows for 2 years; cheap.
- Sibling `get_public_daily_training_summary(p_user_id, ...)` for share routes (deferred — not in scope here).

### Implementation

Tamagui primitives (`View` grid), not a third-party library. `react-native-calendar-heatmap` is unmaintained and fights theme tokens. ~365 lightweight `View`s render in one pass — no FlatList virtualization needed. Memoize cells by `(range, dataHash)`.

### Hook

**New hook:** `lib/hooks/useDailyTrainingSummary(range)`.

### Component

**New component:** `components/features/profile/CalendarHeatmap.tsx`.

---

## Backend Summary

Three new SECURITY DEFINER RPCs, all in a single migration:

1. `get_user_profile_weekly_trends(p_start_date date, p_end_date date) RETURNS jsonb`
2. `get_user_pr_timeline(p_time_range text, p_limit int, p_preferred_weight_unit text, p_preferred_distance_unit text) RETURNS TABLE(...)`
3. `get_daily_training_summary(p_start_date date, p_end_date date) RETURNS TABLE(...)`

All three use `auth.uid()`, are granted to `authenticated`, and follow the existing patterns in `lib/api/supabase/stats.ts` for unit conversion. Public-share variants (`get_public_*`) are deferred to a follow-up — the share page will continue to render its current minimal layout for now.

## Frontend Summary

### New files

- `components/features/profile/IdentityStrip.tsx`
- `components/features/profile/RangeChips.tsx`
- `components/features/profile/ProfileTrendChart.tsx`
- `components/features/profile/PrTimeline.tsx`
- `components/features/profile/PrTimelineCard.tsx`
- `components/features/profile/CalendarHeatmap.tsx`
- `lib/hooks/useProfileRange.ts`
- `lib/hooks/useProfileWeeklyTrends.ts`
- `lib/hooks/usePrTimeline.ts`
- `lib/hooks/useDailyTrainingSummary.ts`
- `lib/charts/niceAxis.ts` (extracted from `ProgressChart` for shared use)
- `lib/api/supabase/profileTrends.ts` (or extend `lib/api/supabase/stats.ts`)

### Modified files

- `components/features/profile/ProfileSummary.tsx` — rewritten to compose the five sections.
- `components/features/profile/index.ts` — export new components, keep `StatCard` export (still public).

### Deleted from profile usage

- `components/features/profile/TrendIndicator.tsx` — no longer rendered (trend arrows replaced by the chart). File kept if unused elsewhere; deleted if not.
- `components/features/profile/ExerciseStatsCard.tsx` — already noted dead in memory; can be deleted as part of this work.

## Backward Compatibility

### Surface analysis

Audit of consumers (grep of repo): `TrendIndicator`, `StatCard`, `ProfileSummary`, `ExerciseStatsCard`, and `useProfileStats` are referenced only within `components/features/profile/`, `lib/hooks/`, and `app/(tabs)/profile.tsx`. **No external consumers.** No `app/share/profile/*` route exists, so share routes are untouched by this work.

`get_user_profile_stats` is preserved and continues to back the identity strip — its return shape is not modified.

### Rollout safety: old app + new DB

The new migration is purely additive — only `CREATE FUNCTION` for three new RPCs. Old app builds make no calls to these RPCs; they continue calling `get_user_profile_stats` exactly as today. **No breakage.**

### Rollout safety: new app + old DB

The risk window: a new app build reaches a user before the migration runs. New sections (chart, PR timeline, heatmap) call RPCs that don't exist → server returns 404 / function-not-found.

Mitigation, layered:

1. **Deploy DB first, app second** — standard order. Migration ships, then the app build is submitted. This is the primary safeguard.
2. **Per-section error containment** — each of the four new sections (RangeChips controls the three data sections) catches its own fetch error and renders an inline empty state ("Couldn't load — try again") rather than crashing the page or unmounting siblings. The IdentityStrip continues to work regardless because it uses the existing RPC. This means even if the migration is delayed or partially fails, the user still sees a usable profile.
3. **No global error boundary required** — each section already has loading/error states in its hook contract (`{ data, loading, error, refetch }`).

This containment also covers: a single new RPC failing in production for any reason (timeout, regression) doesn't take down the page.

### Safe revert path

Migration is immutable once applied (Supabase convention), but the work is structured so revert is trivial:

- **App-level revert:** revert the commit that ships the new ProfileSummary. The three new RPCs remain in the DB but are simply unused — no orphan data, no broken queries elsewhere.
- **DB-level revert (if needed):** ship a follow-up migration that `DROP FUNCTION IF EXISTS` the three new RPCs. Safe because nothing else calls them.
- **Data revert:** none required — no tables, columns, indexes, or rows are added or modified.

### Preserving old data shapes

The new RPCs are pure reads over existing tables (`sets`, `workouts`, `log_submissions`). They:

- Assume no new columns.
- Do not write, migrate, or transform any rows.
- Follow the established unit-conversion pattern from `get_filtered_exercise_stats` (preferred-unit param + coalesce defaults) so existing rows with mixed weight/distance units render correctly.
- Use `parse_iso8601_duration_to_seconds` for duration math — the existing helper, not a new convention.

### Share routes

Out of scope and unaffected. The deferred `get_public_*` variants are noted as a follow-up but not required for this change; share pages continue to render their current minimal layout. When a profile share route is added later, parallel public RPCs will be created alongside in their own migration.

### Deployment checklist

1. Run `supabase migration up` locally; verify three new RPCs exist and return expected shapes against seed data.
2. Run `supabase db push` to apply the migration to the remote DB **before** building the new app version.
3. Confirm in production: `select proname from pg_proc where proname in ('get_user_profile_weekly_trends', 'get_user_pr_timeline', 'get_daily_training_summary');` returns three rows.
4. Build and submit the new app version.
5. If something goes wrong mid-rollout: revert the app commit. DB stays as-is.

## Open Questions

None blocking; clarify during implementation:

- Exact bucket thresholds for the heatmap may need tuning after seeing real data.
- "All" range cutoff (2 years visual cap) is a sensible default but could become user-configurable later.
- Public share variants of the three new RPCs are deferred but should be added in a follow-up so the share page can eventually grow similar visuals.

## Risks

- **Three new RPCs in one migration** — non-trivial SQL surface. Test locally with `supabase migration up` and seed data before pushing.
- **Page becomes long** — five sections is more vertical space than today. Mitigated by the chart card being a single chip-driven surface (rather than three stacked charts) and by the heatmap being compact at default 3M.
- **Range-chip persistence collision** — if AsyncStorage holds an unknown legacy value, hook must fall back to `3_months` rather than throw.
- **Cardio-only users** — Volume chip must hide reliably; chart placeholder copy must not assume strength training.
