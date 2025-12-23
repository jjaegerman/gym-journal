import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

// Type definition for the native module
interface AudioSessionManagerModule {
  startRecording(): Promise<string | null>;
  stopRecording(): Promise<string | null>;
  getRecordingDuration(): number;
  isRecording(): boolean;
}

// Only load the native module on iOS
let AudioSessionManager: AudioSessionManagerModule | null = null;

if (Platform.OS === "ios") {
  try {
    AudioSessionManager = requireNativeModule("AudioSessionManager");
  } catch (error) {
    console.warn("AudioSessionManager native module not available:", error);
  }
}

export { AudioSessionManager };
export type { AudioSessionManagerModule };
