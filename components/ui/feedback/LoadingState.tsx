import { Spinner, Text, YStack } from "tamagui";

interface LoadingStateProps {
  message?: string;
  size?: "small" | "large";
}

/**
 * Generic loading state component
 * Displays a spinner with optional message
 */
export function LoadingState({ message = "Loading...", size = "large" }: LoadingStateProps) {
  return (
    <YStack flex={1} items="center" justify="center">
      <Spinner size={size} />
      {message && (
        <Text mt="$4" opacity={0.6}>
          {message}
        </Text>
      )}
    </YStack>
  );
}
