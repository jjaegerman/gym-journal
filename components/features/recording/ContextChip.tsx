import { X } from "@tamagui/lucide-icons";
import { Button, XStack, Text } from "tamagui";
import { Exercise } from "@/types/exercise";
import {
  capitalizeEachWord,
  formatExerciseGrouping,
  summarizeExerciseLogs,
  descriptionFromSummary,
} from "@/lib/utils";

interface ContextChipProps {
  exercise: Exercise;
  onClear: () => void;
}

export function ContextChip({ exercise, onClear }: ContextChipProps) {
  const title = capitalizeEachWord(
    formatExerciseGrouping({
      modifiers: exercise.modifiers,
      equipment: exercise.equipment,
      category: exercise.category,
    })
  );

  const summary = summarizeExerciseLogs(exercise.logs);
  const description = descriptionFromSummary(summary);

  return (
    <XStack
      bg="$blue3"
      borderColor="$blue7"
      bordered
      rounded="$10"
      px="$3"
      py="$2"
      gap="$2"
      items="center"
      alignSelf="flex-start"
      maxWidth="100%"
    >
      <Text fontSize="$3" color="$blue11" numberOfLines={1} flex={1} shrink={1}>
        {title}
        {description ? `  ·  ${description}` : ""}
      </Text>
      <Button
        size="$2"
        circular
        chromeless
        icon={X}
        color="$blue9"
        onPress={onClear}
        flexShrink={0}
      />
    </XStack>
  );
}
