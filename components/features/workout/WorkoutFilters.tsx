import { useState } from "react";
import { XStack, Button } from "tamagui";
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
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("all_time");

  const getDateRangeValue = (): DateRangeValue => {
    return { preset: dateRangePreset, from: filters.dateFrom, to: filters.dateTo };
  };

  const handleCategoryChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      categories: selected.length > 0 ? selected : undefined,
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
      <XStack gap="$1.5" py="$2" flexWrap="wrap">
        <FilterChip
          label="Category"
          selectedCount={filters.categories?.length ?? 0}
          onPress={() => setCategorySheetOpen(true)}
        />
        <FilterChip
          label={getDateRangeLabel(dateValue)}
          active={hasDateFilter}
          onPress={() => setDateRangeOpen(true)}
        />
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

      <FilterSheet
        title="Select Categories"
        options={filterOptions.categories}
        selected={filters.categories ?? []}
        onSelectionChange={handleCategoryChange}
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
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
