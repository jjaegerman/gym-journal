import { useState } from "react";
import { XStack, Button } from "tamagui";
import { X } from "@tamagui/lucide-icons";
import { FilterChip, FilterSheet } from "@/components/ui/filters";
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
  const [exerciseKindSheetOpen, setExerciseKindSheetOpen] = useState(false);

  const handleExerciseKindChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      exercise_kinds: selected.length > 0 ? selected : undefined,
    });
  };

  if (!filterOptions) return null;

  return (
    <>
      <XStack gap="$1.5" py="$2" flexWrap="wrap">
        <FilterChip
          label="Category"
          selectedCount={filters.exercise_kinds?.length ?? 0}
          onPress={() => setExerciseKindSheetOpen(true)}
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
