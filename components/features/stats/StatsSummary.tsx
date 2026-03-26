import { XStack, YStack, Text, Card } from "tamagui";
import { FilteredExerciseStats } from "@/lib/hooks/useFilteredExerciseStats";
import { formatDurationSeconds, formatPace } from "@/lib/utils/formatters";

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
    <Card flex={1} flexBasis={0} p="$3" bg="$gray3" borderRadius="$4" bordered>
      <YStack gap="$1">
        <Text fontSize="$2" $gtXs={{ fontSize: "$4" }} color="$gray11" fontWeight="500">
          {label}
        </Text>
        <XStack items="baseline" gap="$1">
          <Text fontSize="$6" $gtXs={{ fontSize: "$8" }} fontWeight="700">
            {value}
          </Text>
          {unit && (
            <Text fontSize="$2" $gtXs={{ fontSize: "$4" }} color="$gray11">
              {unit}
            </Text>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

function Spacer() {
  return <Card flex={1} flexBasis={0} p="$3" bg="transparent" />;
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
  const hasWeightData = stats.maxWeight !== null || stats.totalVolume > 0;
  const hasRepData = stats.maxReps !== null;
  const hasDistanceData = stats.totalDistance > 0;
  const hasDurationData = stats.totalDurationSeconds > 0;
  const hasPaceData = stats.bestPace !== null;
  const hasResistanceData = stats.maxResistanceLevel !== null;
  const weightUnit = stats.weightUnit ?? 'lbs';
  const distanceUnit = stats.distanceUnit ?? 'miles';

  return (
    <YStack gap="$3" width="100%">
      {/* Always-shown row */}
      <XStack gap="$3">
        <MetricCard label="Workouts" value={stats.totalWorkouts} />
        <MetricCard label="Total Sets" value={stats.totalSets} />
      </XStack>

      {/* Strength: volume + max weight */}
      {hasWeightData && (
        <XStack gap="$3">
          <MetricCard
            label="Total Volume"
            value={formatVolume(stats.totalVolume)}
            unit={weightUnit}
          />
          {stats.maxWeight !== null ? (
            <MetricCard
              label="Max Weight"
              value={stats.maxWeight}
              unit={weightUnit}
            />
          ) : (
            <Spacer />
          )}
        </XStack>
      )}

      {/* Max Reps — shown whenever there are reps, regardless of weight data */}
      {hasRepData && (
        <XStack gap="$3">
          <MetricCard label="Max Reps" value={stats.maxReps!} />
          <Spacer />
        </XStack>
      )}

      {/* Distance + Duration row */}
      {(hasDistanceData || hasDurationData) && (
        <XStack gap="$3">
          {hasDistanceData ? (
            <MetricCard
              label="Total Distance"
              value={stats.totalDistance.toFixed(1)}
              unit={distanceUnit}
            />
          ) : (
            <MetricCard
              label="Total Duration"
              value={formatDurationSeconds(stats.totalDurationSeconds)}
            />
          )}
          {hasDistanceData && hasDurationData ? (
            <MetricCard
              label="Total Duration"
              value={formatDurationSeconds(stats.totalDurationSeconds)}
            />
          ) : hasDurationData && !hasDistanceData ? (
            <MetricCard
              label="Max Duration"
              value={formatDurationSeconds(stats.maxDurationSeconds!)}
            />
          ) : (
            <Spacer />
          )}
        </XStack>
      )}

      {/* Pace + Max Duration row (only when both distance and duration present) */}
      {hasDistanceData && hasDurationData && (
        <XStack gap="$3">
          {hasPaceData ? (
            <MetricCard
              label="Best Pace"
              value={formatPace(stats.bestPace!, distanceUnit)}
            />
          ) : (
            <Spacer />
          )}
          <MetricCard
            label="Max Duration"
            value={formatDurationSeconds(stats.maxDurationSeconds!)}
          />
        </XStack>
      )}

      {/* Resistance row */}
      {hasResistanceData && (
        <XStack gap="$3">
          <MetricCard
            label="Max Resistance Level"
            value={stats.maxResistanceLevel!}
          />
          <Spacer />
        </XStack>
      )}
    </YStack>
  );
}
