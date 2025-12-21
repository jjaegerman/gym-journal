import { XStack, Text } from "tamagui";
import { ArrowUp, ArrowDown } from "@tamagui/lucide-icons";

interface TrendIndicatorProps {
  current: number;
  previous: number;
  format?: (value: number) => string;
  invert?: boolean; // Set true for metrics where down is good (e.g., pace)
}

/**
 * Displays trend with arrow and colored value
 * Green = improvement, Red = decline
 */
export function TrendIndicator({
  current,
  previous,
  format = (v) => v.toFixed(1),
  invert = false,
}: TrendIndicatorProps) {
  const diff = current - previous;
  const isImprovement = invert ? diff < 0 : diff > 0;
  const isDecline = invert ? diff > 0 : diff < 0;

  if (diff === 0) {
    return (
      <Text fontSize="$2" opacity={0.5}>
        —
      </Text>
    );
  }

  const color = isImprovement ? "$green10" : isDecline ? "$red10" : "$gray10";
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  const prefix = diff > 0 ? "+" : "";

  return (
    <XStack gap="$1" items="center">
      <Icon size={12} color={color} />
      <Text fontSize="$2" color={color} fontWeight="600">
        {prefix}
        {format(diff)}
      </Text>
    </XStack>
  );
}
