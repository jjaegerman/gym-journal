import { useMemo, useState } from "react";
import { YStack } from "tamagui";
import { BaseTrendChart, type TrendPoint } from "@/components/ui/charts/BaseTrendChart";
import { MetricChips, type MetricChipOption } from "@/components/ui/charts/MetricChips";
import type { WeeklyTrends } from "@/lib/api/supabase/profileTrends";

type Metric = "workouts" | "time" | "volume";

interface Props {
  trends: WeeklyTrends | null;
  loading: boolean;
}

const LABELS: Record<Metric, string> = {
  workouts: "Workouts",
  time: "Time",
  volume: "Volume",
};

function formatWeekRange(iso: string): string {
  const start = new Date(iso);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatWeekShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProfileTrendChart({ trends, loading }: Props) {
  const weeks = trends?.weeks ?? [];
  const weightUnit = trends?.weight_unit ?? 'lbs';

  const available: MetricChipOption<Metric>[] = useMemo(() => {
    const list: MetricChipOption<Metric>[] = [
      { id: "workouts", label: LABELS.workouts },
      { id: "time", label: LABELS.time },
    ];
    if (weeks.some((w) => w.total_volume > 0)) list.push({ id: "volume", label: LABELS.volume });
    return list;
  }, [weeks]);

  const [metric, setMetric] = useState<Metric>("workouts");
  const activeMetric = available.find((m) => m.id === metric) ? metric : available[0]?.id ?? "workouts";

  const series: TrendPoint[] = useMemo(
    () => weeks.map((w) => ({
      x: w.week_start,
      value:
        activeMetric === "workouts" ? w.workout_count :
        activeMetric === "time"     ? w.total_minutes :
                                       w.total_volume,
    })),
    [weeks, activeMetric]
  );

  const formatY = (raw: string): string => {
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

  const formatTooltipValue = (n: number): string => {
    if (activeMetric === "workouts") return n === 1 ? "1 workout" : `${n} workouts`;
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

  if (loading && weeks.length === 0) {
    return (
      <YStack height={220} bg="$color3" br="$4" />
    );
  }

  return (
    <YStack gap="$3">
      <MetricChips options={available} value={activeMetric} onChange={setMetric} />
      <BaseTrendChart
        series={series}
        formatY={formatY}
        formatTooltipValue={formatTooltipValue}
        formatTooltipDate={formatWeekRange}
        formatXLabel={formatWeekShort}
        integerYAxis={activeMetric === "workouts"}
        emptyMessage="No workouts in this range"
        insufficientMessage="Need 2+ weeks to chart trends"
      />
    </YStack>
  );
}
