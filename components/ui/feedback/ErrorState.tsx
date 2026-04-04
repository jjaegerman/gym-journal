import { Text, YStack, Button } from "tamagui";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/**
 * Generic error state component
 * Displays error information with optional retry button
 */
export function ErrorState({
  title = "Error",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <YStack flex={1} items="center" justify="center" p="$6" gap="$4">
      <Text color="$red10" fontSize="$5">
        {title}
      </Text>
      <Text fontSize="$3" color="$color10" text="center" width="80%">
        {message}
      </Text>
      {onRetry && (
        <Button onPress={onRetry}>
          Try Again
        </Button>
      )}
    </YStack>
  );
}
