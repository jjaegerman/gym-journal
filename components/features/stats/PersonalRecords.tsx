import { XStack, YStack, H5 } from "tamagui";
import { Trophy } from "@tamagui/lucide-icons";
import { PrCard } from "@/components/ui/PrCard";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PersonalRecords({ weightPr, repsPr, weightUnit, onPRPress }: PersonalRecordsProps) {
  if (!weightPr && !repsPr) return null;

  return (
    <YStack gap="$2">
      <H5 color="$color11" fontWeight="600">
        Personal Records
      </H5>
      <XStack gap="$3">
        {weightPr && (
          <PrCard
            icon={<Trophy size={16} $sm={{ size: 20 } as any} color="$color11" />}
            title="Weight PR"
            subtitle={weightPr.exercise}
            primary={`${Math.round(weightPr.value)} ${weightUnit ?? 'lbs'}`}
            dateLabel={formatDate(weightPr.date)}
            flex={1}
            onPress={weightPr.workoutId ? () => onPRPress?.(weightPr.workoutId!) : undefined}
          />
        )}
        {repsPr && (
          <PrCard
            icon={<Trophy size={16} $sm={{ size: 20 } as any} color="$color11" />}
            title="Reps PR"
            subtitle={repsPr.exercise}
            primary={`${repsPr.value} reps`}
            dateLabel={formatDate(repsPr.date)}
            flex={1}
            onPress={repsPr.workoutId ? () => onPRPress?.(repsPr.workoutId!) : undefined}
          />
        )}
      </XStack>
    </YStack>
  );
}
