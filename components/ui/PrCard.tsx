import { Card, YStack, XStack, Text, Paragraph, Theme } from "tamagui";
import { ChevronRight } from "@tamagui/lucide-icons";
import { ReactNode } from "react";

interface PrCardProps {
  /** Leading icon (Trophy, Plus, etc.) sized appropriately for the title row. */
  icon: ReactNode;
  /** Section/type label, e.g. "Weight PR", "Reps PR", "New Movement". */
  title: string;
  /** Exercise name. Hidden when omitted (e.g. new-movement cards repurpose `primary`). */
  subtitle?: string;
  /** Hero value, e.g. "225 lbs", "8:32 /mi", or the exercise name for new movements. */
  primary: string;
  /** Smaller font for the primary value (used for new-movement cards where it's a name). */
  primarySmall?: boolean;
  /** Optional improvement pill, e.g. "+25 lbs". */
  delta?: string;
  /** Human date label, e.g. "3d ago" or "Mar 12, 2026". */
  dateLabel: string;
  /** Either a fixed pixel width (horizontal scroll cards) or flex:1 (grid cells). */
  width?: number | string;
  flex?: number;
  /** Tap handler. When undefined the chevron is hidden and the card is non-pressable. */
  onPress?: () => void;
}

/**
 * Shared PR presentation card used by both Profile and Stats pages.
 * Wraps itself in the accent theme so it can be dropped in anywhere.
 */
export function PrCard({
  icon,
  title,
  subtitle,
  primary,
  primarySmall,
  delta,
  dateLabel,
  width,
  flex,
  onPress,
}: PrCardProps) {
  return (
    <Theme name="accent">
      <Card
        bordered
        bg="$color3"
        borderRadius="$4"
        p="$3"
        width={width as any}
        flex={flex}
        pressStyle={onPress ? { opacity: 0.8 } : undefined}
        cursor={onPress ? "pointer" : undefined}
        onPress={onPress}
      >
        <YStack gap="$2" flex={1}>
          <XStack gap="$2" items="center">
            {icon}
            <Text fontSize="$2" $sm={{ fontSize: "$4" }} color="$color11" fontWeight="600">
              {title}
            </Text>
            <XStack flex={1} />
            {onPress && <ChevronRight size={14} color="$color11" />}
          </XStack>
          {subtitle && (
            <Paragraph size="$3" color="$color11" numberOfLines={1}>
              {subtitle}
            </Paragraph>
          )}
          <Text
            fontSize={primarySmall ? "$5" : "$7"}
            $sm={{ fontSize: primarySmall ? "$6" : "$9" }}
            fontWeight="700"
            color="$color12"
            numberOfLines={1}
          >
            {primary}
          </Text>
          <XStack gap="$2" items="center">
            {delta && (
              <XStack bg="$color4" px="$2" py="$1" br="$2">
                <Text fontSize="$1" color="$color12" fontWeight="600">
                  {delta}
                </Text>
              </XStack>
            )}
            <Paragraph size="$1" $sm={{ size: "$4" }} color="$color11">
              {dateLabel}
            </Paragraph>
          </XStack>
        </YStack>
      </Card>
    </Theme>
  );
}
