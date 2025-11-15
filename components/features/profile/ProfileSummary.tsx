import { ScrollView, YStack, H3, XStack, Paragraph, Separator } from "tamagui";
import { useProfileStats } from "@/lib/hooks";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { StatCard } from "./StatCard";
import { ExerciseStatsCard } from "./ExerciseStatsCard";
import {
  Activity,
  Calendar,
  Clock,
  Flame,
  TrendingUp,
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
  const { stats, exerciseStats, loading, error, refetch } = useProfileStats(90);
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
    }, []) // Empty deps - refetch is now stable
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
        {/* Overview Section */}
        <YStack gap="$3">
          <H3>Your Progress</H3>
          <Paragraph opacity={0.7}>Last 90 days</Paragraph>
        </YStack>

        {/* Core Stats Grid */}
        <XStack gap="$3" flexWrap="wrap">
          <StatCard
            title="Total Workouts"
            value={stats.total_workouts}
            icon={<Activity size={24} />}
          />
          <StatCard
            title="Training Hours"
            value={stats.total_hours}
            icon={<Clock size={24} />}
          />
        </XStack>

        <XStack gap="$3" flexWrap="wrap">
          <StatCard
            title="Current Streak"
            value={`${stats.current_streak_days} days`}
            icon={<Flame size={24} color="$orange10" />}
          />
          <StatCard
            title="Best Streak"
            value={`${stats.longest_streak_days} days`}
            icon={<TrendingUp size={24} />}
          />
        </XStack>

        {/* Recent Activity */}
        <YStack gap="$3" mt="$2">
          <H3 size="$6">Recent Activity</H3>
          <XStack gap="$3" flexWrap="wrap">
            <StatCard
              title="Last 7 Days"
              value={stats.workouts_last_7_days}
              subtitle="workouts"
            />
            <StatCard
              title="Last 30 Days"
              value={stats.workouts_last_30_days}
              subtitle="workouts"
            />
            <StatCard
              title="Weekly Average"
              value={stats.avg_workouts_per_week}
              subtitle="last 12 weeks"
            />
          </XStack>
        </YStack>

        {/* Consistency */}
        {stats.most_common_day && (
          <YStack gap="$3" mt="$2">
            <XStack items="center" gap="$2">
              <Calendar size={20} />
              <Paragraph>
                You most often train on{" "}
                <Paragraph fontWeight="bold">{stats.most_common_day}</Paragraph>
              </Paragraph>
            </XStack>
          </YStack>
        )}

        <Separator my="$4" />

        {/* Exercise Breakdown */}
        <YStack gap="$3">
          <H3>Exercise Breakdown</H3>
          <Paragraph opacity={0.7}>
            Your most performed exercises and their stats
          </Paragraph>
        </YStack>

        {exerciseStats.length > 0 ? (
          <YStack gap="$3">
            {exerciseStats.map((exercise) => (
              <ExerciseStatsCard
                key={exercise.exercise_type}
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
