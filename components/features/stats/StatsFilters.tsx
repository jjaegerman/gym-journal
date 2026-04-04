import { useState, useMemo } from "react";
import { XStack, Button } from "tamagui";
import { X } from "@tamagui/lucide-icons";
import { FilterChip, FilterSheet, MoreFiltersSheet } from "@/components/ui/filters";
import {
  ExerciseFilters,
  ExerciseFilterOptions,
} from "@/lib/hooks/useFilteredExerciseStats";

type TimeRange = 'all_time' | '1_year' | '3_months' | '1_month';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all_time", label: "All time" },
  { value: "1_year", label: "1 year" },
  { value: "3_months", label: "3 months" },
  { value: "1_month", label: "1 month" },
];

interface StatsFiltersProps {
  filters: ExerciseFilters;
  filterOptions: ExerciseFilterOptions | null;
  onFiltersChange: (filters: ExerciseFilters) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function StatsFilters({
  filters,
  filterOptions,
  onFiltersChange,
  onClear,
  hasActiveFilters,
}: StatsFiltersProps) {
  const [exerciseKindSheetOpen, setExerciseKindSheetOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [timeRangeSheetOpen, setTimeRangeSheetOpen] = useState(false);

  const currentTimeRangeLabel =
    TIME_RANGE_OPTIONS.find((o) => o.value === filters.timeRange)?.label ?? "All time";

  const moreFiltersCount =
    (filters.modifiers?.length ?? 0) + (filters.equipment?.length ?? 0);

  const handleExerciseKindChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      exercise_kinds: selected.length > 0 ? selected : undefined,
    });
  };

  const handleMoreFilterChange = (sectionIndex: number, selected: string[]) => {
    const key = sectionIndex === 0 ? 'modifiers' : 'equipment';
    onFiltersChange({
      ...filters,
      [key]: selected.length > 0 ? selected : undefined,
    });
  };

  const handleMoreFiltersClear = () => {
    onFiltersChange({
      ...filters,
      modifiers: undefined,
      equipment: undefined,
    });
  };

  const handleTimeRangeChange = (selected: string[]) => {
    const value = selected[0] as TimeRange | undefined;
    onFiltersChange({
      ...filters,
      timeRange: value ?? 'all_time',
    });
  };

  const moreSections = useMemo(
    () => [
      {
        title: "Modifiers",
        options: filterOptions?.modifiers ?? [],
        selected: filters.modifiers ?? [],
      },
      {
        title: "Equipment",
        options: filterOptions?.equipment ?? [],
        selected: filters.equipment ?? [],
      },
    ],
    [filterOptions?.modifiers, filterOptions?.equipment, filters.modifiers, filters.equipment]
  );

  if (!filterOptions) return null;

  return (
    <>
      <XStack gap="$1.5" py="$2" flexWrap="wrap">
        <FilterChip
          label={filters.exercise_kinds?.[0] ?? "Category"}
          active={!!filters.exercise_kinds?.length}
          onPress={() => setExerciseKindSheetOpen(true)}
        />
        <FilterChip
          label="Filter"
          selectedCount={moreFiltersCount}
          onPress={() => setMoreFiltersOpen(true)}
        />
        <FilterChip
          label={currentTimeRangeLabel}
          active={filters.timeRange !== "all_time"}
          onPress={() => setTimeRangeSheetOpen(true)}
        />
        {hasActiveFilters && (
          <Button
            size="$3"
            chromeless
            onPress={onClear}
            borderRadius="$10"
            px="$2"
            icon={<X size={14} color="$color11" />}
          />
        )}
      </XStack>

      <FilterSheet
        title="Select Category"
        options={filterOptions.exercise_kinds}
        selected={filters.exercise_kinds ?? []}
        onSelectionChange={handleExerciseKindChange}
        open={exerciseKindSheetOpen}
        onOpenChange={setExerciseKindSheetOpen}
        singleSelect
      />

      <MoreFiltersSheet
        sections={moreSections}
        onChange={handleMoreFilterChange}
        onClear={handleMoreFiltersClear}
        open={moreFiltersOpen}
        onOpenChange={setMoreFiltersOpen}
      />

      <FilterSheet
        title="Time Range"
        options={TIME_RANGE_OPTIONS.map((o) => o.label)}
        selected={[currentTimeRangeLabel]}
        onSelectionChange={(labels) => {
          const option = TIME_RANGE_OPTIONS.find((o) => o.label === labels[0]);
          if (option) {
            handleTimeRangeChange([option.value]);
          }
        }}
        open={timeRangeSheetOpen}
        onOpenChange={setTimeRangeSheetOpen}
        singleSelect
      />
    </>
  );
}
