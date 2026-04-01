import React, { useRef, useEffect } from "react";
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
  useMedia,
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
  const committedRef = useRef(false);
  const media = useMedia();

  useEffect(() => {
    if (open) committedRef.current = false;
  }, [open]);

  const handleToggle = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((o) => o !== option)
      : [...selected, option];
    onSelectionChange(next);
  };

const handleClear = () => {
    onSelectionChange([]);
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
            <Text fontSize="$6" $sm={{ fontSize: "$8" }} fontWeight="600">
              {title}
            </Text>
            {!singleSelect && (
              <Button size="$3" $sm={{ size: "$5" }} chromeless onPress={handleClear}>
                <Text color="$blue10" fontSize="$3" $sm={{ fontSize: "$5" }}>Clear</Text>
              </Button>
            )}
          </XStack>

          <Separator />

          <ScrollView flex={1}>
            {singleSelect ? (
              <RadioGroup
                value={selected[0] ?? ""}
                onValueChange={(value) => {
                  if (committedRef.current) return;
                  committedRef.current = true;
                  onSelectionChange([value]);
                  onOpenChange(false);
                }}
              >
                <YStack gap="$2">
                  {options.map((option, index) => {
                    const id = `radio-${index}`;
                    return (
                      <XStack
                        key={option}
                        items="center"
                        gap="$3"
                        py="$3"
                        px="$2"
                        pressStyle={{ opacity: 0.7 }}
                        onPress={() => {
                          if (committedRef.current) return;
                          committedRef.current = true;
                          onSelectionChange([option]);
                          onOpenChange(false);
                        }}
                        cursor="pointer"
                        borderRadius="$3"
                        hoverStyle={{ bg: "$gray3" }}
                      >
                        <RadioGroup.Item value={option} id={id} size="$4" $sm={{ size: "$6" }}>
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>
                        <Text fontSize="$4" $sm={{ fontSize: "$6" }}>{option}</Text>
                      </XStack>
                    );
                  })}
                </YStack>
              </RadioGroup>
            ) : (
              <YStack gap="$2">
                {options.map((option) => {
                  const isSelected = selected.includes(option);
                  return (
                    <XStack
                      key={option}
                      items="center"
                      gap="$3"
                      py="$3"
                      px="$2"
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => handleToggle(option)}
                      cursor="pointer"
                      borderRadius="$3"
                      hoverStyle={{ bg: "$gray3" }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(option)}
                        size="$4"
                        $sm={{ size: "$6" }}
                      >
                        <Checkbox.Indicator>
                          <Check size="$1" $sm={{ size: "$2" }} />
                        </Checkbox.Indicator>
                      </Checkbox>
                      <Text fontSize="$4" $sm={{ fontSize: "$6" }}>{option}</Text>
                    </XStack>
                  );
                })}
              </YStack>
            )}
          </ScrollView>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
