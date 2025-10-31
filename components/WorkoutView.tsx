import { Session } from "@supabase/supabase-js";
import { supabase } from "lib/supabase";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Sheet,
  ListItem,
  Heading,
  H3,
  H5,
  H6,
  YGroup,
  YStack,
  Spacer,
  Separator,
} from "tamagui";
import { Workout, WorkoutDetails, WorkoutDetailsSchema } from "types/exercise";

const spModes = ["percent", "constant", "fit", "mixed"] as const;

export const WorkoutView = ({ workoutId }: { workoutId: string }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session) {
      getWorkout();
    }
  }, [session]);

  const getWorkout = async () => {
    const { data, error } = await supabase.rpc("get_workout_details", {
      p_workout_id: workoutId,
    });
    if (error) {
      console.error("Error fetching workout details:", error);
      return;
    }
    setWorkout(WorkoutDetailsSchema.parse(data));
    console.log("Workout Details:", data);
    console.log("Typed Workout Details:", WorkoutDetailsSchema.parse(data));
  };

  return (
    <YStack flex={1} items="center" gap="$1">
      <Spacer />
      <YGroup items="center" bordered width="70%" separator={<Separator />}>
        {workout?.exercises.map((exercise) => {
          const summary = SummarizeExerciseLogs(exercise.logs);
          const description = descriptionFromSummary(summary);
          return (
            <YGroup.Item key={exercise.id}>
              <ListItem
                title={capitalizeEachWord(exercise.name)}
                subTitle={description}
                size="$4"
                hoverTheme
                pressTheme
                key={exercise.id}
              />
            </YGroup.Item>
          );
        })}
      </YGroup>
    </YStack>
  );
};

function capitalizeEachWord(sentence: string): string {
  const words = sentence.split(" ");
  const capitalizedWords = words.map((word) => {
    if (word.length === 0) {
      return "";
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return capitalizedWords.join(" ");
}

interface ExerciseLogSummary {
  sets: number | undefined;
  minReps: number | undefined;
  maxReps: number | undefined;
  minWeight: number | undefined;
  maxWeight: number | undefined;
  weightUnit: string | undefined;
  minDuration: string | undefined;
  maxDuration: string | undefined;
  minEffort: string | undefined;
  maxEffort: string | undefined;
}
function SummarizeExerciseLogs(logs: any[]): ExerciseLogSummary {
  let minReps = Infinity;
  let maxReps = -Infinity;
  let minWeight = Infinity;
  let maxWeight = -Infinity;
  let weightUnit = "";
  let minDuration = Infinity;
  let maxDuration = -Infinity;
  let minEffort = Infinity;
  let maxEffort = -Infinity;

  logs.forEach((log) => {
    if (log.repetitions) {
      minReps = Math.min(minReps, log.repetitions);
      maxReps = Math.max(maxReps, log.repetitions);
    }
    if (log.weight) {
      minWeight = Math.min(minWeight, log.weight);
      maxWeight = Math.max(maxWeight, log.weight);
      weightUnit = log.weightUnit;
    }
    if (log.duration) {
      minDuration = Math.min(minDuration, log.duration);
      maxDuration = Math.max(maxDuration, log.duration);
    }
    if (log.effort) {
      const effortValue = parseInt(log.effort);
      if (!isNaN(effortValue)) {
        minEffort = Math.min(minEffort, effortValue);
        maxEffort = Math.max(maxEffort, effortValue);
      }
    }
  });

  return {
    sets: logs.length,
    minReps: minReps === Infinity ? undefined : minReps,
    maxReps: maxReps === -Infinity ? undefined : maxReps,
    minWeight: minWeight === Infinity ? undefined : minWeight,
    maxWeight: maxWeight === -Infinity ? undefined : maxWeight,
    weightUnit: weightUnit === "" ? undefined : weightUnit,
    minDuration: minDuration === Infinity ? undefined : minDuration.toString(),
    maxDuration: maxDuration === -Infinity ? undefined : maxDuration.toString(),
    minEffort: minEffort === Infinity ? undefined : minEffort.toString(),
    maxEffort: maxEffort === -Infinity ? undefined : maxEffort.toString(),
  };
}

function addSIfPlural(value: number, word: string): string {
  return value <= 1 ? word : word + "s";
}

function asRangeIfDifferent(min: any, max: any): string {
  return min === max ? `${min}` : `${min} - ${max}`;
}

function descriptionFromSummary(summary: ExerciseLogSummary): string {
  const parts: string[] = [];
  parts.push(`${summary.sets} ${addSIfPlural(summary.sets!, "set")}`);
  if (summary.minReps !== undefined && summary.maxReps !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minReps, summary.maxReps)} ${addSIfPlural(
        summary.maxReps!,
        "repetition"
      )}`
    );
  }
  if (summary.minWeight !== undefined && summary.maxWeight !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minWeight, summary.maxWeight)} ${
        summary.weightUnit ? summary.weightUnit : "weight"
      }`
    );
  }
  if (summary.minDuration !== undefined && summary.maxDuration !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minDuration, summary.maxDuration)} duration`
    );
  }
  if (summary.minEffort !== undefined && summary.maxEffort !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minEffort, summary.maxEffort)} effort`
    );
  }
  return parts.join(", ");
}
