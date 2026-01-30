import { XStack, YStack, Text, Card } from "tamagui";
import { Trophy } from "@tamagui/lucide-icons";

interface PRData {
  value: number;
  date: string;
  exercise: string;
}

interface PersonalRecordsProps {
  weightPr: PRData | null;
  repsPr: PRData | null;
}

interface PRCardProps {
  title: string;
  pr: PRData | null;
  unit: string;
}

function PRCard({ title, pr, unit }: PRCardProps) {
  if (!pr) return null;

  const formattedDate = new Date(pr.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card flex={1} p="$3" bg="$red3" borderRadius="$4">
      <YStack gap="$2">
        <XStack items="center" gap="$2">
          <Trophy size={16} color="$red10" />
          <Text fontSize="$2" color="$red11" fontWeight="600">
            {title}
          </Text>
        </XStack>
        <XStack items="baseline" gap="$1">
          <Text fontSize="$7" fontWeight="700" color="$red12">
            {pr.value}
          </Text>
          <Text fontSize="$3" color="$red11">
            {unit}
          </Text>
        </XStack>
        <Text fontSize="$1" color="$red10" numberOfLines={1}>
          {formattedDate}
        </Text>
      </YStack>
    </Card>
  );
}

export function PersonalRecords({ weightPr, repsPr }: PersonalRecordsProps) {
  if (!weightPr && !repsPr) {
    return null;
  }

  return (
    <YStack gap="$2">
      <Text fontSize="$4" fontWeight="600">
        Personal Records
      </Text>
      <XStack gap="$3">
        <PRCard title="Weight PR" pr={weightPr} unit="lbs" />
        <PRCard title="Reps PR" pr={repsPr} unit="reps" />
      </XStack>
    </YStack>
  );
}
