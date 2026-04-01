import { SectionList, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Separator, YGroup, YStack, H4, H6, Spinner } from "tamagui";
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

function ContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <YStack width="90%" $sm={{ width: "75%" }} $md={{ width: "65%" }} mx="auto">
      {children}
    </YStack>
  );
}

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
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  sortAscending?: boolean;
}

/**
 * Group workouts into sections by month with week subgroups
 * Special handling for Today/Yesterday as top-level sections (always at top for desc, bottom for asc)
 */
function groupWorkoutsIntoSections(workouts: Workout[], sortAscending: boolean): Section[] {
  const sections: Section[] = [];
  const monthMap = new Map<string, Map<string, WeekGroup>>();
  const specialSections = new Map<string, Section>();

  for (const workout of workouts) {
    const specialLabel = getSpecialDayLabel(workout.datetime);

    if (specialLabel) {
      if (!specialSections.has(specialLabel)) {
        specialSections.set(specialLabel, {
          title: specialLabel,
          monthKey: `special-${specialLabel}`,
          data: [{ weekKey: specialLabel, weekLabel: "", workouts: [] }],
        });
      }
      specialSections.get(specialLabel)!.data[0].workouts.push(workout);
    } else {
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

  const sortedMonths = Array.from(monthMap.entries()).sort(([keyA], [keyB]) =>
    sortAscending ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  );

  const monthSections: Section[] = sortedMonths.map(([monthKey, weekMap]) => {
    const firstWeek = weekMap.values().next().value as WeekGroup | undefined;
    if (!firstWeek) return null!;
    const monthLabel = getMonthLabel(firstWeek.workouts[0].datetime);

    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) =>
      sortAscending ? a.weekKey.localeCompare(b.weekKey) : b.weekKey.localeCompare(a.weekKey)
    );

    return { title: monthLabel, monthKey, data: sortedWeeks };
  }).filter(Boolean);

  const todaySection = specialSections.get("Today");
  const yesterdaySection = specialSections.get("Yesterday");

  if (sortAscending) {
    sections.push(...monthSections);
    if (yesterdaySection) sections.push(yesterdaySection);
    if (todaySection) sections.push(todaySection);
  } else {
    if (todaySection) sections.push(todaySection);
    if (yesterdaySection) sections.push(yesterdaySection);
    sections.push(...monthSections);
  }

  return sections;
}

/**
 * Workout History List Component
 * Displays a list of workouts grouped by month with sticky headers.
 * Supports infinite scroll downward: load more on scroll-to-bottom.
 */
export function WorkoutHistoryList({
  workouts,
  loading = false,
  error,
  refreshing = false,
  onRefresh,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  sortAscending = false,
}: WorkoutHistoryListProps) {
  const handleWorkoutPress = (workoutId: string) => {
    router.push(`/workout?workoutId=${workoutId}`);
  };

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

  const sections = groupWorkoutsIntoSections(workouts, sortAscending);

  return (
    <SectionList
      sections={sections}
      stickySectionHeadersEnabled={true}
      keyExtractor={(item) => item.weekKey}
      renderSectionHeader={({ section }) => (
        <YStack bg="$background">
          <ContentWrapper>
            <H4 py="$2" px="$3" fontWeight="700" $sm={{ fontSize: "$9" }}>
              {section.title}
            </H4>
          </ContentWrapper>
        </YStack>
      )}
      renderItem={({ item: weekGroup, section }) => {
        const showWeekLabel =
          !section.monthKey.startsWith("special-") && weekGroup.weekLabel;

        return (
          <ContentWrapper>
            <YStack pb="$3">
              {showWeekLabel && (
                <H6 px="$3" py="$1" opacity={0.6} fontWeight="500" $sm={{ fontSize: "$6" }}>
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
          </ContentWrapper>
        );
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore && hasMore ? (
          <YStack py="$4" items="center">
            <Spinner size="small" />
          </YStack>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );
}
