import { ScrollView, YStack, H5, Separator, Paragraph } from "tamagui";
import { RefreshControl } from "react-native";
import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import {
  useProfileStats,
  useProfileWeeklyTrends,
  usePrTimeline,
  useDailyTrainingSummary,
} from "@/lib/hooks";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { IdentityStrip } from "./IdentityStrip";
import { ProfileTrendChart } from "./ProfileTrendChart";
import { PrTimeline } from "./PrTimeline";
import { CalendarHeatmap } from "./CalendarHeatmap";

const PROFILE_RANGE = '1_year' as const;

export function ProfileSummary() {
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useProfileStats();

  const weekly = useProfileWeeklyTrends(PROFILE_RANGE);
  const prs = usePrTimeline(PROFILE_RANGE, 2);
  const daily = useDailyTrainingSummary(PROFILE_RANGE);

  const [refreshing, setRefreshing] = useState(false);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetchStats();
      weekly.refetch();
      prs.refetch();
      daily.refetch();
    }, [refetchStats, weekly.refetch, prs.refetch, daily.refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchStats(),
      weekly.refetch(),
      prs.refetch(),
      daily.refetch(),
    ]);
    setRefreshing(false);
  };

  if (statsLoading && !stats) return <LoadingState message="Loading your stats..." />;
  if (statsError) {
    return <ErrorState title="Error loading stats" message={statsError.message} onRetry={refetchStats} />;
  }
  if (!stats) return <ErrorState title="No Data" message="No statistics available" />;

  const hasData = stats.total_workouts > 0;

  return (
    <ScrollView
      flex={1}
      bg="$background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <YStack p="$4" gap="$4" width="90%" $sm={{ width: "80%" }} $md={{ width: "75%" }} self="center">
        <IdentityStrip stats={stats} />

        {hasData && (
          <>
            <Separator />

            <YStack gap="$2">
              <H5 color="$color11" fontWeight="600" $sm={{ fontSize: "$8" }}>
                Trends
              </H5>
              <ProfileTrendChart trends={weekly.data} loading={weekly.loading} />
              {weekly.error && (
                <Paragraph size="$2" color="$color10">
                  Couldn't load trends. Pull to refresh.
                </Paragraph>
              )}
            </YStack>

            {prs.data.length > 0 && (
              <>
                <Separator />
                <YStack gap="$2">
                  <H5 color="$color11" fontWeight="600" $sm={{ fontSize: "$8" }}>
                    Recent PRs
                  </H5>
                  <PrTimeline
                    prs={prs.data}
                    loading={prs.loading}
                    hasAnyPrEver={prs.data.length > 0}
                  />
                </YStack>
              </>
            )}

            <Separator />

            <YStack gap="$2">
              <H5 color="$color11" fontWeight="600" $sm={{ fontSize: "$8" }}>
                Training calendar
              </H5>
              <CalendarHeatmap
                days={daily.data}
                range={PROFILE_RANGE}
                loading={daily.loading}
              />
            </YStack>
          </>
        )}
      </YStack>
    </ScrollView>
  );
}
