import { Card, YStack, H4, Paragraph, Theme } from "tamagui";
import { Activity, Clock, Flame, TrendingUp } from "@tamagui/lucide-icons";
import { StatGrid, type StatGridCell } from "@/components/ui/StatGrid";
import type { ProfileStats } from "@/lib/api/supabase/stats";

interface Props {
  stats: ProfileStats;
}

function formatHours(h: number): string {
  if (h >= 100) return Math.round(h).toString();
  return h.toFixed(1).replace(/\.0$/, "");
}

export function IdentityStrip({ stats }: Props) {
  if (stats.total_workouts === 0) {
    return (
      <Card elevate size="$4" bordered p="$4" br="$6" bg="$color2">
        <YStack items="center" justify="center" gap="$2" py="$4">
          <Flame size={48} color="$color8" />
          <H4 color="$color11">Start your streak</H4>
          <Paragraph size="$3" color="$color10">
            Log your first workout to light this up
          </Paragraph>
        </YStack>
      </Card>
    );
  }

  const cells: StatGridCell[] = [
    {
      accent: true,
      icon: (
        <Theme name="accent">
          <Flame size={18} color="$color10" />
        </Theme>
      ),
      label: "Current",
      value: stats.current_streak_days,
      unit: "day streak",
    },
    {
      icon: <Activity size={18} color="$color10" />,
      label: "Workouts",
      value: stats.total_workouts,
    },
    {
      icon: <Clock size={18} color="$color10" />,
      label: "Total time",
      value: formatHours(stats.total_hours),
      unit: "h",
    },
    {
      icon: <TrendingUp size={18} color="$color10" />,
      label: "Best streak",
      value: stats.longest_streak_days,
      unit: "days",
    },
  ];

  return <StatGrid cells={cells} />;
}
