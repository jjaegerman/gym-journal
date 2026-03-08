import { useState, useRef } from "react";
import { Platform, View } from "react-native";
import { XStack, Button } from "tamagui";
import { X } from "@tamagui/lucide-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { FilterChip, FilterSheet } from "@/components/ui/filters";
import { WorkoutFilters as WorkoutFiltersType, WorkoutFilterOptions } from "@/lib/hooks/useWorkoutHistory";

const WebInput = "input" as any;

const CALENDAR_HALF_WIDTH = 120;

function toInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface WorkoutFiltersProps {
  filters: WorkoutFiltersType;
  filterOptions: WorkoutFilterOptions | null;
  onFiltersChange: (filters: WorkoutFiltersType) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function WorkoutFilters({
  filters,
  filterOptions,
  onFiltersChange,
  onClear,
  hasActiveFilters,
}: WorkoutFiltersProps) {
  const [exerciseKindSheetOpen, setExerciseKindSheetOpen] = useState(false);
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const endDateInputRef = useRef<any>(null);
  const endDateWrapperRef = useRef<any>(null);

  const showWebPicker = () => {
    const input = endDateInputRef.current;
    if (!input) return;
    const wrapperRect = endDateWrapperRef.current?.getBoundingClientRect?.();
    const centerX = wrapperRect ? wrapperRect.left + wrapperRect.width / 2 : window.innerWidth / 2;
    input.style.top = `${window.innerHeight / 2}px`;
    input.style.left = `${Math.max(0, centerX - CALENDAR_HALF_WIDTH)}px`;
    input.style.width = "1px";
    input.style.height = "1px";
    void input.offsetLeft;
    input.showPicker?.();
  };

  const handleExerciseKindChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      exercise_kinds: selected.length > 0 ? selected : undefined,
    });
  };

  const handleNativeDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "set" && date) {
      onFiltersChange({ ...filters, dateTo: date });
    }
    setShowNativeDatePicker(false);
  };

  if (!filterOptions) return null;

  const hasDateFilter = !!filters.dateTo;
  const dateChipLabel = filters.dateTo
    ? `Until ${filters.dateTo.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "Date";

  return (
    <>
      <XStack gap="$1.5" py="$2" flexWrap="wrap">
        <FilterChip
          label="Category"
          selectedCount={filters.exercise_kinds?.length ?? 0}
          onPress={() => setExerciseKindSheetOpen(true)}
        />
        <View ref={endDateWrapperRef}>
          <FilterChip
            label={dateChipLabel}
            active={hasDateFilter}
            onPress={() =>
              Platform.OS === "web" ? showWebPicker() : setShowNativeDatePicker(true)
            }
          />
        </View>
        {hasActiveFilters && (
          <Button
            size="$3"
            chromeless
            onPress={onClear}
            borderRadius="$10"
            px="$2"
            icon={<X size={14} color="$gray11" />}
          />
        )}
      </XStack>

      {Platform.OS === "web" && (
        <WebInput
          ref={endDateInputRef}
          type="date"
          value={filters.dateTo ? toInputValue(filters.dateTo) : ""}
          max={toInputValue(new Date())}
          style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          onChange={(e: any) => {
            const date = e.target.value ? new Date(e.target.value + "T12:00:00") : undefined;
            if (date) onFiltersChange({ ...filters, dateTo: date });
          }}
        />
      )}

      {Platform.OS !== "web" && showNativeDatePicker && (
        <DateTimePicker
          value={filters.dateTo ?? new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleNativeDateChange}
        />
      )}

      <FilterSheet
        title="Select Categories"
        options={filterOptions.exercise_kinds}
        selected={filters.exercise_kinds ?? []}
        onSelectionChange={handleExerciseKindChange}
        open={exerciseKindSheetOpen}
        onOpenChange={setExerciseKindSheetOpen}
      />
    </>
  );
}
