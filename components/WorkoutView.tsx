import { Session } from "@supabase/supabase-js";
import { supabase } from "lib/supabase";
import { useEffect, useState } from "react";
import { capitalizeEachWord } from "@/lib/utils";
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
import {
  Exercise,
  Workout,
  WorkoutDetails,
  WorkoutDetailsSchema,
} from "types/exercise";
import { ExerciseLogs } from "./ExerciseLogs";
import { Expand, Eye } from "@tamagui/lucide-icons";

const spModes = ["percent", "constant", "fit", "mixed"] as const;

export const WorkoutView = ({ workoutId }: { workoutId: string }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [focusedExerciseIdx, setFocusedExerciseIdx] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState<boolean>(true);

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

  const lastLog = workout ? lastLogTime(workout.exercises) : undefined;
  const workoutStart = workout?.datetime;
  const showEndTime =
    lastLog && workoutStart && lastLog.getTime() !== workoutStart.getTime();

  return (
    <YStack items="center" gap="$1">
      <Spacer />
      <Text>
        {workout?.datetime.toLocaleString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {showEndTime && (
          <>
            {" "}
            to{" "}
            {lastLog?.toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        )}
      </Text>
      <Spacer />
      <YGroup items="center" bordered width="70%" separator={<Separator />}>
        {workout?.exercises.map((exercise, i) => {
          const summary = SummarizeExerciseLogs(exercise.logs);
          const description = descriptionFromSummary(summary);

          // Build title with type if available
          const title = exercise.type
            ? `${exercise.type} - ${capitalizeEachWord(exercise.variant)}`
            : capitalizeEachWord(exercise.variant);

          // Add equipment to description if available
          const fullDescription = exercise.equipment
            ? `${exercise.equipment} • ${description}`
            : description;

          return (
            <YGroup.Item key={exercise.id}>
              <ListItem
                title={title}
                subTitle={fullDescription}
                size="$4"
                hoverTheme
                pressTheme
                key={exercise.id}
                iconAfter={Expand}
                onPress={() => {
                  setFocusedExerciseIdx(i);
                  setDialogOpen(true);
                }}
              />
            </YGroup.Item>
          );
        })}
      </YGroup>
      <ExerciseLogs
        exercise={workout?.exercises[focusedExerciseIdx] || ({} as Exercise)}
        open={dialogOpen}
        setOpen={setDialogOpen}
      />
    </YStack>
  );
};


interface ExerciseLogSummary {
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
function SummarizeExerciseLogs(logs: any[]): ExerciseLogSummary {
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
    if (log.distance) {
      minDistance = Math.min(minDistance, log.distance);
      maxDistance = Math.max(maxDistance, log.distance);
      distanceUnit = log.distance_unit;
    }
    if (log.resistance_level) {
      minResistanceLevel = Math.min(minResistanceLevel, log.resistance_level);
      maxResistanceLevel = Math.max(maxResistanceLevel, log.resistance_level);
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
    minDistance: minDistance === Infinity ? undefined : minDistance,
    maxDistance: maxDistance === -Infinity ? undefined : maxDistance,
    distanceUnit: distanceUnit === "" ? undefined : distanceUnit,
    minResistanceLevel: minResistanceLevel === Infinity ? undefined : minResistanceLevel,
    maxResistanceLevel: maxResistanceLevel === -Infinity ? undefined : maxResistanceLevel,
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

  // Strength metrics
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

  // Cardio metrics
  if (summary.minDistance !== undefined && summary.maxDistance !== undefined) {
    parts.push(
      `${asRangeIfDifferent(summary.minDistance, summary.maxDistance)} ${
        summary.distanceUnit ? summary.distanceUnit : "units"
      }`
    );
  }
  if (summary.minResistanceLevel !== undefined && summary.maxResistanceLevel !== undefined) {
    parts.push(
      `resistance ${asRangeIfDifferent(summary.minResistanceLevel, summary.maxResistanceLevel)}`
    );
  }

  // General
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

function lastLogTime(exercises: any[] | undefined): Date | undefined {
  if (!exercises || exercises.length === 0) {
    return undefined;
  }
  let lastTime: Date | null = null;
  exercises.forEach((exercise) => {
    exercise.logs.forEach((log: any) => {
      const logTime = new Date(log.datetime);
      if (!lastTime || logTime > lastTime) {
        lastTime = logTime;
      }
    });
  });
  return lastTime || undefined;
}
