import { Platform } from "react-native";
import { File } from "expo-file-system";

/**
 * Converts an audio file URI to a base64 encoded string
 * @param uri - The file URI to convert
 * @returns Promise<string> - Base64 encoded string without data URL prefix
 */
export async function audioFileToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    // Web environment
    const response = await fetch(uri);
    const blob = await response.blob();
    return await blobToBase64(blob);
  } else {
    // Native (iOS / Android)
    // Using the new expo-file-system v19+ File API
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();
    // Convert ArrayBuffer to base64
    return arrayBufferToBase64(arrayBuffer);
  }
}

/**
 * Converts a Blob to base64 string (web only)
 * @param blob - The Blob to convert
 * @returns Promise<string> - Base64 encoded string without data URL prefix
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        // Strip "data:*/*;base64," prefix
        resolve(result.split(",")[1]);
      } else {
        reject(
          new Error("Failed to convert blob to base64: result is not a string")
        );
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read blob"));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts an ArrayBuffer to base64 string (native only)
 * @param buffer - The ArrayBuffer to convert
 * @returns string - Base64 encoded string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
