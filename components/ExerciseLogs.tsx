import { Trash2, X } from "@tamagui/lucide-icons";
import { useState } from "react";
import {
  Button,
  Dialog,
  ListItem,
  Paragraph,
  Separator,
  Spinner,
  Theme,
  Unspaced,
  View,
  XStack,
  YGroup,
} from "tamagui";
import { useToastController } from "@tamagui/toast";
import { Exercise, Set } from "types/exercise";
import {
  capitalizeEachWord,
  formatExerciseGrouping,
  formatIsoDuration,
} from "@/lib/utils";
import { deleteSet } from "@/lib/api/supabase/workouts";

export const ExerciseLogs = ({
  exercise,
  open,
  setOpen,
  onLogDeleted,
}: {
  exercise: Exercise;
  open: boolean;
  setOpen: (open: boolean) => void;
  onLogDeleted?: () => void;
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [setToDelete, setSetToDelete] = useState<Set | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToastController();

  const handleDeletePress = (set: Set) => {
    setSetToDelete(set);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!setToDelete) return;

    setIsDeleting(true);
    try {
      const deleted = await deleteSet(setToDelete.id);
      if (deleted) {
        toast.show("Set deleted", { duration: 2000 });
        onLogDeleted?.();
        // Close ExerciseLogs dialog if this was the last set
        if (exercise.sets.length <= 1) {
          setOpen(false);
        }
      } else {
        toast.show("Set not found", { duration: 2000 });
      }
    } catch (error) {
      toast.show("Failed to delete set", { duration: 3000 });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setSetToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setSetToDelete(null);
  };

  return (
    <>
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
              l="$4"
              r="$4"
            >
              <View gap="$4" p="$4">
                <Dialog.Title>
                  {capitalizeEachWord(
                    formatExerciseGrouping({
                      modifiers: exercise.modifiers,
                      equipment: exercise.equipment,
                      exercise_kind: exercise.exercise_kind,
                    }),
                  )}
                </Dialog.Title>
                <YGroup
                  separator={<Separator />}
                  bordered
                  rounded="$4"
                  overflow="hidden"
                >
                  {exercise?.sets?.map((set) => (
                    <YGroup.Item key={set.id}>
                      <ListItem
                        title={setDescription(set)}
                        subTitle={
                          set.input ? (
                            <Paragraph size="$2" $gtXs={{ size: "$4" }} fontStyle="italic" color="$color9">
                              "{set.input}"
                            </Paragraph>
                          ) : undefined
                        }
                        size="$4"
                        $gtXs={{ size: "$6" }}
                        paddingBlock="$3"
                        iconAfter={
                          <Button
                            size="$1.5"
                            $gtXs={{ size: "$4" }}
                            circular
                            chromeless
                            color="$red9"
                            icon={<Trash2 size="$1" $gtXs={{ size: "$1.5" }} />}
                            onPress={() => handleDeletePress(set)}
                          />
                        }
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
                    $gtXs={{ size: "$4" }}
                    circular
                    icon={<X size="$1" $gtXs={{ size: "$1.5" }} />}
                  />
                </Dialog.Close>
              </Unspaced>
            </Dialog.Content>
          </Dialog.FocusScope>
        </Dialog.Portal>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog modal open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="delete-overlay"
            background="$shadow6"
            animateOnly={["transform", "opacity"]}
            animation="quicker"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Content
            bordered
            elevate
            key="delete-content"
            animateOnly={["transform", "opacity"]}
            animation="quicker"
            enterStyle={{ x: 0, y: 20, opacity: 0 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          >
            <View gap="$4" p="$4">
              <Dialog.Title>Delete Set?</Dialog.Title>
              <Dialog.Description>
                This will permanently delete this set.
              </Dialog.Description>
              <XStack gap="$3" justify="flex-end">
                <Button onPress={handleCancelDelete} disabled={isDeleting}>
                  Cancel
                </Button>
                <Theme name="accent">
                  <Button
                    variant="active"
                    onPress={handleConfirmDelete}
                    disabled={isDeleting}
                    icon={isDeleting ? <Spinner size="small" /> : undefined}
                  >
                    Delete
                  </Button>
                </Theme>
              </XStack>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
};

function setDescription(set: Set): string {
  const parts: string[] = [];

  // Strength metrics
  if (set.repetitions) {
    parts.push(`${set.repetitions} reps`);
  }
  if (set.weight) {
    parts.push(`@ ${set.weight} ${set.weightUnit}`);
  }

  // Cardio metrics
  if (set.distance) {
    parts.push(`${set.distance} ${set.distanceUnit || "units"}`);
  }
  if (set.resistanceLevel) {
    parts.push(`resistance ${set.resistanceLevel}`);
  }

  // General
  if (set.duration) {
    parts.push(`for ${formatIsoDuration(set.duration)}`);
  }
  if (set.effort) {
    parts.push(`(${set.effort} effort)`);
  }

  return parts.join(" ");
}
