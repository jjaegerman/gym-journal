import { RecordButton } from "./RecordButton";
import { RecordTextBox } from "./RecordTextBox";
import { SizableText, useTheme, View, YStack } from "tamagui";
import { useAudioRecording, useExerciseSubmit } from "@/lib/hooks";

/**
 * Recording Screen Component
 * Allows users to log exercises via audio recording or text input
 */
export function RecordingScreen() {
  const theme = useTheme();
  const { startRecording, stopRecording } = useAudioRecording();
  const { submitAudio } = useExerciseSubmit();

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri) {
      await submitAudio(uri);
    }
  };

  return (
    <View flex={1} justify="center">
      <YStack height="90%" items="center" justify="center" gap="$4">
        <YStack items="center" justify="center" flex={1} gap="$3">
          <SizableText fontSize="$6">Record an Exercise Log</SizableText>
          <YStack items="center">
            <SizableText color={theme.placeholderColor}>
              "10 repetitions of bench press at 135 pounds"
            </SizableText>
            <SizableText color={theme.placeholderColor}>
              "3 sets of squats with 185 pounds for 8 repetitions each"
            </SizableText>
            <SizableText color={theme.placeholderColor}>
              "30 minutes of cycling at moderate effort"
            </SizableText>
          </YStack>
        </YStack>
        <RecordButton
          startCallback={startRecording}
          stopCallback={handleStopRecording}
        />
        <RecordTextBox />
      </YStack>
    </View>
  );
}
