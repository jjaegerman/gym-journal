import { useEffect } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Alert } from "react-native";

/**
 * Custom hook for audio recording functionality
 * Handles permissions, recording state, and audio configuration
 */
export function useAudioRecording() {
  const recordingOptions = RecordingPresets.HIGH_QUALITY;
  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert("Permission to access microphone was denied");
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: "mixWithOthers",
      });
    })();
  }, []);

  const startRecording = async () => {
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopRecording = async () => {
    await audioRecorder.stop();
    return audioRecorder.uri;
  };

  const cancelRecording = async () => {
    await audioRecorder.stop();
    // Don't return URI - this signals cancellation
  };

  return {
    audioRecorder,
    recorderState,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
