import { RecordButton } from "./RecordButton";
import { RecordTextBox } from "./RecordTextBox";
import { Paragraph, View, YStack, XStack, Separator } from "tamagui";
import { useAudioRecording, useExerciseSubmit } from "@/lib/hooks";

/**
 * Recording Screen Component
 * Allows users to log exercises via audio recording or text input
 */
export function RecordingScreen() {
  const { startRecording, stopRecording } = useAudioRecording();
  const { submitAudio } = useExerciseSubmit();

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri) {
      await submitAudio(uri);
    }
  };

  return (
    <View flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$4">
      <YStack gap="$6" maxWidth={500} width="100%">
        {/* Examples */}
        <YStack gap="$2" alignItems="center">
          <Paragraph size="$3" opacity={0.6} textAlign="center">
            10 reps at 135 lbs
          </Paragraph>
          <Paragraph size="$3" opacity={0.6} textAlign="center">
            3 sets of squats, 8 reps, 185 lbs
          </Paragraph>
          <Paragraph size="$3" opacity={0.6} textAlign="center">
            Ran for 30 minutes
          </Paragraph>
        </YStack>

        {/* Voice Recording */}
        <RecordButton
          startCallback={startRecording}
          stopCallback={handleStopRecording}
        />

        {/* Divider */}
        <XStack alignItems="center" gap="$3">
          <Separator flex={1} />
          <Paragraph size="$2" opacity={0.5}>or</Paragraph>
          <Separator flex={1} />
        </XStack>

        {/* Text Input */}
        <RecordTextBox />
      </YStack>
    </View>
  );
}
