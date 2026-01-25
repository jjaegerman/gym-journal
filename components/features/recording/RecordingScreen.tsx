import { RecordButton } from "./RecordButton";
import { RecordTextBox } from "./RecordTextBox";
import { InputModeToggle } from "./InputModeToggle";
import { Paragraph, View, YStack, Spinner } from "tamagui";
import { useAudioRecording, useExerciseSubmit } from "@/lib/hooks";
import { useTabContext } from "@/lib/context/TabContext";
import { useEffect, useState } from "react";
import { BlurView } from "expo-blur";
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

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * Recording Screen Component
 * Allows users to log exercises via audio recording or text input
 */
export function RecordingScreen() {
  const { startRecording, stopRecording, cancelRecording, recorderState } =
    useAudioRecording();
  const { submitAudio, submitText, loading } = useExerciseSubmit();
  const { setTabsDisabled } = useTabContext();
  const blurIntensity = useSharedValue(0);
  const [inputMode, setInputModeState] = useState<InputMode>("voice");

  // Load persisted input mode on mount
  useEffect(() => {
    getInputMode().then(setInputModeState);
  }, []);

  // Disable tabs while recording or loading
  useEffect(() => {
    const isActive = recorderState.isRecording || loading;
    setTabsDisabled(isActive);
    // Animate blur intensity in/out
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={
        Platform.OS === "ios" || Platform.OS === "android" ? 90 : 0
      }
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
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

          {/* Centered content container */}
          <View flex={1} justify="center" items="center" px="$4">
            <YStack gap="$6" maxW={500} width="100%">
              {/* Examples */}
              <YStack gap="$2" items="center">
                <Paragraph size="$3" opacity={0.5} text="center">
                  "10 reps of bench press at 135 lbs"
                </Paragraph>
                <Paragraph size="$3" opacity={0.5} text="center">
                  "3 sets of squats, 8 reps, 185 lbs"
                </Paragraph>
                <Paragraph size="$3" opacity={0.5} text="center">
                  "Ran for 30 minutes"
                </Paragraph>
              </YStack>

              {/* Input method based on mode */}
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
            </YStack>
          </View>

          {/* Blur overlay - intensity animates in/out */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
