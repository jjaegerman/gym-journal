import { View, YStack } from "tamagui";
import { ReactNode } from "react";

interface ScreenProps {
  children: ReactNode;
  centered?: boolean;
  flex?: boolean | number;
}

/**
 * Standard screen layout component
 * Provides consistent spacing and background
 */
export function Screen({ children, centered = false, flex = true }: ScreenProps) {
  if (centered) {
    return (
      <View flex={flex ? 1 : undefined} justify="center" bg="$background">
        {children}
      </View>
    );
  }

  return (
    <YStack flex={flex ? 1 : undefined} bg="$background">
      {children}
    </YStack>
  );
}
