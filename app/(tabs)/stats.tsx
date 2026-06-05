import { useEffect } from "react";
import { ExerciseStats } from "@/components/features/stats";
import { track } from "@/lib/analytics/track";

export default function StatsTab() {
  useEffect(() => {
    track("stats_viewed");
  }, []);

  return <ExerciseStats />;
}
