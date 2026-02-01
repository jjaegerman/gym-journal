import { useState } from "react";
import { ScrollView, XStack, Button, Text } from "tamagui";
import { X } from "@tamagui/lucide-icons";
import { FilterChip, FilterSheet } from "@/components/ui/filters";
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
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [modifiersSheetOpen, setModifiersSheetOpen] = useState(false);
  const [equipmentSheetOpen, setEquipmentSheetOpen] = useState(false);
  const [timeRangeSheetOpen, setTimeRangeSheetOpen] = useState(false);

  const currentTimeRangeLabel =
    TIME_RANGE_OPTIONS.find((o) => o.value === filters.timeRange)?.label ?? "All time";

  const handleCategoryChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      categories: selected.length > 0 ? selected : undefined,
    });
  };

  const handleModifiersChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      modifiers: selected.length > 0 ? selected : undefined,
    });
  };

  const handleEquipmentChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      equipment: selected.length > 0 ? selected : undefined,
    });
  };

  const handleTimeRangeChange = (selected: string[]) => {
    const value = selected[0] as TimeRange | undefined;
    onFiltersChange({
      ...filters,
      timeRange: value ?? 'all_time',
    });
  };

  if (!filterOptions) return null;

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
            label="Modifiers"
            selectedCount={filters.modifiers?.length ?? 0}
            onPress={() => setModifiersSheetOpen(true)}
          />
          <FilterChip
            label="Equipment"
            selectedCount={filters.equipment?.length ?? 0}
            onPress={() => setEquipmentSheetOpen(true)}
          />
          <Button
            size="$3"
            chromeless={filters.timeRange === "all_time"}
            bg={filters.timeRange !== "all_time" ? "$blue4" : "$gray4"}
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setTimeRangeSheetOpen(true)}
            borderRadius="$10"
            px="$2.5"
          >
            <Text
              fontSize="$3"
              fontWeight={filters.timeRange !== "all_time" ? "600" : "400"}
              color={filters.timeRange !== "all_time" ? "$blue11" : "$gray11"}
            >
              {currentTimeRangeLabel}
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
        title="Select Category"
        options={filterOptions.categories}
        selected={filters.categories ?? []}
        onSelectionChange={handleCategoryChange}
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        singleSelect
      />

      <FilterSheet
        title="Select Modifiers"
        options={filterOptions.modifiers}
        selected={filters.modifiers ?? []}
        onSelectionChange={handleModifiersChange}
        open={modifiersSheetOpen}
        onOpenChange={setModifiersSheetOpen}
      />

      <FilterSheet
        title="Select Equipment"
        options={filterOptions.equipment}
        selected={filters.equipment ?? []}
        onSelectionChange={handleEquipmentChange}
        open={equipmentSheetOpen}
        onOpenChange={setEquipmentSheetOpen}
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
