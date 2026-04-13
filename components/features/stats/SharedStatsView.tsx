import { useEffect, useState } from "react";
import { ScrollView, View, YStack } from "tamagui";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { StatsDetailView } from "./StatsDetailView";
import type { ExerciseFilters } from "@/lib/api/supabase/stats";
import type { FilteredExerciseStats } from "@/lib/hooks/useFilteredExerciseStats";
import { getPublicFilteredExerciseStats } from "@/lib/api/supabase/public";

interface SharedStatsViewProps {
  userId: string;
  filters: ExerciseFilters;
}

/**
 * Read-only stats view used by /share/stats.
 *
 * Skips the `useFilteredExerciseStats` hook entirely (that hook depends on
 * `useSession` / `useUnitPreferences`, neither of which are available on the
 * unauthenticated share route). Fetches via the public RPC and renders the
 * same `<StatsDetailView/>` as the authenticated page, without filter UI or
 * session-press navigation.
 */
export function SharedStatsView({ userId, filters }: SharedStatsViewProps) {
  const [stats, setStats] = useState<FilteredExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicFilteredExerciseStats(userId, filters)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    filters.exercise_kinds?.join(","),
    filters.modifiers?.join(","),
    filters.equipment?.join(","),
    filters.timeRange,
    filters.preferredWeightUnit,
    filters.preferredDistanceUnit,
  ]);

  if (loading && !stats) {
    return <LoadingState message="Loading shared stats..." />;
  }

  if (error) {
    return (
      <ErrorState title="Error loading stats" message={error.message} />
    );
  }

  if (!stats) {
    return <LoadingState message="Loading shared stats..." />;
  }

  return (
    <View flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$1"
          pb="$4"
          pt="$4"
          width="90%"
          $sm={{ width: "75%" }}
          $md={{ width: "65%" }}
          mx="auto"
        >
          <StatsDetailView stats={stats} />
        </YStack>
      </ScrollView>
    </View>
  );
}
