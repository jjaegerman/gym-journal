import { useState, useMemo } from "react";
import { XStack, Button } from "tamagui";
import { X, Share2 } from "@tamagui/lucide-icons";
import * as Clipboard from "expo-clipboard";
import { useToastController } from "@tamagui/toast";
import { FilterChip, FilterSheet, MoreFiltersSheet } from "@/components/ui/filters";
import {
  ExerciseFilters,
  ExerciseFilterOptions,
} from "@/lib/hooks/useFilteredExerciseStats";
import { useSession } from "@/lib/hooks/useSession";
import { useUnitPreferences } from "@/lib/hooks/useUnitPreferences";
import { buildStatsShareUrl } from "@/lib/share/links";

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
  const { session } = useSession();
  const { prefs } = useUnitPreferences();
  const toast = useToastController();

  const handleShare = async () => {
    const userId = session?.user.id;
    if (!userId) return;
    try {
      const url = buildStatsShareUrl(userId, {
        ...filters,
        preferredWeightUnit: prefs.weightUnit,
        preferredDistanceUnit: prefs.distanceUnit,
      });
      await Clipboard.setStringAsync(url);
      toast.show("Link copied", { duration: 2000 });
    } catch (err) {
      console.error("Failed to copy stats share link", err);
      toast.show("Failed to copy link", { duration: 2000 });
    }
  };

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
      <XStack gap="$1.5" py="$2" items="center">
        <XStack gap="$1.5" flex={1} flexWrap="wrap" items="center">
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
              bg="$gray4"
              pressStyle={{ opacity: 0.8 }}
              onPress={onClear}
              borderRadius="$10"
              circular
              icon={<X size="$1" color="$gray11" />}
            />
          )}
        </XStack>
        {session?.user.id && (
          <Button
            size="$3"
            $sm={{ size: "$5" }}
            chromeless
            bg="$gray4"
            pressStyle={{ opacity: 0.8 }}
            onPress={handleShare}
            borderRadius="$10"
            circular
            icon={<Share2 size="$1" $sm={{ size: "$1.5" }} color="$gray11" />}
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
