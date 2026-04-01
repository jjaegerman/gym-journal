import { memo, useState } from "react";
import { View, ListItem, YGroup, Separator, Button, useMedia, getTokenValue } from "tamagui";
import { Expand } from "@tamagui/lucide-icons";
import { Exercise } from "@/types/exercise";
import {
  capitalizeEachWord,
  getExerciseIcon,
  getExerciseIconColor,
  formatExerciseGrouping,
  summarizeExerciseLogs,
  descriptionFromSummary,
} from "@/lib/utils";
import { ExerciseLogs } from "../ExerciseLogs";

interface ExerciseListProps {
  exercises: Exercise[];
  onLogDeleted?: () => void;
  contextExerciseId?: string;
  onContextChange?: (exercise: Exercise | null) => void;
}

export const ExerciseList = memo(function ExerciseList({
  exercises,
  onLogDeleted,
  contextExerciseId,
  onContextChange,
}: ExerciseListProps) {
  const [focusedExerciseIdx, setFocusedExerciseIdx] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const media = useMedia();
  const exerciseIconSize = getTokenValue(media.sm ? "$2" : "$1.5", "size");

  return (
    <>
      <YGroup
        bordered
        separator={<Separator />}
        rounded="$4"
        overflow="hidden"
      >
        {exercises.map((exercise, i) => {
          const summary = summarizeExerciseLogs(exercise.sets);
          const description = descriptionFromSummary(summary);

          const title = capitalizeEachWord(
            formatExerciseGrouping({
              modifiers: exercise.modifiers,
              equipment: exercise.equipment,
              exercise_kind: exercise.exercise_kind,
            }),
          );

          const iconColor = getExerciseIconColor(exercise.exercise_kind);
          const isSelected = exercise.id === contextExerciseId;

          return (
            <YGroup.Item key={exercise.id}>
              <ListItem
                title={title}
                subTitle={description}
                size="$4"
                $sm={{ size: "$6" }}
                paddingBlock="$3"
                hoverTheme
                pressTheme
                backgroundColor={isSelected ? "$blue2" : undefined}
                borderColor={isSelected ? "$blue7" : undefined}
                icon={
                  <View>
                    {getExerciseIcon(exercise.exercise_kind, exerciseIconSize, isSelected ? "$blue9" : iconColor)}
                  </View>
                }
                iconAfter={
                  <Button
                    size="$2"
                    $sm={{ size: "$4" }}
                    chromeless
                    circular
                    icon={<Expand size="$1.5" $sm={{ size: "$2" }} />}
                    onPress={() => {
                      setFocusedExerciseIdx(i);
                      setDialogOpen(true);
                    }}
                  />
                }
                onPress={() => {
                  if (onContextChange) {
                    onContextChange(isSelected ? null : exercise);
                  }
                }}
              />
            </YGroup.Item>
          );
        })}
      </YGroup>
      <ExerciseLogs
        exercise={exercises[focusedExerciseIdx] || ({} as Exercise)}
        open={dialogOpen}
        setOpen={setDialogOpen}
        onLogDeleted={onLogDeleted}
      />
    </>
  );
});
