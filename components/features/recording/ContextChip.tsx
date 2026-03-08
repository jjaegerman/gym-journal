import { X, Repeat } from "@tamagui/lucide-icons";
import { Button, XStack, Text } from "tamagui";
import { Exercise } from "@/types/exercise";
import { capitalizeEachWord, formatExerciseGrouping } from "@/lib/utils";

interface ContextChipProps {
  exercise: Exercise;
  onClear: () => void;
}

export function ContextChip({ exercise, onClear }: ContextChipProps) {
  const title = capitalizeEachWord(
    formatExerciseGrouping({
      modifiers: exercise.modifiers,
      equipment: exercise.equipment,
      exercise_kind: exercise.exercise_kind,
    }),
  );

  return (
    <XStack
      self="flex-start"
      bg="$color3"
      borderWidth={1}
      borderColor="$color5"
      pl="$3.5"
      pr="$2"
      py="$2"
      gap="$2"
      items="center"
      rounded="$10"
    >
      <Repeat size={14} stroke="$blue9" />
      <Text fontSize="$3" fontWeight="500" color="$color11" numberOfLines={1}>
        {title}
      </Text>
      <Button
        size="$2"
        circular
        chromeless
        icon={X}
        color="$color10"
        onPress={onClear}
        shrink={0}
      />
    </XStack>
  );
}
