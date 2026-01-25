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

type RecordingState =
  | "idle"
  | "starting"
  | "recording"
  | "stopping"
  | "cancelling";

/**
 * Custom hook for audio recording functionality
 * Handles permissions, recording state, and audio configuration
 */
export function useAudioRecording() {
  const [state, setState] = useState<RecordingState>("idle");
  const [durationMillis, setDurationMillis] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  // For fallback (Android/web), use expo-audio
  const recordingOptions = RecordingPresets.HIGH_QUALITY;
  const audioRecorder = useAudioRecorder(recordingOptions);
  const expoRecorderState = useAudioRecorderState(audioRecorder);

  // Use native recording on iOS, expo-audio elsewhere
  const useNativeRecording =
    Platform.OS === "ios" && AudioSessionManager?.startRecording;

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

  // Update duration while recording
  useEffect(() => {
    if (state !== "recording") return;

    const interval = setInterval(() => {
      if (useNativeRecording && AudioSessionManager?.getRecordingDuration) {
        const duration = AudioSessionManager.getRecordingDuration();
        setDurationMillis(duration * 1000);
      } else {
        setDurationMillis(expoRecorderState.durationMillis);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state, useNativeRecording, expoRecorderState.durationMillis]);

  const startRecording = async () => {
    if (state !== "idle") return;

    setState("starting");
    setDurationMillis(0);

    try {
      if (useNativeRecording && AudioSessionManager) {
        const uri = await AudioSessionManager.startRecording();
        if (uri) {
          setRecordingUri(uri);
          setState("recording");
        } else {
          setState("idle");
          console.error("Failed to start native recording");
        }
      } else {
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setState("recording");
      }
    } catch (error) {
      setState("idle");
      console.error("Failed to start recording:", error);
      throw error;
    }
  };

  const stopRecording = async () => {
    if (state !== "recording") return;

    setState("stopping");

    try {
      if (useNativeRecording && AudioSessionManager) {
        const uri = await AudioSessionManager.stopRecording();
        setState("idle");
        setDurationMillis(0);
        return uri;
      } else {
        await audioRecorder.stop();
        setState("idle");
        setDurationMillis(0);
        return audioRecorder.uri;
      }
    } catch (error) {
      setState("idle");
      setDurationMillis(0);
      console.error("Failed to stop recording:", error);
    }
  };

  const cancelRecording = async () => {
    if (state !== "recording") return;

    setState("cancelling");

    try {
      if (useNativeRecording && AudioSessionManager) {
        await AudioSessionManager.stopRecording();
      } else {
        await audioRecorder.stop();
      }
    } catch (error) {
      console.error("Failed to cancel recording:", error);
    } finally {
      setState("idle");
      setDurationMillis(0);
    }
  };

  // Derive booleans from state for consumers
  const isRecording =
    state === "starting" || state === "recording" || state === "stopping";
  const isPending =
    state === "starting" || state === "stopping" || state === "cancelling";

  console.log("[useAudioRecording] state:", state, "isRecording:", isRecording);

  return {
    audioRecorder,
    recorderState: {
      isRecording,
      durationMillis,
      isPending,
    },
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
