import { RecordButton } from "./RecordButton";
import { RecordTextBox } from "./RecordTextBox";
import { Paragraph, View, YStack, XStack, Separator, Spinner } from "tamagui";
import { useAudioRecording, useExerciseSubmit } from "@/lib/hooks";
import { useTabContext } from "@/lib/context/TabContext";
import { useEffect } from "react";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";

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

              {/* Voice Recording Button or Spinner - always visible with z-index */}
              <View z={100} items="center" justify="center">
                {loading ? (
                  <View height={176} items="center" justify="center">
                    <Spinner size="large" color="$color" />
                  </View>
                ) : (
                  <RecordButton
                    startCallback={startRecording}
                    stopCallback={handleStopRecording}
                    cancelCallback={cancelRecording}
                    durationMillis={recorderState.durationMillis}
                  />
                )}
              </View>

              {/* Divider */}
              <XStack items="center" gap="$3">
                <Separator flex={1} />
                <Paragraph size="$2" opacity={0.5}>
                  or
                </Paragraph>
                <Separator flex={1} />
              </XStack>
            </YStack>
          </View>

          {/* Text Input - Fixed at bottom */}
          <View
            position="absolute"
            b={0}
            l={0}
            r={0}
            px="$4"
            pb="$4"
            pt="$2"
            background="$background"
            maxW={500}
            width="100%"
            self="center"
          >
            <RecordTextBox submitText={submitText} loading={loading} />
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
