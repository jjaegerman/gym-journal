import { Card, H5, Paragraph, XStack, YStack, Separator } from "tamagui";
import type { ExerciseStats } from "@/lib/api/supabase/stats";
import { capitalizeEachWord, formatExerciseGrouping } from "@/lib/utils";
import { TrendIndicator } from "./TrendIndicator";

interface ExerciseStatsCardProps {
  exercise: ExerciseStats;
}

/**
 * Card component for displaying per-exercise statistics
 */
export function ExerciseStatsCard({ exercise }: ExerciseStatsCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format exercise title using grouping: {modifiers} {category} ({equipment})
  const exerciseTitle = capitalizeEachWord(
    formatExerciseGrouping({
      modifiers: exercise.modifiers,
      equipment: exercise.equipment,
      exercise_kind: exercise.exercise_kind,
    })
  );

  const isStrength = exercise.alltime_max_weight !== null;
  const isCardio = exercise.alltime_max_distance !== null;
  const isOther = !isStrength && !isCardio;

  return (
    <Card elevate size="$4" bordered p="$4">
      <YStack gap="$3">
        <H5 fontWeight="bold">{exerciseTitle}</H5>

        {/* Row 1: Total Workouts | Workouts/Week */}
        <XStack gap="$4" flexWrap="wrap">
          <YStack flex={1} minW={150}>
            <Paragraph size="$1" opacity={0.6}>
              Total Workouts
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {exercise.total_workouts}
            </Paragraph>
          </YStack>

          <YStack flex={1} minW={150}>
            <Paragraph size="$1" opacity={0.6}>
              Workouts/Week
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {exercise.recent_workouts_per_week.toFixed(1)}
            </Paragraph>
            <TrendIndicator
              current={exercise.recent_workouts_per_week}
              previous={exercise.prev_workouts_per_week}
            />
          </YStack>
        </XStack>

        {/* Row 2: Total Volume/Distance | Recent Volume/Distance per Week */}
        {(isStrength || isCardio) && (
        <XStack gap="$4" flexWrap="wrap">
          <YStack flex={1} minW={150}>
            <Paragraph size="$1" opacity={0.6}>
              {isStrength ? "Total Volume" : "Total Distance"}
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {isStrength
                ? `${(exercise.total_volume / 1000).toFixed(1)}k lbs`
                : isCardio
                ? `${exercise.total_distance.toFixed(1)} mi`
                : "—"}
            </Paragraph>
          </YStack>

          <YStack flex={1} minW={150}>
            <Paragraph size="$1" opacity={0.6}>
              {isStrength ? "Volume/Week" : "Distance/Week"}
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {isStrength
                ? `${(exercise.recent_volume_per_week / 1000).toFixed(1)}k lbs`
                : isCardio
                ? `${exercise.recent_distance_per_week.toFixed(1)} mi`
                : "—"}
            </Paragraph>
            {isStrength && exercise.recent_volume_per_week > 0 && (
              <TrendIndicator
                current={exercise.recent_volume_per_week}
                previous={exercise.prev_volume_per_week}
                format={(v) => `${(v / 1000).toFixed(1)}k lbs`}
              />
            )}
            {isCardio && exercise.recent_distance_per_week > 0 && (
              <TrendIndicator
                current={exercise.recent_distance_per_week}
                previous={exercise.prev_distance_per_week}
                format={(v) => `${v.toFixed(1)} mi`}
              />
            )}
          </YStack>
        </XStack>
        )}

        {/* Row 3: All-time Max | Recent Max */}
        <XStack gap="$4" flexWrap="wrap">
          <YStack flex={1} minW={150}>
            <Paragraph size="$1" opacity={0.6}>
              {isStrength
                ? "Max Weight"
                : isCardio
                ? "Avg Pace"
                : "Max Reps"}
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {isStrength && exercise.alltime_max_weight
                ? `${exercise.alltime_max_weight} lbs`
                : isCardio && exercise.alltime_avg_pace
                ? `${Math.floor(exercise.alltime_avg_pace)}:${String(
                    Math.round((exercise.alltime_avg_pace % 1) * 60)
                  ).padStart(2, "0")}/mi`
                : isOther && exercise.alltime_max_reps
                ? exercise.alltime_max_reps
                : "—"}
            </Paragraph>
          </YStack>

          <YStack flex={1} minW={150}>
            <Paragraph size="$1" opacity={0.6}>
              {isStrength
                ? "Recent Max"
                : isCardio
                ? "Recent Pace"
                : "Recent Max"}
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {isStrength && exercise.recent_max_weight
                ? `${exercise.recent_max_weight} lbs`
                : isCardio && exercise.recent_avg_pace
                ? `${Math.floor(exercise.recent_avg_pace)}:${String(
                    Math.round((exercise.recent_avg_pace % 1) * 60)
                  ).padStart(2, "0")}/mi`
                : isOther && exercise.recent_max_reps
                ? exercise.recent_max_reps
                : "—"}
            </Paragraph>
            {isStrength && exercise.recent_max_weight && exercise.prev_max_weight && (
              <TrendIndicator
                current={exercise.recent_max_weight}
                previous={exercise.prev_max_weight}
                format={(v) => `${v} lbs`}
              />
            )}
            {isCardio && exercise.recent_avg_pace && exercise.prev_avg_pace && (
              <TrendIndicator
                current={exercise.recent_avg_pace}
                previous={exercise.prev_avg_pace}
                format={(v) =>
                  `${Math.floor(v)}:${String(
                    Math.round((v % 1) * 60)
                  ).padStart(2, "0")}/mi`
                }
                invert={true}
              />
            )}
            {isOther && exercise.recent_max_reps && exercise.prev_max_reps && (
              <TrendIndicator
                current={exercise.recent_max_reps}
                previous={exercise.prev_max_reps}
              />
            )}
          </YStack>
        </XStack>

        <Separator />

        <Paragraph size="$2" opacity={0.5}>
          Last: {formatDate(exercise.last_logged)}
        </Paragraph>
      </YStack>
    </Card>
  );
}
