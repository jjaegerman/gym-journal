import { RecordButton } from "./RecordButton";
import { RecordTextBox } from "./RecordTextBox";
import { InputModeToggle } from "./InputModeToggle";
import { ContextChip } from "./ContextChip";
import { H5, Paragraph, View, YStack, Spinner } from "tamagui";
import {
  useAudioRecording,
  useExerciseSubmit,
  useCurrentWorkout,
} from "@/lib/hooks";
import { useTabContext } from "@/lib/context/TabContext";
import { useCallback, useEffect, useState, useMemo } from "react";
import { BlurView } from "expo-blur";
import { getRandomPrompts } from "@/lib/data/examplePrompts";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import {
  type InputMode,
  getInputMode,
  setInputMode,
} from "@/lib/storage/inputMode";
import { ExerciseList } from "@/components/shared/ExerciseList";
import { formatDuration, buildExerciseContext } from "@/lib/utils";
import { Exercise } from "@/types/exercise";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export function RecordingScreen() {
  const { startRecording, stopRecording, cancelRecording, recorderState } =
    useAudioRecording();
  const { currentWorkout, refetch } = useCurrentWorkout();
  const { submitAudio, submitText, loading } = useExerciseSubmit(refetch);
  const { setTabsDisabled } = useTabContext();
  const blurIntensity = useSharedValue(0);
  const [inputMode, setInputModeState] = useState<InputMode>("voice");
  const [selectedContext, setSelectedContext] = useState<Exercise | null>(null);
  const examplePrompts = useMemo(() => getRandomPrompts(3), []);

  // Auto-pin the most recent exercise whenever the workout changes
  useEffect(() => {
    const exercises = currentWorkout?.exercises;
    if (exercises && exercises.length > 0) {
      setSelectedContext(exercises[exercises.length - 1]);
    } else {
      setSelectedContext(null);
    }
  }, [currentWorkout]);

  const hasActiveWorkout = currentWorkout !== null;

  const workoutDuration = useMemo(() => {
    if (!currentWorkout?.endTime) return null;
    const minutes = Math.round(
      (currentWorkout.endTime.getTime() - currentWorkout.datetime.getTime()) /
        60000
    );
    return formatDuration(Math.max(minutes, 0));
  }, [currentWorkout]);

  // Load persisted input mode on mount
  useEffect(() => {
    getInputMode().then(setInputModeState);
  }, []);

  // Disable tabs while recording or loading
  useEffect(() => {
    const isActive = recorderState.isRecording || loading;
    setTabsDisabled(isActive);
    blurIntensity.value = withTiming(isActive ? 80 : 0, {
      duration: 300,
    });
  }, [recorderState.isRecording, loading, setTabsDisabled, blurIntensity]);

  const animatedBlurProps = useAnimatedProps(() => ({
    intensity: blurIntensity.value,
  }));

  const handleLogDeleted = useCallback(() => {
    refetch().then(() => {
      setSelectedContext((prev) => {
        if (!prev) return null;
        const stillExists = currentWorkout?.exercises.some(
          (e) => e.id === prev.id
        );
        return stillExists ? prev : null;
      });
    });
  }, [refetch, currentWorkout?.exercises]);

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri) {
      await submitAudio(
        uri,
        selectedContext ? buildExerciseContext(selectedContext) : undefined
      );
    }
  };

  const handleSubmitText = async (text: string) => {
    await submitText(
      text,
      selectedContext ? buildExerciseContext(selectedContext) : undefined
    );
  };

  const clearContext = useCallback(() => setSelectedContext(null), []);

  const handleModeChange = (mode: InputMode) => {
    setInputModeState(mode);
    setInputMode(mode);
  };

  const inputSection = (
    <View z={100} items="center" justify="center">
      {selectedContext && (
        <View width="100%" mb="$2">
          <ContextChip
            exercise={selectedContext}
            onClear={clearContext}
          />
        </View>
      )}
      {loading ? (
        <View height={176} items="center" justify="center">
          <Spinner size="large" color="$color" />
        </View>
      ) : inputMode === "voice" ? (
        <RecordButton
          startCallback={startRecording}
          stopCallback={handleStopRecording}
          cancelCallback={cancelRecording}
          durationMillis={recorderState.durationMillis}
          isRecording={recorderState.isRecording}
          disabled={recorderState.isPending}
        />
      ) : (
        <View width="100%">
          <RecordTextBox submitText={handleSubmitText} loading={loading} />
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={
        Platform.OS === "ios" || Platform.OS === "android" ? 90 : 0
      }
    >
      <View flex={1} bg="$background">
        {/* Toggle button at top right */}
        <View position="absolute" t="$4" r="$4" z={10}>
          <InputModeToggle
            mode={inputMode}
            onModeChange={handleModeChange}
            disabled={recorderState.isRecording || loading}
          />
        </View>

        {hasActiveWorkout ? (
          // Active workout layout: scrollable exercise list + pinned input
          <>
            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
            >
              <View pt="$8" pb="$4" px="$4" width="90%" $sm={{ width: "75%" }} $md={{ width: "65%" }} mx="auto">
                <H5 paddingInline="$3" mb="$3" opacity={0.7} fontWeight="600">
                  Current Workout{workoutDuration ? `  ·  ${workoutDuration}` : ""}
                </H5>
                <ExerciseList
                  exercises={currentWorkout.exercises}
                  onLogDeleted={handleLogDeleted}
                  contextExerciseId={selectedContext?.id}
                  onContextChange={setSelectedContext}
                />
              </View>
            </ScrollView>
            <View px="$4" pb="$4" pt="$2" width="90%" $sm={{ width: "75%" }} $md={{ width: "65%" }} mx="auto" z={100}>
              {inputSection}
            </View>
            <AnimatedBlurView
              animatedProps={animatedBlurProps}
              tint="dark"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50,
              }}
              pointerEvents={
                recorderState.isRecording || loading ? "auto" : "none"
              }
            />
          </>
        ) : (
          // Empty state: centered suggestions + input (original structure)
          <View flex={1} justify="center" items="center" px="$4">
            <YStack gap="$6" width="90%" $sm={{ width: "70%" }} $md={{ width: "60%" }}>
              <YStack gap="$2" items="center">
                {examplePrompts.map((prompt) => (
                  <Paragraph
                    key={prompt}
                    size="$3"
                    $sm={{ size: "$5" }}
                    opacity={0.5}
                    text="center"
                  >
                    "{prompt}"
                  </Paragraph>
                ))}
              </YStack>
              {inputSection}
            </YStack>
            <AnimatedBlurView
              animatedProps={animatedBlurProps}
              tint="dark"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50,
              }}
              pointerEvents={
                recorderState.isRecording || loading ? "auto" : "none"
              }
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
