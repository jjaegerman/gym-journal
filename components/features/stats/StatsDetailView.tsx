import { YStack, Text, Separator } from "tamagui";
import { Dumbbell } from "@tamagui/lucide-icons";
import { FilteredExerciseStats } from "@/lib/hooks/useFilteredExerciseStats";
import { StatsSummary } from "./StatsSummary";
import { ProgressChart } from "./ProgressChart";
import { PersonalRecords } from "./PersonalRecords";
import { RecentSessions } from "./RecentSessions";

interface StatsDetailViewProps {
  stats: FilteredExerciseStats;
  onSessionPress: (workoutId: string) => void;
  onCategorySelect?: (category: string) => void;
  availableCategories?: string[];
}

export function StatsDetailView({
  stats,
  onSessionPress,
  onCategorySelect,
  availableCategories,
}: StatsDetailViewProps) {
  const hasData = stats.totalWorkouts > 0;
  const showEmptyPrompt = !hasData && stats.displayName === "No exercises";

  return (
    <YStack gap="$4">
      <YStack gap="$1">
        <Text fontSize="$7" fontWeight="700">
          {stats.displayName}
        </Text>
        {stats.matchedExercises > 1 && (
          <Text fontSize="$3" color="$gray11">
            Combined stats from {stats.matchedExercises} exercises
          </Text>
        )}
        {stats.firstLogged && stats.lastLogged && (
          <Text fontSize="$2" color="$gray10">
            {new Date(stats.firstLogged).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}{" "}
            –{" "}
            {new Date(stats.lastLogged).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </Text>
        )}
      </YStack>

      {hasData ? (
        <>
          <StatsSummary stats={stats} />

          {stats.progressData.length > 1 && (
            <>
              <Separator />
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600">
                  Progress
                </Text>
                <ProgressChart data={stats.progressData} />
              </YStack>
            </>
          )}

          {(stats.weightPr || stats.repsPr) && (
            <>
              <Separator />
              <PersonalRecords
                weightPr={stats.weightPr}
                repsPr={stats.repsPr}
                onPRPress={onSessionPress}
              />
            </>
          )}

          {stats.recentSessions.length > 0 && (
            <>
              <Separator />
              <RecentSessions
                sessions={stats.recentSessions}
                onSessionPress={onSessionPress}
              />
            </>
          )}
        </>
      ) : showEmptyPrompt ? (
        <YStack items="center" justify="center" py="$8" gap="$4">
          <Dumbbell size={48} color="$gray8" />
          <YStack items="center" gap="$2">
            <Text fontSize="$5" fontWeight="600" color="$gray11">
              No exercises found
            </Text>
            <Text fontSize="$3" color="$gray10" textAlign="center">
              Use the Category filter above to select an exercise
            </Text>
          </YStack>
        </YStack>
      ) : (
        <YStack items="center" justify="center" py="$8">
          <Text color="$gray11">No workout data found</Text>
        </YStack>
      )}
    </YStack>
  );
}
