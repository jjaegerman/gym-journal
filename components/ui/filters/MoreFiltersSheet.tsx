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
  useMedia,
} from "tamagui";
import { Check } from "@tamagui/lucide-icons";

interface FilterSection {
  title: string;
  options: string[];
  selected: string[];
}

interface MoreFiltersSheetProps {
  sections: FilterSection[];
  onChange: (sectionIndex: number, selected: string[]) => void;
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoreFiltersSheet({
  sections,
  onChange,
  onClear,
  open,
  onOpenChange,
}: MoreFiltersSheetProps) {
  const committedRef = useRef(false);
  const media = useMedia();

  useEffect(() => {
    if (open) committedRef.current = false;
  }, [open]);

  const totalSelected = sections.reduce((sum, s) => sum + s.selected.length, 0);

  const handleToggle = (sectionIndex: number, option: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const current = sections[sectionIndex].selected;
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    onChange(sectionIndex, next);
    setTimeout(() => {
      committedRef.current = false;
    }, 400);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      dismissOnSnapToBottom
      modal
      snapPoints={[70]}
    >
      <Sheet.Overlay opacity={0.5} />
      <Sheet.Handle />
      <Sheet.Frame>
        <YStack flex={1} p="$4" gap="$4">
          <XStack justify="space-between" items="center">
            <Text fontSize="$6" $gtXs={{ fontSize: "$8" }} fontWeight="600">
              Filter
            </Text>
            {totalSelected > 0 && (
              <Button size="$3" $gtXs={{ size: "$5" }} chromeless onPress={onClear}>
                <Text color="$blue10" fontSize="$3" $gtXs={{ fontSize: "$5" }}>Clear</Text>
              </Button>
            )}
          </XStack>

          <Separator />

          <ScrollView flex={1}>
            <YStack gap="$4">
              {sections.map((section, sectionIndex) => (
                <YStack key={section.title} gap="$2">
                  <Text fontSize="$4" $gtXs={{ fontSize: "$6" }} fontWeight="600" color="$gray11" px="$2">
                    {section.title}
                  </Text>
                  {section.options.map((option) => {
                    const isSelected = section.selected.includes(option);
                    return (
                      <XStack
                        key={option}
                        items="center"
                        gap="$3"
                        py="$3"
                        px="$2"
                        pressStyle={{ opacity: 0.7 }}
                        onPress={() => handleToggle(sectionIndex, option)}
                        cursor="pointer"
                        borderRadius="$3"
                        hoverStyle={{ bg: "$gray3" }}
                      >
                        <Checkbox
                          checked={isSelected}
                          size="$4"
                          $gtXs={{ size: "$6" }}
                        >
                          <Checkbox.Indicator>
                            <Check size="$1" $gtXs={{ size: "$2" }} />
                          </Checkbox.Indicator>
                        </Checkbox>
                        <Text fontSize="$4" $gtXs={{ fontSize: "$6" }}>{option}</Text>
                      </XStack>
                    );
                  })}
                  {sectionIndex < sections.length - 1 && <Separator mt="$2" />}
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
