import { RecordButton } from "components/RecordButton";
import { RecordTextBox } from "components/RecordTextBox";
import { SizableText, Text, useTheme, View, YStack } from "tamagui";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";
import { Platform } from "expo-modules-core";
import { supabase } from "lib/supabase";
import { useEffect } from "react";
import { Alert } from "react-native";
import { audioFileToBase64 } from "@/lib/utils";

export default function TabTwoScreen() {
  const theme = useTheme();

  const recordingOptions = RecordingPresets.HIGH_QUALITY;
  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder);

  const callFunction = async () => {
    const base64Audio = await audioFileToBase64(audioRecorder.uri!);
    const fileExtension =
      Platform.OS === "web"
        ? "webm"
        : audioRecorder.uri?.split(".").pop() || "webm";
    const fileName = "audio." + fileExtension;

    const { data, error } = await supabase.functions.invoke("openai", {
      body: {
        audio: {
          fileExtension: fileExtension,
          fileName: fileName,
          base64: base64Audio,
        },
      },
    });

    if (error) {
      console.error("Error calling function:", error);
      return;
    }

    console.log("Function response data:", data);
  };

  const record = async () => {
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopRecording = async () => {
    // The recording will be available on `audioRecorder.uri`.
    await audioRecorder.stop();
    await callFunction();
  };

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert("Permission to access microphone was denied");
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

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
        <RecordButton startCallback={record} stopCallback={stopRecording} />
        <RecordTextBox />
      </YStack>
    </View>
  );
}
