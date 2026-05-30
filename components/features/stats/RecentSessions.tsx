import { YStack, H5, YGroup, Separator, ListItem } from "tamagui";
import { ChevronRight } from "@tamagui/lucide-icons";

interface SessionData {
  workoutId: string;
  date: string;
  summary: string;
}

interface RecentSessionsProps {
  sessions: SessionData[];
  /**
   * If omitted, rows render non-interactively (no chevron, no press). Used
   * by the /share/stats route since the workout modal is gated behind auth.
   */
  onSessionPress?: (workoutId: string) => void;
}

export function RecentSessions({ sessions, onSessionPress }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <YStack gap="$2">
      <H5 color="$color11" fontWeight="600">
        Recent Sessions
      </H5>
      <YGroup bordered separator={<Separator />} rounded="$4" overflow="hidden">
        {sessions.map((session) => {
          const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <YGroup.Item key={session.workoutId}>
              <ListItem
                title={session.summary}
                subTitle={formattedDate}
                size="$4"
                $sm={{ size: "$6" }}
                paddingBlock="$3"
                iconAfter={
                  onSessionPress ? (
                    <ChevronRight size="$1.5" $sm={{ size: "$2" }} />
                  ) : undefined
                }
                hoverTheme={!!onSessionPress}
                pressTheme={!!onSessionPress}
                onPress={
                  onSessionPress
                    ? () => onSessionPress(session.workoutId)
                    : undefined
                }
              />
            </YGroup.Item>
          );
        })}
      </YGroup>
    </YStack>
  );
}
