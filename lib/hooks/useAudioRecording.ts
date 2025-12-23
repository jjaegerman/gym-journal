import { useEffect, useState } from "react";
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
  // For iOS with native module, use our own state
  const [isRecording, setIsRecording] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  // For fallback (Android/web), use expo-audio
  const recordingOptions = RecordingPresets.HIGH_QUALITY;
  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder);

  // Use native recording on iOS, expo-audio elsewhere
  const useNativeRecording = Platform.OS === "ios" &&
    AudioSessionManager?.startRecording;

  console.log("Using native recording:", useNativeRecording);
  console.log(AudioSessionManager ?? "AudioSessionManager not available");
  console.log(
    AudioSessionManager?.startRecording ?? "startRecording not available",
  );

  useEffect(() => {
    (async () => {
      // Only configure expo-audio for non-iOS platforms
      // iOS audio session is configured at app root level
      if (!useNativeRecording) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert("Permission to access microphone was denied");
        }
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          interruptionMode: "mixWithOthers",
        });
      }
    })();
  }, [useNativeRecording]);

  // Update duration for native recording
  useEffect(() => {
    if (!useNativeRecording || !isRecording) return;

    const interval = setInterval(() => {
      if (AudioSessionManager?.getRecordingDuration) {
        const duration = AudioSessionManager.getRecordingDuration();
        setDurationMillis(duration * 1000); // Convert to milliseconds
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, useNativeRecording]);

  const startRecording = async () => {
    if (useNativeRecording && AudioSessionManager) {
      console.log("🎙️ Starting native recording...");
      const uri = await AudioSessionManager.startRecording();
      if (uri) {
        setIsRecording(true);
        setRecordingUri(uri);
        setDurationMillis(0);
        console.log("✅ Native recording started");
      } else {
        console.error("❌ Failed to start native recording");
      }
    } else {
      console.log("📱 Preparing expo-audio recording...");
      await audioRecorder.prepareToRecordAsync();
      console.log("🎙️ Starting expo-audio recording...");
      audioRecorder.record();
    }
  };

  const stopRecording = async () => {
    if (useNativeRecording && AudioSessionManager) {
      console.log("⏹️ Stopping native recording...");
      const uri = await AudioSessionManager.stopRecording();
      setIsRecording(false);
      setDurationMillis(0);
      console.log("✅ Native recording stopped:", uri);
      return uri;
    } else {
      await audioRecorder.stop();
      console.log("⏹️ Stopped expo-audio recording");
      return audioRecorder.uri;
    }
  };

  const cancelRecording = async () => {
    if (useNativeRecording && AudioSessionManager) {
      await AudioSessionManager.stopRecording();
      setIsRecording(false);
      setDurationMillis(0);
      console.log("❌ Cancelled native recording");
    } else {
      await audioRecorder.stop();
      console.log("❌ Cancelled expo-audio recording");
    }
  };

  return {
    audioRecorder,
    recorderState: useNativeRecording
      ? { isRecording, durationMillis }
      : recorderState,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
