import { YStack, XStack, Text, Card } from "tamagui";
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
      <Text fontSize="$4" fontWeight="600">
        Recent Sessions
      </Text>
      <YStack gap="$2">
        {sessions.map((session) => {
          const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <Card
              key={session.workoutId}
              p="$3"
              bg="$gray3"
              borderRadius="$3"
              pressStyle={{ opacity: 0.7, bg: "$gray4" }}
              onPress={() => onSessionPress(session.workoutId)}
              cursor="pointer"
            >
              <XStack items="center" justify="space-between">
                <XStack items="center" gap="$2" flex={1}>
                  <Text fontSize="$3" color="$gray11" minWidth={60}>
                    {formattedDate}
                  </Text>
                  <Text fontSize="$3" fontWeight="500" flex={1} numberOfLines={1}>
                    {session.summary}
                  </Text>
                </XStack>
                <ChevronRight size={16} color="$gray10" />
              </XStack>
            </Card>
          );
        })}
      </YStack>
    </YStack>
  );
}
