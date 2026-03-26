import { YStack, H5, YGroup, Separator, ListItem } from "tamagui";
import { ChevronRight } from "@tamagui/lucide-icons";

interface SessionData {
  workoutId: string;
  date: string;
  summary: string;
}

interface RecentSessionsProps {
  sessions: SessionData[];
  onSessionPress: (workoutId: string) => void;
}

export function RecentSessions({ sessions, onSessionPress }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <YStack gap="$2">
      <H5 opacity={0.7} fontWeight="600">
        Recent Sessions
      </H5>
      <YGroup bordered separator={<Separator />} rounded="$4" overflow="hidden">
        {sessions.map((session) => {
          const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <YGroup.Item key={session.workoutId}>
              <ListItem
                title={session.summary}
                subTitle={formattedDate}
                size="$4"
                $gtXs={{ size: "$6" }}
                paddingBlock="$3"
                iconAfter={ChevronRight}
                hoverTheme
                pressTheme
                onPress={() => onSessionPress(session.workoutId)}
              />
            </YGroup.Item>
          );
        })}
      </YGroup>
    </YStack>
  );
}
