import { Button, XStack, Text } from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons";

interface FilterChipProps {
  label: string;
  selectedCount?: number;
  active?: boolean;
  onPress: () => void;
}

export function FilterChip({ label, selectedCount = 0, active, onPress }: FilterChipProps) {
  const isActive = active ?? selectedCount > 0;
  const displayText = selectedCount > 0 ? `${label} (${selectedCount})` : label;

  return (
    <Button
      size="$3"
      $gtXs={{ size: "$5" }}
      chromeless={!isActive}
      bg={isActive ? "$blue4" : "$gray4"}
      pressStyle={{ opacity: 0.8 }}
      onPress={onPress}
      borderRadius="$10"
      px="$2.5"
    >
      <XStack gap="$1" items="center">
        <Text
          fontSize="$3"
          $gtXs={{ fontSize: "$5" }}
          fontWeight={isActive ? "600" : "400"}
          color={isActive ? "$blue11" : "$gray11"}
        >
          {displayText}
        </Text>
        <ChevronDown
          size="$1" $gtXs={{ size: "$1.5" }}
          color={isActive ? "$blue11" : "$gray11"}
        />
      </XStack>
    </Button>
  );
}
