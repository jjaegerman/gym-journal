import { Card, H5, Paragraph, XStack, YStack, Separator } from "tamagui";
import type { ExerciseStats } from "@/lib/api/supabase/stats";
import { capitalizeEachWord } from "@/lib/utils/string";

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

  return (
    <Card elevate size="$4" bordered p="$4">
      <YStack gap="$3">
        <H5 fontWeight="bold">{capitalizeEachWord(exercise.exercise_name)}</H5>

        <XStack gap="$4" flexWrap="wrap">
          <YStack flex={1} minWidth={120}>
            <Paragraph size="$1" opacity={0.6}>
              Workouts
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {exercise.total_workouts}
            </Paragraph>
          </YStack>

          <YStack flex={1} minWidth={120}>
            <Paragraph size="$1" opacity={0.6}>
              Total Sets
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {exercise.total_sets}
            </Paragraph>
          </YStack>

          {exercise.max_weight && (
            <YStack flex={1} minWidth={120}>
              <Paragraph size="$1" opacity={0.6}>
                Max Weight
              </Paragraph>
              <Paragraph size="$5" fontWeight="600">
                {exercise.max_weight} lbs
              </Paragraph>
            </YStack>
          )}

          <YStack flex={1} minWidth={120}>
            <Paragraph size="$1" opacity={0.6}>
              Max Volume
            </Paragraph>
            <Paragraph size="$5" fontWeight="600">
              {Math.round(exercise.max_volume)}
            </Paragraph>
          </YStack>
        </XStack>

        <Separator />

        <XStack gap="$4" flexWrap="wrap">
          <YStack flex={1} minWidth={120}>
            <Paragraph size="$1" opacity={0.6}>
              Per Week
            </Paragraph>
            <Paragraph size="$3">
              {exercise.workouts_per_week.toFixed(1)}x
            </Paragraph>
          </YStack>

          <YStack flex={1} minWidth={120}>
            <Paragraph size="$1" opacity={0.6}>
              First Logged
            </Paragraph>
            <Paragraph size="$3">{formatDate(exercise.first_logged)}</Paragraph>
          </YStack>

          <YStack flex={1} minWidth={120}>
            <Paragraph size="$1" opacity={0.6}>
              Last Logged
            </Paragraph>
            <Paragraph size="$3">{formatDate(exercise.last_logged)}</Paragraph>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}
