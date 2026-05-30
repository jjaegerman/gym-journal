import { useState, useMemo, useEffect } from "react";
import { YStack } from "tamagui";
import { BaseTrendChart, type TrendPoint } from "@/components/ui/charts/BaseTrendChart";
import { MetricChips, type MetricChipOption } from "@/components/ui/charts/MetricChips";
import { formatPace } from "@/lib/utils/formatters";

interface ProgressDataPoint {
  week: string;
  volume: number;
  maxWeight: number;
  maxReps: number | null;
  distance: number | null;
  avgPace: number | null;
  maxDuration: number | null;
  maxResistance: number | null;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  weightUnit?: string | null;
  distanceUnit?: string | null;
}

type MetricType =
  | "volume"
  | "maxWeight"
  | "maxReps"
  | "distance"
  | "avgPace"
  | "maxDuration"
  | "maxResistance";

const METRIC_LABELS: Record<MetricType, string> = {
  volume: "Volume",
  maxWeight: "Max Weight",
  maxReps: "Max Reps",
  distance: "Distance",
  avgPace: "Avg Pace",
  maxDuration: "Max Duration",
  maxResistance: "Max Resistance",
};

function getValue(d: ProgressDataPoint, metric: MetricType): number {
  switch (metric) {
    case "volume":        return d.volume;
    case "maxWeight":     return d.maxWeight;
    case "maxReps":       return d.maxReps ?? 0;
    case "distance":      return d.distance ?? 0;
    case "avgPace":       return d.avgPace ?? 0;
    case "maxDuration":   return d.maxDuration ?? 0;
    case "maxResistance": return d.maxResistance ?? 0;
  }
}

function hasValue(d: ProgressDataPoint, metric: MetricType): boolean {
  switch (metric) {
    case "volume":        return d.volume > 0;
    case "maxWeight":     return d.maxWeight > 0;
    case "maxReps":       return d.maxReps != null && d.maxReps > 0;
    case "distance":      return d.distance != null && d.distance > 0;
    case "avgPace":       return d.avgPace != null && d.avgPace > 0;
    case "maxDuration":   return d.maxDuration != null && d.maxDuration > 0;
    case "maxResistance": return d.maxResistance != null && d.maxResistance > 0;
  }
}

export function ProgressChart({ data, weightUnit, distanceUnit }: ProgressChartProps) {
  const wUnit = weightUnit ?? 'lbs';
  const dUnit = distanceUnit ?? 'miles';

  const availableMetrics = useMemo<MetricType[]>(() => {
    const metrics: MetricType[] = [];
    if (data.some((d) => d.maxWeight > 0)) metrics.push("maxWeight");
    if (data.some((d) => d.volume > 0)) metrics.push("volume");
    if (data.some((d) => (d.maxReps ?? 0) > 0)) metrics.push("maxReps");
    if (data.some((d) => (d.distance ?? 0) > 0)) metrics.push("distance");
    if (data.some((d) => (d.avgPace ?? 0) > 0)) metrics.push("avgPace");
    if (data.some((d) => (d.maxDuration ?? 0) > 0)) metrics.push("maxDuration");
    if (data.some((d) => (d.maxResistance ?? 0) > 0)) metrics.push("maxResistance");
    return metrics;
  }, [data]);

  const [metric, setMetric] = useState<MetricType>(() => availableMetrics[0] ?? "maxWeight");

  useEffect(() => {
    if (!availableMetrics.includes(metric)) {
      setMetric(availableMetrics[0] ?? "maxWeight");
    }
  }, [availableMetrics, metric]);

  // Interpolate gaps between sparse data points so the line is continuous.
  // Interpolated points are marked empty so the chart hides their dots/tooltips.
  const series: TrendPoint[] = useMemo(() => {
    const real = data
      .filter((d) => hasValue(d, metric))
      .map((d) => ({ x: d.week, value: getValue(d, metric), empty: false }));
    if (real.length < 2) return real;

    const WEEK_MS = 7 * 24 * 3600 * 1000;
    const points: TrendPoint[] = [];
    for (let i = 0; i < real.length; i++) {
      points.push(real[i]);
      if (i < real.length - 1) {
        const cur = new Date(real[i].x).getTime();
        const next = new Date(real[i + 1].x).getTime();
        const gapWeeks = Math.max(0, Math.round((next - cur) / WEEK_MS) - 1);
        for (let g = 1; g <= gapWeeks; g++) {
          const t = g / (gapWeeks + 1);
          points.push({
            x: new Date(cur + g * WEEK_MS).toISOString(),
            value: real[i].value + (real[i + 1].value - real[i].value) * t,
            empty: true,
          });
        }
      }
    }
    return points;
  }, [data, metric]);

  const formatValue = (value: number): string => {
    switch (metric) {
      case "volume":
        if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, "") + `K ${wUnit}`;
        return value.toFixed(0) + ` ${wUnit}`;
      case "maxWeight":
        return value.toFixed(0) + ` ${wUnit}`;
      case "maxReps":
        return value.toFixed(0) + " reps";
      case "distance":
        return value.toFixed(1) + ` ${dUnit}`;
      case "avgPace":
        return formatPace(value, distanceUnit ?? null);
      case "maxDuration": {
        const totalSecs = Math.round(value);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
      }
      case "maxResistance":
        return "Level " + value.toFixed(0);
    }
  };

  const formatY = (raw: string): string => {
    const num = parseFloat(raw);
    if (metric === "avgPace") {
      const mins = Math.floor(num);
      const secs = Math.round((num - mins) * 60);
      return `${mins}:${String(secs).padStart(2, "0")}`;
    }
    if (metric === "maxDuration") {
      const totalSecs = Math.round(num);
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}m`;
    }
    if (metric === "maxResistance") return String(Math.round(num));
    if (num === 0) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(num));
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (data.length === 0 || availableMetrics.length === 0 || series.length < 2) {
    return (
      <YStack p="$4" items="center" justify="center" height={200}>
        <BaseTrendChart
          series={[]}
          formatY={formatY}
          formatTooltipValue={formatValue}
          formatTooltipDate={formatDate}
          formatXLabel={formatDate}
          emptyMessage="No progress data available"
        />
      </YStack>
    );
  }

  const chipOptions: MetricChipOption<MetricType>[] = availableMetrics.map((m) => ({
    id: m,
    label: METRIC_LABELS[m],
  }));

  return (
    <YStack gap="$3">
      <MetricChips options={chipOptions} value={metric} onChange={setMetric} />
      <BaseTrendChart
        series={series}
        formatY={formatY}
        formatTooltipValue={formatValue}
        formatTooltipDate={formatDate}
        formatXLabel={formatDate}
      />
    </YStack>
  );
}
