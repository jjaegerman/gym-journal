import { Button, XStack, Text } from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons";

interface FilterChipProps {
  label: string;
  selectedCount: number;
  onPress: () => void;
}

export function FilterChip({ label, selectedCount, onPress }: FilterChipProps) {
  const isActive = selectedCount > 0;
  const displayText = isActive ? `${label} (${selectedCount})` : label;

  return (
    <Button
      size="$3"
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
          fontWeight={isActive ? "600" : "400"}
          color={isActive ? "$blue11" : "$gray11"}
        >
          {displayText}
        </Text>
        <ChevronDown
          size={14}
          color={isActive ? "$blue11" : "$gray11"}
        />
      </XStack>
    </Button>
  );
}
