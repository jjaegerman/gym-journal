import { XStack, YStack, Text, Card } from "tamagui";
import { FilteredExerciseStats } from "@/lib/hooks/useFilteredExerciseStats";

interface StatsSummaryProps {
  stats: FilteredExerciseStats;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <Card flex={1} p="$3" bg="$gray3" borderRadius="$4" bordered>
      <YStack gap="$1">
        <Text fontSize="$2" color="$gray11" fontWeight="500">
          {label}
        </Text>
        <XStack items="baseline" gap="$1">
          <Text fontSize="$6" fontWeight="700">
            {value}
          </Text>
          {unit && (
            <Text fontSize="$2" color="$gray11">
              {unit}
            </Text>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(1) + "M";
  }
  if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + "K";
  }
  return volume.toFixed(0);
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const hasStrengthData = stats.totalVolume > 0 || stats.maxWeight !== null;
  const hasCardioData = stats.totalDistance > 0;

  return (
    <YStack gap="$3">
      <XStack gap="$3">
        <MetricCard label="Workouts" value={stats.totalWorkouts} />
        <MetricCard label="Total Sets" value={stats.totalSets} />
      </XStack>

      {hasStrengthData && (
        <XStack gap="$3">
          <MetricCard
            label="Total Volume"
            value={formatVolume(stats.totalVolume)}
            unit="lbs"
          />
          {stats.maxWeight !== null && (
            <MetricCard
              label="Max Weight"
              value={stats.maxWeight}
              unit="lbs"
            />
          )}
          {stats.maxReps !== null && !stats.maxWeight && (
            <MetricCard label="Max Reps" value={stats.maxReps} />
          )}
        </XStack>
      )}

      {hasStrengthData && stats.maxReps !== null && stats.maxWeight !== null && (
        <XStack gap="$3">
          <MetricCard label="Max Reps" value={stats.maxReps} />
          <Card flex={1} p="$3" bg="transparent" />
        </XStack>
      )}

      {hasCardioData && (
        <XStack gap="$3">
          <MetricCard
            label="Total Distance"
            value={stats.totalDistance.toFixed(1)}
            unit="mi"
          />
          <Card flex={1} p="$3" bg="transparent" />
        </XStack>
      )}
    </YStack>
  );
}
