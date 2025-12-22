import { useEffect } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Alert, Platform } from "react-native";
import { AudioSessionManager } from "audio-session-manager";

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

      // On Android/web, configure using expo-audio
      if (Platform.OS !== "ios") {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          interruptionMode: "mixWithOthers",
        });
      }
    })();
  }, []);

  const startRecording = async () => {
    // On iOS development builds, use native module for proper AVAudioSession configuration
    // This allows recording without interrupting background music (like Spotify)
    if (Platform.OS === "ios" && AudioSessionManager?.configureForRecording) {
      const success = AudioSessionManager.configureForRecording();
      if (!success) {
        console.warn(
          "Failed to configure iOS audio session, falling back to expo-audio"
        );
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          interruptionMode: "mixWithOthers",
        });
      }
    } else {
      // Fallback for: Android, web, or iOS in Expo Go (when native module unavailable)
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: "mixWithOthers",
      });
    }

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
