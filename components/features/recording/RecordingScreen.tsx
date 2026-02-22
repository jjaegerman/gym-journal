import { RecordButton } from "./RecordButton";
import { RecordTextBox } from "./RecordTextBox";
import { InputModeToggle } from "./InputModeToggle";
import { H5, Paragraph, View, YStack, Spinner } from "tamagui";
import {
  useAudioRecording,
  useExerciseSubmit,
  useCurrentWorkout,
} from "@/lib/hooks";
import { useTabContext } from "@/lib/context/TabContext";
import { useEffect, useState, useMemo } from "react";
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
import { formatDuration } from "@/lib/utils";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export function RecordingScreen() {
  const { startRecording, stopRecording, cancelRecording, recorderState } =
    useAudioRecording();
  const { currentWorkout, refetch } = useCurrentWorkout();
  const { submitAudio, submitText, loading } = useExerciseSubmit(refetch);
  const { setTabsDisabled } = useTabContext();
  const blurIntensity = useSharedValue(0);
  const [inputMode, setInputModeState] = useState<InputMode>("voice");
  const examplePrompts = useMemo(() => getRandomPrompts(3), []);

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

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri) {
      await submitAudio(uri);
    }
  };

  const handleModeChange = (mode: InputMode) => {
    setInputModeState(mode);
    setInputMode(mode);
  };

  const inputSection = (
    <View z={100} items="center" justify="center">
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
          <RecordTextBox submitText={submitText} loading={loading} />
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
              contentContainerStyle={{
                paddingTop: 16,
                paddingBottom: 16,
                paddingHorizontal: 16,
              }}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
            >
              <View maxW={600} width="100%" mx="auto">
                <H5 paddingInline="$3" mb="$3" opacity={0.7} fontWeight="600">
                  Current Workout{workoutDuration ? `  ·  ${workoutDuration}` : ""}
                </H5>
                <ExerciseList
                  exercises={currentWorkout.exercises}
                  onLogDeleted={refetch}
                />
              </View>
            </ScrollView>
            <View px="$4" pb="$4" pt="$2" maxW={600} width="100%" mx="auto" z={100}>
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
            <YStack gap="$6" maxW={500} width="100%">
              <YStack gap="$2" items="center">
                {examplePrompts.map((prompt) => (
                  <Paragraph
                    key={prompt}
                    size="$3"
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

