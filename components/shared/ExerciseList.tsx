import { useState } from "react";
import { View, ListItem, YGroup, Separator } from "tamagui";
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
}

export function ExerciseList({ exercises, onLogDeleted }: ExerciseListProps) {
  const [focusedExerciseIdx, setFocusedExerciseIdx] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <YGroup
        bordered
        separator={<Separator />}
        rounded="$4"
        overflow="hidden"
      >
        {exercises.map((exercise, i) => {
          const summary = summarizeExerciseLogs(exercise.logs);
          const description = descriptionFromSummary(summary);

          const title = capitalizeEachWord(
            formatExerciseGrouping({
              modifiers: exercise.modifiers,
              equipment: exercise.equipment,
              category: exercise.category,
            }),
          );

          const ExerciseIcon: any = () =>
            getExerciseIcon(exercise.category, 24);
          const iconColor = getExerciseIconColor(exercise.category);

          return (
            <YGroup.Item key={exercise.id}>
              <ListItem
                title={title}
                subTitle={description}
                size="$4"
                paddingBlock="$3"
                hoverTheme
                pressTheme
                icon={
                  <View>
                    <ExerciseIcon color={iconColor} />
                  </View>
                }
                iconAfter={Expand}
                onPress={() => {
                  setFocusedExerciseIdx(i);
                  setDialogOpen(true);
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
}
