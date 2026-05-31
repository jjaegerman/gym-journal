import { Activity, Dumbbell, Repeat, Route, Clock, Gauge, Timer, BarChart3 } from "@tamagui/lucide-icons";
import { StatGrid, type StatGridCell } from "@/components/ui/StatGrid";
import { FilteredExerciseStats } from "@/lib/hooks/useFilteredExerciseStats";
import { formatDurationSeconds, formatPace } from "@/lib/utils/formatters";

interface StatsSummaryProps {
  stats: FilteredExerciseStats;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return Math.round(volume / 1_000_000) + "M";
  if (volume >= 1_000) return Math.round(volume / 1_000) + "K";
  return Math.round(volume).toString();
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const weightUnit = stats.weightUnit ?? 'lbs';
  const distanceUnit = stats.distanceUnit ?? 'miles';

  const hasWeight     = stats.maxWeight !== null || stats.totalVolume > 0;
  const hasReps       = stats.maxReps !== null;
  const hasDistance   = stats.totalDistance > 0;
  const hasDuration   = stats.totalDurationSeconds > 0;
  const hasPace       = stats.bestPace !== null;
  const hasMaxDur     = stats.maxDurationSeconds !== null;
  const hasResistance = stats.maxResistanceLevel !== null;

  const cells: StatGridCell[] = [
    {
      icon: <Activity size={18} color="$color10" />,
      label: "Workouts",
      value: stats.totalWorkouts,
    },
  ];

  if (hasWeight) {
    cells.push({
      icon: <BarChart3 size={18} color="$color10" />,
      label: "Total volume",
      value: formatVolume(stats.totalVolume),
      unit: weightUnit,
    });
  }
  if (stats.maxWeight !== null) {
    cells.push({
      icon: <Dumbbell size={18} color="$color10" />,
      label: "Max weight",
      value: Math.round(stats.maxWeight),
      unit: weightUnit,
    });
  }
  if (hasReps) {
    cells.push({
      icon: <Repeat size={18} color="$color10" />,
      label: "Max reps",
      value: stats.maxReps!,
    });
  }
  if (hasDistance) {
    cells.push({
      icon: <Route size={18} color="$color10" />,
      label: "Total distance",
      value: stats.totalDistance.toFixed(1),
      unit: distanceUnit,
    });
  }
  if (hasDuration) {
    cells.push({
      icon: <Clock size={18} color="$color10" />,
      label: "Total duration",
      value: formatDurationSeconds(stats.totalDurationSeconds),
    });
  }
  if (hasPace) {
    cells.push({
      icon: <Gauge size={18} color="$color10" />,
      label: "Best pace",
      value: formatPace(stats.bestPace!, distanceUnit),
    });
  }
  if (hasMaxDur && !hasDistance) {
    // Max duration is only interesting on its own for cardio-without-distance
    // (plank, etc.). When distance exists, total duration + best pace tell the
    // same story more usefully.
    cells.push({
      icon: <Timer size={18} color="$color10" />,
      label: "Max duration",
      value: formatDurationSeconds(stats.maxDurationSeconds!),
    });
  }
  if (hasResistance) {
    cells.push({
      icon: <Gauge size={18} color="$color10" />,
      label: "Max resistance",
      value: stats.maxResistanceLevel!,
    });
  }

  return <StatGrid cells={cells} />;
}
