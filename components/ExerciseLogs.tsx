import { Edit3, Pencil, X } from "@tamagui/lucide-icons";
import {
  Button,
  Dialog,
  Fieldset,
  Input,
  Label,
  ListItem,
  Paragraph,
  Select,
  Separator,
  Spacer,
  TooltipSimple,
  Unspaced,
  View,
  XStack,
  YGroup,
} from "tamagui";
import { Exercise } from "types/exercise";
import { capitalizeEachWord, formatExerciseLabel } from "@/lib/utils";

export const ExerciseLogs = ({
  exercise,
  open,
  setOpen,
}: {
  exercise: Exercise;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  return (
    <Dialog modal open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          background="$shadow6"
          animateOnly={["transform", "opacity"]}
          animation={[
            "quicker",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.FocusScope focusOnIdle>
          <Dialog.Content
            bordered
            elevate
            key="content"
            animateOnly={["transform", "opacity"]}
            animation={[
              "quicker",
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: 20, opacity: 0 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            position="absolute"
            t="$10"
          >
            <View gap="$4" p="$4">
              <Dialog.Title>
                {capitalizeEachWord(
                  formatExerciseLabel({
                    variants: exercise.variants,
                    equipment: exercise.equipment,
                    type: exercise.type,
                    name: exercise.name,
                  })
                )}
              </Dialog.Title>
              <YGroup
                separator={<Separator />}
                bordered
                rounded="$4"
                overflow="hidden"
              >
                {exercise?.logs?.map((log) => (
                  <YGroup.Item key={log.id}>
                    <ListItem
                      title={logDescription(log)}
                      iconAfter={Pencil}
                      hoverTheme
                      pressTheme
                    />
                  </YGroup.Item>
                ))}
              </YGroup>
            </View>
            <Unspaced>
              <Dialog.Close asChild>
                <Button
                  r="$2.5"
                  t="$2.5"
                  position="absolute"
                  size="$2"
                  circular
                  icon={X}
                />
              </Dialog.Close>
            </Unspaced>
          </Dialog.Content>
        </Dialog.FocusScope>
      </Dialog.Portal>
    </Dialog>
  );
};

function logDescription(log: any): string {
  const parts: string[] = [];

  // Strength metrics
  if (log.repetitions) {
    parts.push(`${log.repetitions} reps`);
  }
  if (log.weight) {
    parts.push(`@ ${log.weight} ${log.weightUnit}`);
  }

  // Cardio metrics
  if (log.distance) {
    parts.push(`${log.distance} ${log.distance_unit || "units"}`);
  }
  if (log.resistance_level) {
    parts.push(`resistance ${log.resistance_level}`);
  }

  // General
  if (log.duration) {
    parts.push(`for ${log.duration}`);
  }
  if (log.effort) {
    parts.push(`(${log.effort} effort)`);
  }

  return parts.join(" ");
}
