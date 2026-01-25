import AsyncStorage from "@react-native-async-storage/async-storage";

const INPUT_MODE_KEY = "input_mode_preference";

export type InputMode = "voice" | "text";

export async function getInputMode(): Promise<InputMode> {
  const value = await AsyncStorage.getItem(INPUT_MODE_KEY);
  return (value as InputMode) || "voice";
}

export async function setInputMode(mode: InputMode): Promise<void> {
  await AsyncStorage.setItem(INPUT_MODE_KEY, mode);
}
