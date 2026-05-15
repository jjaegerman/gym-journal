import { useEffect, useRef, useState } from "react";
import { H5, Sheet, Spinner, View, XStack, YStack } from "tamagui";
import { Exercise } from "@/types/exercise";
import { ExerciseList } from "@/components/shared/ExerciseList";
import { ContextChip } from "@/components/features/recording/ContextChip";
import { InputModeToggle } from "@/components/features/recording/InputModeToggle";
import { RecordButton } from "@/components/features/recording/RecordButton";
import { RecordTextBox } from "@/components/features/recording/RecordTextBox";
import { useAudioRecording } from "@/lib/hooks/useAudioRecording";
import { useExerciseSubmit } from "@/lib/hooks/useExerciseSubmit";
import { buildExerciseContext } from "@/lib/utils";
import type { InputMode } from "@/lib/storage/inputMode";

interface AddSetsSheetProps {
  workoutId: string;
  workoutDatetime: Date;
  workoutEndTime?: Date | null;
  exercises: Exercise[];
  open: boolean;
  onClose: () => void;
  onSetsAdded: () => void;
}

export function AddSetsSheet({
  workoutId,
  workoutDatetime,
  workoutEndTime,
  exercises,
  open,
  onClose,
  onSetsAdded,
}: AddSetsSheetProps) {
  const committedRef = useRef(false);
  const [selectedContext, setSelectedContext] = useState<Exercise | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("voice");

  const { startRecording, stopRecording, cancelRecording, recorderState } =
    useAudioRecording();
  const { submitAudio, submitText, loading } = useExerciseSubmit(() => {
    onSetsAdded();
    onClose();
  }, workoutId);

  // Reset committedRef only when sheet opens (not on close — ghost presses fire during close animation)
  useEffect(() => {
    if (open) {
      committedRef.current = false;
    }
  }, [open]);

  const handleContextChange = (exercise: Exercise | null) => {
    if (committedRef.current) return;
    setSelectedContext(exercise);
  };

  const handleStopRecording = async () => {
    committedRef.current = true;
    const uri = await stopRecording();
    if (uri) {
      await submitAudio(
        uri,
        selectedContext ? buildExerciseContext(selectedContext) : undefined
      );
    }
  };

  const handleSubmitText = async (text: string) => {
    committedRef.current = true;
    await submitText(
      text,
      selectedContext ? buildExerciseContext(selectedContext) : undefined
    );
  };

  const showEndTime =
    workoutEndTime &&
    workoutEndTime.getTime() !== workoutDatetime.getTime();
  const dateLabel =
    workoutDatetime.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) +
    (showEndTime
      ? " to " +
        workoutEndTime.toLocaleString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "");

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      snapPoints={[90]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay opacity={0.5} />
      <Sheet.Frame>
        <Sheet.Handle />
        <YStack px="$4" pt="$2" pb="$6" gap="$3" flex={1}>
          <H5 color="$color11" fontWeight="600">
            Add to {dateLabel}
          </H5>
          {exercises.length > 0 && (
            <Sheet.ScrollView
              flex={1}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <ExerciseList
                exercises={exercises}
                contextExerciseId={selectedContext?.id}
                onContextChange={handleContextChange}
                onLogDeleted={onSetsAdded}
              />
            </Sheet.ScrollView>
          )}
          <YStack gap="$3">
            <XStack justify="space-between" items="center">
              {selectedContext ? (
                <ContextChip
                  exercise={selectedContext}
                  onClear={() => setSelectedContext(null)}
                />
              ) : (
                <View />
              )}
              <InputModeToggle
                mode={inputMode}
                onModeChange={setInputMode}
                disabled={recorderState.isRecording || loading}
              />
            </XStack>
            {loading ? (
              <View height={176} items="center" justify="center">
                <Spinner size="large" color="$color" />
              </View>
            ) : inputMode === "voice" ? (
              <View items="center">
                <RecordButton
                  startCallback={startRecording}
                  stopCallback={handleStopRecording}
                  cancelCallback={cancelRecording}
                  durationMillis={recorderState.durationMillis}
                  isRecording={recorderState.isRecording}
                  disabled={recorderState.isPending}
                />
              </View>
            ) : (
              <RecordTextBox submitText={handleSubmitText} loading={loading} />
            )}
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
