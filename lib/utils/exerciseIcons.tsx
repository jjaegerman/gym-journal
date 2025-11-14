/**
 * Exercise type icon mapping
 * Maps exercise categories to appropriate Lucide icons
 */

import {
  Activity,
  Zap,
  Dumbbell,
  TrendingUp,
  Circle,
  Target,
  Award,
  Heart,
  Navigation,
} from "@tamagui/lucide-icons";
import { ReactElement } from "react";

/**
 * Get icon component for exercise type
 * @param exerciseType - The exercise type/category
 * @param size - Icon size (default 20)
 * @returns Icon component
 */
export function getExerciseIcon(
  exerciseType?: string | null,
  size: number = 20
): ReactElement {
  if (!exerciseType) {
    return <Activity size={size} />;
  }

  const type = exerciseType.toLowerCase();

  // Lower Body Compound
  if (type.includes("squat")) {
    return <Dumbbell size={size} />;
  }
  if (type.includes("deadlift")) {
    return <TrendingUp size={size} />;
  }
  if (type.includes("lunge") || type.includes("split")) {
    return <Navigation size={size} />;
  }

  // Upper Body Compound
  if (type.includes("bench") || type.includes("press")) {
    return <Dumbbell size={size} />;
  }
  if (type.includes("row")) {
    return <TrendingUp size={size} />;
  }
  if (type.includes("pull")) {
    return <TrendingUp size={size} />;
  }

  // Olympic & Power
  if (type.includes("olympic") || type.includes("power")) {
    return <Zap size={size} />;
  }

  // Isolation exercises
  if (
    type.includes("leg") ||
    type.includes("glute") ||
    type.includes("calf") ||
    type.includes("chest") ||
    type.includes("shoulder") ||
    type.includes("arm")
  ) {
    return <Target size={size} />;
  }

  // Core
  if (type.includes("core")) {
    return <Circle size={size} />;
  }

  // Cardio
  if (type.includes("cardio")) {
    return <Heart size={size} />;
  }

  // Default
  return <Activity size={size} />;
}

/**
 * Get icon color for exercise type
 * @param exerciseType - The exercise type/category
 * @returns Tamagui color token
 */
export function getExerciseIconColor(exerciseType?: string | null): string {
  if (!exerciseType) {
    return "$gray10";
  }

  const type = exerciseType.toLowerCase();

  // Cardio - red/pink
  if (type.includes("cardio")) {
    return "$red10";
  }

  // Power/Olympic - yellow/orange
  if (type.includes("olympic") || type.includes("power")) {
    return "$orange10";
  }

  // Compound movements - blue
  if (
    type.includes("squat") ||
    type.includes("deadlift") ||
    type.includes("bench") ||
    type.includes("press") ||
    type.includes("row") ||
    type.includes("pull")
  ) {
    return "$blue10";
  }

  // Isolation - purple
  if (
    type.includes("isolation") ||
    type.includes("leg") ||
    type.includes("glute") ||
    type.includes("calf") ||
    type.includes("chest") ||
    type.includes("shoulder") ||
    type.includes("arm")
  ) {
    return "$purple10";
  }

  // Core - green
  if (type.includes("core")) {
    return "$green10";
  }

  // Default
  return "$gray10";
}
