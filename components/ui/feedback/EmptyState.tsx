import { Text, YStack } from "tamagui";
import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

/**
 * Generic empty state component
 * Used when lists or collections have no items
 */
export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <YStack items="center" gap="$4" p="$6">
      {icon && <YStack mb="$2">{icon}</YStack>}
      <Text fontSize="$6" opacity={0.6}>
        {title}
      </Text>
      {description && (
        <Text fontSize="$3" opacity={0.5} text="center" width="80%">
          {description}
        </Text>
      )}
    </YStack>
  );
}
