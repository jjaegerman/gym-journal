import { Trophy } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { PrCard } from "@/components/ui/PrCard";
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
};

function formatValue(pr: PrTimelineEntry): string {
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

function formatDelta(pr: PrTimelineEntry): string | undefined {
  if (pr.delta == null) return undefined;
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
  return undefined;
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
  return (
    <PrCard
      icon={<Trophy size={16} color="$color11" />}
      title={TYPE_LABEL[pr.pr_type] ?? 'PR'}
      subtitle={pr.display_name}
      primary={formatValue(pr)}
      delta={formatDelta(pr)}
      dateLabel={formatRelativeDate(pr.achieved_at)}
      flex={1}
      onPress={() => router.push(`/workout?workoutId=${pr.workout_id}` as any)}
    />
  );
}
