import { useEffect, useState } from "react";
import { Button, H5, Paragraph, XStack, YStack } from "tamagui";
import { Plus, Share2 } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { WorkoutDetails, WorkoutDetailsSchema } from "@/types/exercise";
import { getWorkoutDetails } from "@/lib/api/supabase/workouts";
import { buildWorkoutShareUrl } from "@/lib/share/links";
import { shareLink } from "@/lib/share/share";
import { ExerciseList } from "./shared/ExerciseList";
import { AddSetsSheet } from "./features/workout/AddSetsSheet";
import { LoadingState } from "./ui/feedback/LoadingState";

interface WorkoutViewProps {
  workoutId: string;
  /**
   * When true, hides all mutation UI (Add Sets, delete set) and the share
   * button. Used by `/share/workout/[id]` where a non-owner is viewing.
   */
  readonly?: boolean;
  /**
   * Override the fetch function. Defaults to the authenticated
   * `getWorkoutDetails`; the share route passes `getPublicWorkoutDetails`.
   */
  fetchFn?: (id: string) => Promise<unknown>;
}

export const WorkoutView = ({
  workoutId,
  readonly = false,
  fetchFn = getWorkoutDetails,
}: WorkoutViewProps) => {
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [addSetsOpen, setAddSetsOpen] = useState(false);
  const toast = useToastController();

  const fetchWorkout = async () => {
    try {
      setLoading(true);
      const data = await fetchFn(workoutId);
      setWorkout(WorkoutDetailsSchema.parse(data));
    } catch (err) {
      console.error("Failed to load workout", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const { copiedToClipboard } = await shareLink({
        url: buildWorkoutShareUrl(workoutId),
        title: "Workout",
      });
      if (copiedToClipboard) {
        toast.show("Link copied", { duration: 2000 });
      }
    } catch (err) {
      console.error("Failed to share workout link", err);
      toast.show("Failed to share link", { duration: 2000 });
    }
  };

  useEffect(() => {
    fetchWorkout();
  }, [workoutId]);

  const endTime = workout?.endTime;
  const workoutStart = workout?.datetime;
  const showEndTime =
    endTime && workoutStart && endTime.getTime() !== workoutStart.getTime();

  if (loading) {
    return <LoadingState />;
  }

  return (
    <YStack width="90%" $sm={{ width: "75%" }} $md={{ width: "65%" }} gap="$4" mx="auto" pb="$4" pt="$4">
      {workout && !readonly && (
        <XStack paddingInline="$3" justify="space-between" items="center">
          <Button
            size="$3"
            $sm={{ size: "$5" }}
            icon={Plus}
            onPress={() => setAddSetsOpen(true)}
            variant="outlined"
            borderColor="$color6"
            borderWidth={0.5}
          >
            Add Sets
          </Button>
          <Button
            size="$3"
            $sm={{ size: "$5" }}
            chromeless
            circular
            onPress={handleShare}
            icon={<Share2 size="$1" $sm={{ size: "$1.5" }} color="$color10" />}
          />
        </XStack>
      )}
      <YStack paddingInline="$3" gap="$1">
        <H5 color="$color11" fontWeight="600" $sm={{ fontSize: "$8" }}>
          {workout?.datetime.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </H5>
        <Paragraph color="$color10" $sm={{ fontSize: "$6" }}>
          {workout?.datetime.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {showEndTime && (
            <>
              {" to "}
              {endTime.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
        </Paragraph>
      </YStack>
      <ExerciseList
        exercises={workout?.exercises ?? []}
        onLogDeleted={readonly ? undefined : fetchWorkout}
        readonly={readonly}
      />
      {workout && !readonly && (
        <AddSetsSheet
          workoutId={workoutId}
          workoutDatetime={workout.datetime}
          workoutEndTime={workout.endTime}
          exercises={workout.exercises}
          open={addSetsOpen}
          onClose={() => setAddSetsOpen(false)}
          onSetsAdded={fetchWorkout}
        />
      )}
    </YStack>
  );
};
