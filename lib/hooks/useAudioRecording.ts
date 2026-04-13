import { useEffect, useRef, useState } from "react";
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

  // Use expo-audio on all platforms (native module disabled for testing)
  const useNativeRecording = Platform.OS === "ios" &&
    AudioSessionManager?.startRecording;

  const audioSetupDoneRef = useRef(false);

  const ensureAudioSetup = async () => {
    if (audioSetupDoneRef.current || useNativeRecording) return true;
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) return false;
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
      shouldRouteThroughEarpiece: true,
    });
    audioSetupDoneRef.current = true;
    return true;
  };

  // Eagerly set up audio on Android (not web — avoids microphone prompt on share pages)
  useEffect(() => {
    if (!useNativeRecording && Platform.OS !== 'web') {
      ensureAudioSetup();
    }
  }, [useNativeRecording]);

  // Keep a ref to expo recorder state so the interval can read it without restarting
  const expoRecorderStateRef = useRef(expoRecorderState);
  expoRecorderStateRef.current = expoRecorderState;

  // Update duration while recording
  useEffect(() => {
    if (state !== "recording") return;

    const interval = setInterval(() => {
      if (useNativeRecording && AudioSessionManager?.getRecordingDuration) {
        const duration = AudioSessionManager.getRecordingDuration();
        setDurationMillis(duration * 1000);
      } else {
        setDurationMillis(expoRecorderStateRef.current.durationMillis);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state, useNativeRecording]);

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
          throw new Error(
            "Could not access microphone. It may be in use by another app.",
          );
        }
      } else {
        const granted = await ensureAudioSetup();
        if (!granted) {
          setState("idle");
          Alert.alert("Permission to access microphone was denied");
          return;
        }
        await audioRecorder.prepareToRecordAsync();
        await audioRecorder.record();
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
  const isRecording = state === "starting" || state === "recording" ||
    state === "stopping";
  const isPending = state === "starting" || state === "stopping" ||
    state === "cancelling";

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
