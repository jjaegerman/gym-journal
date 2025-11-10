import { View } from "tamagui";
import type { SizeTokens } from "tamagui";

interface SpacerProps {
  size?: SizeTokens | number;
  horizontal?: boolean;
}

/**
 * Spacer component for adding space between elements
 */
export function Spacer({ size = "$4", horizontal = false }: SpacerProps) {
  if (horizontal) {
    return <View width={size as any} />;
  }
  return <View height={size as any} />;
}
