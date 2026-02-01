import { useState, useEffect } from "react";
import {
  Sheet,
  YStack,
  XStack,
  Text,
  Button,
  Checkbox,
  ScrollView,
  Separator,
  RadioGroup,
  Label,
} from "tamagui";
import { Check } from "@tamagui/lucide-icons";

interface FilterSheetProps {
  title: string;
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  singleSelect?: boolean;
}

export function FilterSheet({
  title,
  options,
  selected,
  onSelectionChange,
  open,
  onOpenChange,
  singleSelect = false,
}: FilterSheetProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  useEffect(() => {
    setLocalSelected(selected);
  }, [selected]);

  const toggleOption = (option: string) => {
    setLocalSelected((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const handleClear = () => {
    setLocalSelected([]);
  };

  const handleApply = () => {
    onSelectionChange(localSelected);
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      dismissOnSnapToBottom
      modal
      snapPoints={[60]}
    >
      <Sheet.Overlay opacity={0.5} />
      <Sheet.Handle />
      <Sheet.Frame>
        <YStack flex={1} p="$4" gap="$4">
          <XStack justify="space-between" items="center">
            <Text fontSize="$6" fontWeight="600">
              {title}
            </Text>
            {!singleSelect && (
              <Button size="$3" chromeless onPress={handleClear}>
                <Text color="$blue10">Clear</Text>
              </Button>
            )}
          </XStack>

          <Separator />

          <ScrollView flex={1}>
            {singleSelect ? (
              <RadioGroup
                value={localSelected[0] ?? ""}
                onValueChange={(value) => setLocalSelected([value])}
              >
                <YStack gap="$2">
                  {options.map((option, index) => {
                    const id = `radio-${index}`;
                    return (
                      <Label
                        key={option}
                        htmlFor={id}
                        flexDirection="row"
                        items="center"
                        gap="$3"
                        py="$3"
                        px="$2"
                        pressStyle={{ opacity: 0.7 }}
                        cursor="pointer"
                      >
                        <RadioGroup.Item value={option} id={id} size="$4">
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>
                        <Text fontSize="$4">{option}</Text>
                      </Label>
                    );
                  })}
                </YStack>
              </RadioGroup>
            ) : (
              <YStack gap="$2">
                {options.map((option) => {
                  const isSelected = localSelected.includes(option);
                  return (
                    <XStack
                      key={option}
                      items="center"
                      gap="$3"
                      py="$3"
                      px="$2"
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => toggleOption(option)}
                      cursor="pointer"
                      borderRadius="$3"
                      hoverStyle={{ bg: "$gray3" }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOption(option)}
                        size="$4"
                      >
                        <Checkbox.Indicator>
                          <Check size={16} />
                        </Checkbox.Indicator>
                      </Checkbox>
                      <Text fontSize="$4">{option}</Text>
                    </XStack>
                  );
                })}
              </YStack>
            )}
          </ScrollView>

          <Button size="$4" theme="accent" onPress={handleApply}>
            Apply
          </Button>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
