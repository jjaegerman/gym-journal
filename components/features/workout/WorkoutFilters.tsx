import { useState } from "react";
import { ScrollView, XStack, Button, Text } from "tamagui";
import { X } from "@tamagui/lucide-icons";
import {
  FilterChip,
  FilterSheet,
  DateRangePicker,
  DateRangePreset,
  DateRangeValue,
  getDateRangeLabel,
} from "@/components/ui/filters";
import { WorkoutFilters as WorkoutFiltersType, WorkoutFilterOptions } from "@/lib/hooks/useWorkoutHistory";

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
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [equipmentSheetOpen, setEquipmentSheetOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("all_time");

  const getDateRangeValue = (): DateRangeValue => {
    // If we have explicit dates from custom selection, use custom preset
    if (dateRangePreset === "custom") {
      return { preset: "custom", from: filters.dateFrom, to: filters.dateTo };
    }
    // Otherwise infer preset from date range
    if (!filters.dateFrom) return { preset: "all_time" };
    const daysDiff = Math.round(
      (Date.now() - filters.dateFrom.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysDiff <= 7) return { preset: "7_days", from: filters.dateFrom, to: filters.dateTo };
    if (daysDiff <= 30) return { preset: "30_days", from: filters.dateFrom, to: filters.dateTo };
    if (daysDiff <= 90) return { preset: "3_months", from: filters.dateFrom, to: filters.dateTo };
    return { preset: "custom", from: filters.dateFrom, to: filters.dateTo };
  };

  const handleCategoryChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      categories: selected.length > 0 ? selected : undefined,
    });
  };

  const handleEquipmentChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      equipment: selected.length > 0 ? selected : undefined,
    });
  };

  const handleDateRangeChange = (value: DateRangeValue) => {
    setDateRangePreset(value.preset ?? "all_time");
    onFiltersChange({
      ...filters,
      dateFrom: value.from,
      dateTo: value.to,
    });
  };

  if (!filterOptions) return null;

  const dateValue = getDateRangeValue();
  const hasDateFilter = dateValue.preset !== "all_time";

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        <XStack gap="$1.5" py="$2">
          <FilterChip
            label="Category"
            selectedCount={filters.categories?.length ?? 0}
            onPress={() => setCategorySheetOpen(true)}
          />
          <FilterChip
            label="Equipment"
            selectedCount={filters.equipment?.length ?? 0}
            onPress={() => setEquipmentSheetOpen(true)}
          />
          <Button
            size="$3"
            chromeless={!hasDateFilter}
            bg={hasDateFilter ? "$blue4" : "$gray4"}
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setDateRangeOpen(true)}
            borderRadius="$10"
            px="$2.5"
          >
            <Text
              fontSize="$3"
              fontWeight={hasDateFilter ? "600" : "400"}
              color={hasDateFilter ? "$blue11" : "$gray11"}
            >
              {getDateRangeLabel(dateValue)}
            </Text>
          </Button>
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
      </ScrollView>

      <FilterSheet
        title="Select Categories"
        options={filterOptions.categories}
        selected={filters.categories ?? []}
        onSelectionChange={handleCategoryChange}
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
      />

      <FilterSheet
        title="Select Equipment"
        options={filterOptions.equipment}
        selected={filters.equipment ?? []}
        onSelectionChange={handleEquipmentChange}
        open={equipmentSheetOpen}
        onOpenChange={setEquipmentSheetOpen}
      />

      <DateRangePicker
        value={dateValue}
        onChange={handleDateRangeChange}
        open={dateRangeOpen}
        onOpenChange={setDateRangeOpen}
      />
    </>
  );
}
