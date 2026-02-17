import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_LAST_CATEGORY_KEY = "stats_last_category";

export async function getLastCategory(): Promise<string | null> {
  return AsyncStorage.getItem(STATS_LAST_CATEGORY_KEY);
}

export async function setLastCategory(category: string): Promise<void> {
  await AsyncStorage.setItem(STATS_LAST_CATEGORY_KEY, category);
}
