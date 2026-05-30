import { useMemo, useState } from "react";
import { Platform, ScrollView, Pressable } from "react-native";
import { YStack, XStack, View, Text, Popover, Paragraph, Theme, useTheme } from "tamagui";
import type { DailySummaryPoint, ProfileRange } from "@/lib/api/supabase/profileTrends";

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

// Fraction along the grey→accent line for each filled bucket. Linear
// from 0.25 to 1.0 — the brightest bucket hits the full accent color
// (matching chart lines etc.), with three evenly darker steps below it.
const BUCKET_T = [0.25, 0.5, 0.75, 1.0];

function parseColor(s: string): [number, number, number] {
  const hsl = s.match(/hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/);
  if (hsl) {
    return hslToRgb(parseFloat(hsl[1]) / 360, parseFloat(hsl[2]) / 100, parseFloat(hsl[3]) / 100);
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
  const hex6 = s.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }
  const hex3 = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (hex3) {
    return [parseInt(hex3[1] + hex3[1], 16), parseInt(hex3[2] + hex3[2], 16), parseInt(hex3[3] + hex3[3], 16)];
  }
  return [128, 128, 128];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const ch = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

const MONTH_LABEL_HEIGHT = 14;
const DAY_LABEL_WIDTH = 28;

export function CalendarHeatmap(props: Props) {
  const baseTheme = useTheme();
  const emptyBg = baseTheme.color3.val;
  const labelColor = baseTheme.color10.val;
  const futureBorder = baseTheme.color5.val;
  return (
    <Theme name="accent">
      <CalendarHeatmapInner
        {...props}
        emptyBg={emptyBg}
        labelColor={labelColor}
        futureBorder={futureBorder}
      />
    </Theme>
  );
}

interface Bucketing {
  emptyBg: string;
  labelColor: string;
  futureBorder: string;
  /** rgb() strings, one per filled bucket (1..4). */
  filled: string[];
}

function CalendarHeatmapInner({
  emptyBg,
  labelColor,
  futureBorder,
  ...rest
}: Props & { emptyBg: string; labelColor: string; futureBorder: string }) {
  const accentTheme = useTheme();
  // Lerp from the neutral empty colour to the accent in RGB space.
  // BUCKET_T sets how far each filled bucket sits along that line.
  const greyRgb = parseColor(emptyBg);
  const accentRgb = parseColor(accentTheme.color10.val);
  const bucketing: Bucketing = {
    emptyBg,
    labelColor,
    futureBorder,
    filled: BUCKET_T.map((t) => mix(greyRgb, accentRgb, t)),
  };
  return <HeatmapBody {...rest} bucketing={bucketing} />;
}

function HeatmapBody({ days, range, loading, bucketing }: Props & { bucketing: Bucketing }) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const cellSize = 16;
  const cellGap = 3;
  const colWidth = cellSize + cellGap;

  const byDay = useMemo(() => {
    const map = new Map<string, DailySummaryPoint>();
    for (const d of days) map.set(d.day, d);
    return map;
  }, [days]);

  const columns = useMemo(() => {
    if (days.length === 0) return [];
    // GitHub-style window: 12 full months ending at the current month.
    // Start = the Sunday on or before the 1st of (current month − 11).
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const startOfFirstWeek = new Date(monthStart);
    startOfFirstWeek.setDate(monthStart.getDate() - monthStart.getDay());
    const cols: { weekStart: Date; cells: { date: Date; key: string }[] }[] = [];
    const cursor = new Date(startOfFirstWeek);
    while (cursor <= today) {
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
    return <View style={{ height: 140, backgroundColor: bucketing.emptyBg, borderRadius: 8 }} />;
  }
  if (days.length === 0) return null;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const gridWidth = columns.length * colWidth - cellGap;

  // Month labels positioned absolutely so they can overflow past a single
  // column's width. A label appears at the first week of a new month, but
  // only if that month spans at least 2 weeks in the calendar — otherwise
  // a 1-week trailing partial month (or first-week sliver) creates a
  // cramped duplicate label at the edge.
  const monthLabels = (
    <View style={{ height: MONTH_LABEL_HEIGHT, width: gridWidth, position: 'relative' }}>
      {columns.map((col, ci) => {
        const prev = ci > 0 ? columns[ci - 1].weekStart : null;
        const isTransition = !prev || prev.getMonth() !== col.weekStart.getMonth();
        if (!isTransition) return null;
        // Count consecutive weeks belonging to this month.
        let runLength = 1;
        for (let j = ci + 1; j < columns.length; j++) {
          if (columns[j].weekStart.getMonth() === col.weekStart.getMonth()) runLength++;
          else break;
        }
        if (runLength < 2) return null;
        return (
          <Text
            key={ci}
            style={{
              position: 'absolute',
              left: ci * colWidth,
              fontSize: 9,
              color: bucketing.labelColor,
            }}
          >
            {col.weekStart.toLocaleString("en-US", { month: "short" })}
          </Text>
        );
      })}
    </View>
  );

  const dayLabels = (
    <YStack gap="$1" style={{ width: DAY_LABEL_WIDTH }}>
      <View style={{ height: MONTH_LABEL_HEIGHT }} />
      <YStack gap={cellGap}>
        {[0, 1, 2, 3, 4, 5, 6].map((di) => {
          const labels = ["", "Mon", "", "Wed", "", "Fri", ""];
          return (
            <View key={di} style={{ height: cellSize, justifyContent: "center" }}>
              {labels[di] && (
                <Text style={{ fontSize: 9, color: bucketing.labelColor }}>
                  {labels[di]}
                </Text>
              )}
            </View>
          );
        })}
      </YStack>
    </YStack>
  );

  const cellsGrid = (
    <CellsGrid
      columns={columns}
      byDay={byDay}
      todayKey={todayKey}
      cellSize={cellSize}
      cellGap={cellGap}
      bucketing={bucketing}
      openDay={openDay}
      setOpenDay={setOpenDay}
    />
  );

  const innerBody = (
    <YStack gap="$1">
      {monthLabels}
      {cellsGrid}
    </YStack>
  );

  const scrollContainer = Platform.OS === 'web' ? (
    <View
      flex={1}
      style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8 } as any}
    >
      {innerBody}
    </View>
  ) : (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      persistentScrollbar
      contentContainerStyle={{ paddingBottom: 8 }}
    >
      {innerBody}
    </ScrollView>
  );

  return (
    <YStack gap="$2">
      <Text fontSize="$2" style={{ color: bucketing.labelColor }}>
        Each cell is a day. Color = total workout duration.
      </Text>
      <XStack gap="$1">
        {dayLabels}
        {scrollContainer}
      </XStack>
      <XStack justify="flex-end">
        <Legend bucketing={bucketing} />
      </XStack>
    </YStack>
  );
}

