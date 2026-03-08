import { Set } from "@/types/exercise";
import { parseIsoDuration, formatIsoDuration } from "./date";

export interface ExerciseLogSummary {
  sets: number | undefined;
  minReps: number | undefined;
  maxReps: number | undefined;
  minWeight: number | undefined;
  maxWeight: number | undefined;
  weightUnit: string | undefined;
  minDistance: number | undefined;
  maxDistance: number | undefined;
  distanceUnit: string | undefined;
  minResistanceLevel: number | undefined;
  maxResistanceLevel: number | undefined;
  minDuration: string | undefined;
  maxDuration: string | undefined;
  minEffort: string | undefined;
  maxEffort: string | undefined;
}

export function summarizeExerciseLogs(sets: Set[]): ExerciseLogSummary {
  let minReps = Infinity;
  let maxReps = -Infinity;
  let minWeight = Infinity;
  let maxWeight = -Infinity;
  let weightUnit = "";
  let minDistance = Infinity;
  let maxDistance = -Infinity;
  let distanceUnit = "";
  let minResistanceLevel = Infinity;
  let maxResistanceLevel = -Infinity;
  let minDuration: string | undefined = undefined;
  let minDurationMinutes = Infinity;
  let maxDuration: string | undefined = undefined;
  let maxDurationMinutes = -Infinity;
  const EFFORT_ORDINAL: Record<string, number> = { low: 1, medium: 2, high: 3 };
  let minEffortOrdinal = Infinity;
  let maxEffortOrdinal = -Infinity;
  let minEffort: string | undefined = undefined;
  let maxEffort: string | undefined = undefined;

  sets.forEach((set) => {
    if (set.repetitions) {
      minReps = Math.min(minReps, set.repetitions);
      maxReps = Math.max(maxReps, set.repetitions);
    }
    if (set.weight) {
      minWeight = Math.min(minWeight, set.weight);
      maxWeight = Math.max(maxWeight, set.weight);
      weightUnit = set.weightUnit ?? "";
    }
    if (set.distance) {
      minDistance = Math.min(minDistance, set.distance);
      maxDistance = Math.max(maxDistance, set.distance);
      distanceUnit = set.distanceUnit ?? "";
    }
    if (set.resistanceLevel) {
      minResistanceLevel = Math.min(minResistanceLevel, set.resistanceLevel);
      maxResistanceLevel = Math.max(maxResistanceLevel, set.resistanceLevel);
    }
    if (set.duration) {
      const durationMinutes = parseIsoDuration(set.duration);
      if (durationMinutes < minDurationMinutes) {
        minDurationMinutes = durationMinutes;
        minDuration = set.duration;
      }
      if (durationMinutes > maxDurationMinutes) {
        maxDurationMinutes = durationMinutes;
        maxDuration = set.duration;
      }
    }
    if (set.effort) {
      const ordinal = EFFORT_ORDINAL[set.effort];
      if (ordinal !== undefined) {
        if (ordinal < minEffortOrdinal) {
          minEffortOrdinal = ordinal;
          minEffort = set.effort;
        }
        if (ordinal > maxEffortOrdinal) {
          maxEffortOrdinal = ordinal;
          maxEffort = set.effort;
        }
      }
    }
  });

  return {
    sets: sets.length,
    minReps: minReps === Infinity ? undefined : minReps,
    maxReps: maxReps === -Infinity ? undefined : maxReps,
    minWeight: minWeight === Infinity ? undefined : minWeight,
    maxWeight: maxWeight === -Infinity ? undefined : maxWeight,
    weightUnit: weightUnit === "" ? undefined : weightUnit,
    minDistance: minDistance === Infinity ? undefined : minDistance,
    maxDistance: maxDistance === -Infinity ? undefined : maxDistance,
    distanceUnit: distanceUnit === "" ? undefined : distanceUnit,
    minResistanceLevel:
      minResistanceLevel === Infinity ? undefined : minResistanceLevel,
    maxResistanceLevel:
      maxResistanceLevel === -Infinity ? undefined : maxResistanceLevel,
    minDuration,
    maxDuration,
    minEffort,
    maxEffort,
  };
}

function addSIfPlural(value: number, word: string): string {
  return value <= 1 ? word : word + "s";
}

function asRangeIfDifferent(min: any, max: any): string {
  return min === max ? `${min}` : `${min} - ${max}`;
}

export function descriptionFromSummary(summary: ExerciseLogSummary): string {
  const parts: string[] = [];
  parts.push(`${summary.sets} ${addSIfPlural(summary.sets!, "set")}`);

  // Strength metrics
  if (summary.minReps !== undefined && summary.maxReps !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minReps, summary.maxReps)} ${addSIfPlural(
        summary.maxReps!,
        "rep",
      )}`,
    );
  }
  if (summary.minWeight !== undefined && summary.maxWeight !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minWeight, summary.maxWeight)} ${
        summary.weightUnit || "lbs"
      }`,
    );
  }

  // Cardio metrics
  if (summary.minDistance !== undefined && summary.maxDistance !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minDistance, summary.maxDistance)} ${
        summary.distanceUnit || "mi"
      }`,
    );
  }
  if (
    summary.minResistanceLevel !== undefined &&
    summary.maxResistanceLevel !== undefined
  ) {
    parts.push(
      `lvl ${asRangeIfDifferent(
        summary.minResistanceLevel,
        summary.maxResistanceLevel,
      )}`,
    );
  }

  // General
  if (summary.minDuration !== undefined && summary.maxDuration !== undefined) {
    parts.push(
      `${asRangeIfDifferent(formatIsoDuration(summary.minDuration), formatIsoDuration(summary.maxDuration))}`,
    );
  }
  if (summary.minEffort !== undefined && summary.maxEffort !== undefined) {
    parts.push(
      `effort: ${asRangeIfDifferent(summary.minEffort, summary.maxEffort)}`,
    );
  }

  return parts.join(" \u2022 ");
}
