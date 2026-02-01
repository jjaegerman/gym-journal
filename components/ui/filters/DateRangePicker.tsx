import { useState } from "react";
import { Platform } from "react-native";
import { Sheet, YStack, XStack, Text, Button, Separator } from "tamagui";
import { Check, Calendar } from "@tamagui/lucide-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

export type DateRangePreset = "all_time" | "7_days" | "30_days" | "3_months" | "custom";

interface DateRangeOption {
  value: DateRangePreset;
  label: string;
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: "all_time", label: "All time" },
  { value: "7_days", label: "Last 7 days" },
  { value: "30_days", label: "Last 30 days" },
  { value: "3_months", label: "Last 3 months" },
  { value: "custom", label: "Custom" },
];

export interface DateRangeValue {
  preset?: DateRangePreset;
  from?: Date;
  to?: Date;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DateRangePicker({
  value,
  onChange,
  open,
  onOpenChange,
}: DateRangePickerProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === "custom") {
      // When selecting custom, keep current dates or set defaults
      const defaultFrom = value.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const defaultTo = value.to ?? new Date();
      onChange({ preset: "custom", from: defaultFrom, to: defaultTo });
    } else {
      const range = getDateRangeFromPreset(preset);
      onChange({ preset, from: range.from, to: range.to });
      onOpenChange(false);
    }
  };

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "set" && date) {
      onChange({ preset: "custom", from: date, to: value.to ?? new Date() });
    }
    // Close picker after interaction on both platforms
    setShowStartPicker(false);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "set" && date) {
      onChange({ preset: "custom", from: value.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: date });
    }
    setShowEndPicker(false);
  };

  const handleDone = () => {
    setShowStartPicker(false);
    setShowEndPicker(false);
    onOpenChange(false);
  };

  const currentPreset = value.preset ?? "all_time";
  const isCustom = currentPreset === "custom";

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Select";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      dismissOnSnapToBottom
      modal
      snapPoints={isCustom ? [65] : [45]}
    >
      <Sheet.Overlay opacity={0.5} />
      <Sheet.Handle />
      <Sheet.Frame>
        <YStack flex={1} p="$4" gap="$4">
          <Text fontSize="$6" fontWeight="600">
            Date Range
          </Text>

          <Separator />

          <YStack gap="$1">
            {DATE_RANGE_OPTIONS.map((option) => {
              const isSelected = currentPreset === option.value;
              return (
                <XStack
                  key={option.value}
                  items="center"
                  justify="space-between"
                  py="$3"
                  px="$2"
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => handlePresetSelect(option.value)}
                  cursor="pointer"
                  borderRadius="$3"
                  bg={isSelected ? "$blue3" : undefined}
                  hoverStyle={{ bg: isSelected ? "$blue3" : "$gray3" }}
                >
                  <Text
                    fontSize="$4"
                    fontWeight={isSelected ? "600" : "400"}
                    color={isSelected ? "$blue11" : "$color"}
                  >
                    {option.label}
                  </Text>
                  {isSelected && <Check size={20} color="$blue10" />}
                </XStack>
              );
            })}
          </YStack>

          {isCustom && (
            <>
              <Separator />
              <YStack gap="$3">
                <XStack gap="$3" justify="space-between">
                  <YStack flex={1} gap="$2">
                    <Text fontSize="$2" color="$gray11">
                      Start date
                    </Text>
                    <Button
                      size="$4"
                      bg="$gray4"
                      borderRadius="$3"
                      onPress={() => {
                        setShowStartPicker(true);
                        setShowEndPicker(false);
                      }}
                      icon={<Calendar size={16} color="$gray11" />}
                    >
                      <Text fontSize="$3" color="$color">
                        {formatDate(value.from)}
                      </Text>
                    </Button>
                  </YStack>
                  <YStack flex={1} gap="$2">
                    <Text fontSize="$2" color="$gray11">
                      End date
                    </Text>
                    <Button
                      size="$4"
                      bg="$gray4"
                      borderRadius="$3"
                      onPress={() => {
                        setShowEndPicker(true);
                        setShowStartPicker(false);
                      }}
                      icon={<Calendar size={16} color="$gray11" />}
                    >
                      <Text fontSize="$3" color="$color">
                        {formatDate(value.to)}
                      </Text>
                    </Button>
                  </YStack>
                </XStack>

                {showStartPicker && Platform.OS === "ios" && (
                  <YStack bg="$gray3" borderRadius="$3" p="$2">
                    <DateTimePicker
                      value={value.from ?? new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleStartDateChange}
                      maximumDate={value.to ?? new Date()}
                    />
                  </YStack>
                )}

                {showEndPicker && Platform.OS === "ios" && (
                  <YStack bg="$gray3" borderRadius="$3" p="$2">
                    <DateTimePicker
                      value={value.to ?? new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleEndDateChange}
                      minimumDate={value.from}
                      maximumDate={new Date()}
                    />
                  </YStack>
                )}

                {showStartPicker && Platform.OS === "android" && (
                  <DateTimePicker
                    value={value.from ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={handleStartDateChange}
                    maximumDate={value.to ?? new Date()}
                  />
                )}

                {showEndPicker && Platform.OS === "android" && (
                  <DateTimePicker
                    value={value.to ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                    minimumDate={value.from}
                    maximumDate={new Date()}
                  />
                )}

                <Button size="$4" bg="$blue10" color="white" onPress={handleDone}>
                  <Text color="white" fontWeight="600">
                    Done
                  </Text>
                </Button>
              </YStack>
            </>
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export function getDateRangeLabel(value: DateRangeValue): string {
  if (value.preset === "custom" && value.from && value.to) {
    const formatShort = (date: Date) =>
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${formatShort(value.from)} - ${formatShort(value.to)}`;
  }
  return DATE_RANGE_OPTIONS.find((o) => o.value === (value.preset ?? "all_time"))?.label ?? "All time";
}

export function getDateRangeFromPreset(preset: DateRangePreset): {
  from?: Date;
  to?: Date;
} {
  const now = new Date();
  switch (preset) {
    case "7_days":
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
    case "30_days":
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
    case "3_months":
      return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now };
    case "custom":
      return {}; // Custom uses explicit from/to
    case "all_time":
    default:
      return {};
  }
}
