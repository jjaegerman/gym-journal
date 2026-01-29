import { Trash2, X } from "@tamagui/lucide-icons";
import { useState } from "react";
import {
  Button,
  Dialog,
  ListItem,
  Separator,
  Spinner,
  Unspaced,
  View,
  XStack,
  YGroup,
} from "tamagui";
import { useToastController } from "@tamagui/toast";
import { Exercise, Log } from "types/exercise";
import {
  capitalizeEachWord,
  formatExerciseGrouping,
  formatIsoDuration,
} from "@/lib/utils";
import { deleteLog } from "@/lib/api/supabase/workouts";

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
  const [logToDelete, setLogToDelete] = useState<Log | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToastController();

  const handleDeletePress = (log: Log) => {
    setLogToDelete(log);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!logToDelete) return;

    setIsDeleting(true);
    try {
      const deleted = await deleteLog(logToDelete.id);
      if (deleted) {
        toast.show("Log deleted", { duration: 2000 });
        onLogDeleted?.();
        // Close ExerciseLogs dialog if this was the last log
        if (exercise.logs.length <= 1) {
          setOpen(false);
        }
      } else {
        toast.show("Log not found", { duration: 2000 });
      }
    } catch (error) {
      toast.show("Failed to delete log", { duration: 3000 });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setLogToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setLogToDelete(null);
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
            >
              <View gap="$4" p="$4">
                <Dialog.Title>
                  {capitalizeEachWord(
                    formatExerciseGrouping({
                      modifiers: exercise.modifiers,
                      equipment: exercise.equipment,
                      category: exercise.category,
                    }),
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
                        subTitle={log.input ? `"${log.input}"` : undefined}
                        subTitleProps={{ fontStyle: "italic", color: "$color9" }}
                        iconAfter={
                          <Button
                            size="$1.5"
                            circular
                            chromeless
                            color="$red9"
                            icon={Trash2}
                            onPress={() => handleDeletePress(log)}
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
                    circular
                    icon={X}
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
              <Dialog.Title>Delete Log?</Dialog.Title>
              <Dialog.Description>
                This will permanently delete this log entry.
              </Dialog.Description>
              <XStack gap="$3" justify="flex-end">
                <Button onPress={handleCancelDelete} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  color="$red10"
                  onPress={handleConfirmDelete}
                  disabled={isDeleting}
                  icon={isDeleting ? <Spinner size="small" /> : undefined}
                >
                  Delete
                </Button>
              </XStack>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
};

function logDescription(log: Log): string {
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
    parts.push(`for ${formatIsoDuration(log.duration)}`);
  }
  if (log.effort) {
    parts.push(`(${log.effort} effort)`);
  }

  return parts.join(" ");
}