function Legend({ bucketing }: { bucketing: Bucketing }) {
  return (
    <XStack gap="$1.5" items="center">
      <Text style={{ fontSize: 10, color: bucketing.labelColor }}>less</Text>
      <View style={{ width: 10, height: 10, backgroundColor: bucketing.emptyBg, borderRadius: 2 }} />
      {bucketing.filled.map((bg, i) => (
        <View key={i} style={{ width: 10, height: 10, backgroundColor: bg, borderRadius: 2 }} />
      ))}
      <Text style={{ fontSize: 10, color: bucketing.labelColor }}>more</Text>
    </XStack>
  );
}

interface CellsGridProps {
  columns: { weekStart: Date; cells: { date: Date; key: string }[] }[];
  byDay: Map<string, DailySummaryPoint>;
  todayKey: string;
  cellSize: number;
  cellGap: number;
  bucketing: Bucketing;
  openDay: string | null;
  setOpenDay: (k: string | null) => void;
}

// Translucent dark overlay used by both the web Tooltip and native Popover.
// `pointerEvents: 'none'` makes the overlay visible but transparent to
// touches — tapping a cell behind the overlay opens its popover instead of
// needing to first dismiss the current one.
const overlayBg = 'rgba(20, 20, 22, 0.92)';

function CellOverlayContent({
  date,
  workoutCount,
  minutes,
}: {
  date: Date;
  workoutCount: number;
  minutes: number;
}) {
  return (
    <YStack gap="$1" pointerEvents="none">
      <Paragraph size="$3" color="$color12" fontWeight="600">
        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </Paragraph>
      <Paragraph size="$2" color="$color11">
        {workoutCount === 1 ? '1 workout' : `${workoutCount} workouts`}
        {minutes > 0 && ` · ${minutes} min`}
      </Paragraph>
    </YStack>
  );
}

function CellsGrid({
  columns,
  byDay,
  todayKey,
  cellSize,
  cellGap,
  bucketing,
  openDay,
  setOpenDay,
}: CellsGridProps) {
  return (
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
                  style={{ width: cellSize, height: cellSize }}
                />
              );
            }

            const bg = bucket === 0 ? bucketing.emptyBg : bucketing.filled[bucket - 1];
            const isInteractive = (summary?.workout_count ?? 0) > 0;

            const cellView = (
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: bg,
                  borderRadius: 2,
                }}
              />
            );

            if (!isInteractive) {
              return <View key={cell.key}>{cellView}</View>;
            }

            const content = (
              <CellOverlayContent
                date={cell.date}
                workoutCount={summary!.workout_count}
                minutes={minutes}
              />
            );

            const sharedOverlayProps = {
              theme: 'dark' as const,
              themeInverse: false,
              unstyled: true,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              backgroundColor: overlayBg,
              padding: 12,
              borderRadius: 8,
              pointerEvents: 'none' as const,
              enterStyle: { y: -4, opacity: 0 },
              exitStyle: { y: -4, opacity: 0 },
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
            };

            return (
              <Popover
                key={cell.key}
                placement="top"
                modal={false}
                open={openDay === cell.key}
                onOpenChange={(o) => {
                  // Only honor "close" events from the popover itself —
                  // the trigger pressable below handles opening, so
                  // ignoring `open=true` here avoids the
                  // outside-press-then-reopen race on native.
                  if (!o) setOpenDay(null);
                }}
              >
                <Popover.Trigger asChild>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setOpenDay(cell.key);
                    }}
                  >
                    {cellView}
                  </Pressable>
                </Popover.Trigger>
                <Popover.Content {...sharedOverlayProps}>{content}</Popover.Content>
              </Popover>
            );
          })}
        </YStack>
      ))}
    </XStack>
  );
}
