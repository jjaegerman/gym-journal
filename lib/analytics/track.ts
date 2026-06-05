import PostHog from "posthog-react-native";

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const posthog = apiKey
  ? new PostHog(apiKey, { host })
  : null;

export type FeatureEvent =
  | "auth_signed_in"
  | "auth_signed_up"
  | "workout_recorded"
  | "set_added_manually"
  | "set_deleted"
  | "workout_viewed"
  | "stats_viewed"
  | "workout_shared"
  | "filter_applied";

export function track(
  event: FeatureEvent,
  properties?: Record<string, any>,
) {
  posthog?.capture(event, properties);
}
