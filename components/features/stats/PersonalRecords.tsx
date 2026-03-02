import { XStack, YStack, Text, Card, H5, Theme } from "tamagui";
import { Trophy, ChevronRight } from "@tamagui/lucide-icons";

interface PRData {
  value: number;
  date: string;
  exercise: string;
  workoutId?: string;
}

interface PersonalRecordsProps {
  weightPr: PRData | null;
  repsPr: PRData | null;
  weightUnit?: string;
  onPRPress?: (workoutId: string) => void;
}

interface PRCardProps {
  title: string;
  pr: PRData | null;
  unit: string;
  onPress?: () => void;
}

function PRCard({ title, pr, unit, onPress }: PRCardProps) {
  if (!pr) return null;

  const formattedDate = new Date(pr.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card
      flex={1}
      p="$3"
      bg="$color3"
      borderRadius="$4"
      bordered
      onPress={onPress}
      pressStyle={onPress ? { opacity: 0.8 } : undefined}
      cursor={onPress ? "pointer" : undefined}
    >
      <XStack items="center" justify="space-between">
        <YStack gap="$2" flex={1}>
          <XStack items="center" gap="$2">
            <Trophy size={16} color="$color10" />
            <Text fontSize="$2" color="$color11" fontWeight="600">
              {title}
            </Text>
          </XStack>
          <XStack items="baseline" gap="$1">
            <Text fontSize="$7" fontWeight="700" color="$color12">
              {pr.value}
            </Text>
            <Text fontSize="$3" color="$color11">
              {unit}
            </Text>
          </XStack>
          <Text fontSize="$1" color="$color10" numberOfLines={1}>
            {formattedDate}
          </Text>
        </YStack>
        {onPress && <ChevronRight size={16} color="$color10" />}
      </XStack>
    </Card>
  );
}

export function PersonalRecords({ weightPr, repsPr, weightUnit, onPRPress }: PersonalRecordsProps) {
  if (!weightPr && !repsPr) {
    return null;
  }

  return (
    <Theme name="accent">
      <YStack gap="$2">
        <H5 opacity={0.7} fontWeight="600">
          Personal Records
        </H5>
        <XStack gap="$3">
          <PRCard
            title="Weight PR"
            pr={weightPr}
            unit={weightUnit ?? "lbs"}
            onPress={weightPr?.workoutId ? () => onPRPress?.(weightPr.workoutId!) : undefined}
          />
          <PRCard
            title="Reps PR"
            pr={repsPr}
            unit="reps"
            onPress={repsPr?.workoutId ? () => onPRPress?.(repsPr.workoutId!) : undefined}
          />
        </XStack>
      </YStack>
    </Theme>
  );
}
