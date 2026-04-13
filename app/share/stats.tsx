import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { PortalProvider, Text, View } from "tamagui";
import { SharedStatsView } from "@/components/features/stats/SharedStatsView";
import { parseStatsShareParams } from "@/lib/share/links";

/**
 * Public read-only stats page. Scoped to a single user's data via the `uid`
 * query param, plus any of the usual filter params encoded in the URL.
 * Powers universal/app links for `gym-journal.com/share/stats?uid=...`.
 */
export default function SharedStatsScreen() {
  const params = useLocalSearchParams();
  const parsed = useMemo(() => parseStatsShareParams(params as any), [params]);

  if (!parsed) {
    return (
      <View flex={1} bg="$background" items="center" justify="center" p="$4">
        <Text color="$color11">Missing or invalid share parameters.</Text>
      </View>
    );
  }

  return (
    <PortalProvider>
      <SharedStatsView userId={parsed.userId} filters={parsed.filters} />
    </PortalProvider>
  );
}
