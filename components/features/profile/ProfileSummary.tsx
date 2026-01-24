import {
  ScrollView,
  YStack,
  H3,
  XStack,
  Paragraph,
  Separator,
  Text,
} from "tamagui";
import { useProfileStats } from "@/lib/hooks";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { StatCard } from "./StatCard";
import { ExerciseStatsCard } from "./ExerciseStatsCard";
import { TrendIndicator } from "./TrendIndicator";
import {
  Activity,
  Clock,
  Flame,
  TrendingUp,
  Dumbbell,
  Timer,
} from "@tamagui/lucide-icons";
import { RefreshControl } from "react-native";
import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Profile Summary Screen
 * Displays user workout statistics and per-exercise breakdown
 * Refreshes data when tab comes into focus
 */
export function ProfileSummary() {
  const { stats, exerciseStats, loading, error, refetch } = useProfileStats();
  const [refreshing, setRefreshing] = useState(false);
  const isFirstFocus = useRef(true);

  // Refetch profile stats when this screen comes into focus (but skip the first mount)
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]) // Include refetch in deps
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading && !stats) {
    return <LoadingState message="Loading your stats..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error loading stats"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  if (!stats) {
    return <ErrorState title="No Data" message="No statistics available" />;
  }

  return (
    <ScrollView
      flex={1}
      bg="$background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <YStack p="$4" gap="$4" maxW={800} width="100%" self="center">
        {/* Section 1: All-Time */}
        <YStack gap="$3">
          <H3>All-Time</H3>
        </YStack>

        <XStack gap="$3" flexWrap="wrap">
          <StatCard
            title="Total Workouts"
            value={stats.total_workouts}
            icon={<Activity size={24} />}
          />
          <StatCard
            title="Total Hours"
            value={`${stats.total_hours}h`}
            icon={<Clock size={24} />}
          />
        </XStack>

        <XStack gap="$3" flexWrap="wrap">
          <StatCard
            title="Current Streak"
            value={`${stats.current_streak_days} days`}
            icon={<Flame size={24} />}
          />
          <StatCard
            title="Best Streak"
            value={`${stats.longest_streak_days} days`}
            icon={<TrendingUp size={24} />}
          />
        </XStack>

        <Separator my="$4" />

        {/* Section 2: Recent (Last 4 Weeks) */}
        <YStack gap="$3">
          <H3>Recent</H3>
          <Paragraph opacity={0.7} size="$2">
            Last 4 weeks vs previous 4 weeks
          </Paragraph>
        </YStack>

        <XStack gap="$3" flexWrap="wrap">
          <StatCard
            title="Workouts/Week"
            value={stats.recent_workouts_per_week}
            icon={<Activity size={20} />}
            trend={
              <TrendIndicator
                current={stats.recent_workouts_per_week}
                previous={stats.prev_workouts_per_week}
              />
            }
          />
          <StatCard
            title="Hours/Week"
            value={`${stats.recent_hours_per_week}h`}
            icon={<Clock size={20} />}
            trend={
              <TrendIndicator
                current={stats.recent_hours_per_week}
                previous={stats.prev_hours_per_week}
                format={(v) => `${v.toFixed(1)}h`}
              />
            }
          />
        </XStack>

        <XStack gap="$3" flexWrap="wrap">
          <StatCard
            title="Avg Duration"
            value={`${Math.round(stats.recent_avg_duration_minutes)} min`}
            icon={<Timer size={20} />}
            trend={
              <TrendIndicator
                current={stats.recent_avg_duration_minutes}
                previous={stats.prev_avg_duration_minutes}
                format={(v) => `${Math.round(v)} min`}
              />
            }
          />
          <StatCard
            title="Volume/Week"
            value={
              stats.recent_total_volume > 0
                ? `${(stats.recent_total_volume / 1000).toFixed(1)}k lbs`
                : stats.recent_total_distance > 0
                ? `${stats.recent_total_distance.toFixed(1)} mi`
                : "—"
            }
            icon={<Dumbbell size={20} />}
            trend={
              stats.recent_total_volume > 0 ? (
                <TrendIndicator
                  current={stats.recent_total_volume}
                  previous={stats.prev_total_volume}
                  format={(v) => `${(v / 1000).toFixed(1)}k lbs`}
                />
              ) : stats.recent_total_distance > 0 ? (
                <TrendIndicator
                  current={stats.recent_total_distance}
                  previous={stats.prev_total_distance}
                  format={(v) => `${v.toFixed(1)} mi`}
                />
              ) : null
            }
          />
        </XStack>

        <Separator my="$4" />

        {/* Section 3: Exercise Breakdown */}
        <YStack gap="$3">
          <H3>Exercise Stats</H3>
          <Paragraph opacity={0.7} size="$2">
            All-time totals and recent 4-week trends
          </Paragraph>
        </YStack>

        {exerciseStats.length > 0 ? (
          <YStack gap="$3">
            {exerciseStats.map((exercise) => (
              <ExerciseStatsCard
                key={`${exercise.category}-${JSON.stringify(
                  exercise.modifiers
                )}-${exercise.equipment}`}
                exercise={exercise}
              />
            ))}
          </YStack>
        ) : (
          <Paragraph opacity={0.5} text="center" py="$6">
            No exercise data available yet
          </Paragraph>
        )}
      </YStack>
    </ScrollView>
  );
}
