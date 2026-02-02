import { SectionList, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Separator, YGroup, YStack, H4, H6 } from "tamagui";
import { Workout } from "@/types/exercise";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutEmptyState } from "./WorkoutEmptyState";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import {
  getMonthLabel,
  getWeekRange,
  getSpecialDayLabel,
  getWeekKey,
} from "@/lib/utils";

interface WeekGroup {
  weekKey: string;
  weekLabel: string;
  workouts: Workout[];
}

interface Section {
  title: string;
  monthKey: string;
  data: WeekGroup[];
}

interface WorkoutHistoryListProps {
  workouts: Workout[] | null;
  loading?: boolean;
  error?: Error | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Group workouts into sections by month with week subgroups
 * Special handling for Today/Yesterday as top-level sections
 */
function groupWorkoutsIntoSections(workouts: Workout[]): Section[] {
  const sections: Section[] = [];
  const monthMap = new Map<string, Map<string, WeekGroup>>();

  // Track special sections (Today, Yesterday)
  const specialSections = new Map<string, Section>();

  for (const workout of workouts) {
    const specialLabel = getSpecialDayLabel(workout.datetime);

    if (specialLabel) {
      // Handle Today/Yesterday as separate top-level sections
      if (!specialSections.has(specialLabel)) {
        specialSections.set(specialLabel, {
          title: specialLabel,
          monthKey: `special-${specialLabel}`,
          data: [{ weekKey: specialLabel, weekLabel: "", workouts: [] }],
        });
      }
      specialSections.get(specialLabel)!.data[0].workouts.push(workout);
    } else {
      // Group by month, then by week
      const monthLabel = getMonthLabel(workout.datetime);
      const monthKey = `${workout.datetime.getFullYear()}-${workout.datetime.getMonth()}`;
      const weekKey = getWeekKey(workout.datetime);
      const weekLabel = getWeekRange(workout.datetime);

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, new Map());
      }

      const weekMap = monthMap.get(monthKey)!;
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { weekKey, weekLabel, workouts: [] });
      }

      weekMap.get(weekKey)!.workouts.push(workout);
    }
  }

  // Add special sections first (Today, then Yesterday)
  if (specialSections.has("Today")) {
    sections.push(specialSections.get("Today")!);
  }
  if (specialSections.has("Yesterday")) {
    sections.push(specialSections.get("Yesterday")!);
  }

  // Convert month map to sections, sorted by date descending
  const sortedMonths = Array.from(monthMap.entries()).sort(
    ([keyA], [keyB]) => keyB.localeCompare(keyA)
  );

  for (const [monthKey, weekMap] of sortedMonths) {
    // Get month label from first workout in the month
    const firstWeek = weekMap.values().next().value as WeekGroup | undefined;
    if (!firstWeek) continue;
    const monthLabel = getMonthLabel(firstWeek.workouts[0].datetime);

    // Sort weeks within month descending
    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) =>
      b.weekKey.localeCompare(a.weekKey)
    );

    sections.push({
      title: monthLabel,
      monthKey,
      data: sortedWeeks,
    });
  }

  return sections;
}

/**
 * Workout History List Component
 * Displays a list of workouts grouped by month with sticky headers
 */
export function WorkoutHistoryList({
  workouts,
  loading = false,
  error,
  refreshing = false,
  onRefresh,
}: WorkoutHistoryListProps) {
  const handleWorkoutPress = (workoutId: string) => {
    router.push(`/workout?workoutId=${workoutId}`);
  };

  // Only show loading state if we don't have any data yet
  if (loading && !workouts) {
    return <LoadingState message="Loading workouts..." />;
  }

  if (error) {
    return (
      <ErrorState title="Error loading workouts" message={error.message} />
    );
  }

  if (!workouts || workouts.length === 0) {
    return <WorkoutEmptyState />;
  }

  const sections = groupWorkoutsIntoSections(workouts);

  return (
    <SectionList
      sections={sections}
      stickySectionHeadersEnabled={true}
      keyExtractor={(item) => item.weekKey}
      renderSectionHeader={({ section }) => (
        <H4
          bg="$background"
          py="$2"
          px="$3"
          fontWeight="700"
        >
          {section.title}
        </H4>
      )}
      renderItem={({ item: weekGroup, section }) => {
        // For special sections (Today/Yesterday), don't show week label
        const showWeekLabel =
          !section.monthKey.startsWith("special-") && weekGroup.weekLabel;

        return (
          <YStack pb="$3">
            {showWeekLabel && (
              <H6 px="$3" py="$1" opacity={0.6} fontWeight="500">
                {weekGroup.weekLabel}
              </H6>
            )}
            <YGroup
              bordered
              separator={<Separator />}
              rounded="$4"
              overflow="hidden"
            >
              {weekGroup.workouts.map((workout) => (
                <YGroup.Item key={workout.id}>
                  <WorkoutCard
                    workout={workout}
                    onPress={() => handleWorkoutPress(workout.id)}
                  />
                </YGroup.Item>
              ))}
            </YGroup>
          </YStack>
        );
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );
}
