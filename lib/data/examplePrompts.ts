export const EXAMPLE_PROMPTS = [
  // Bench / Chest
  "10 reps of bench press at 135 lbs",
  "Incline dumbbell press, 12 reps, 50 lbs",
  "Flat bench, 8 reps at 185",
  "20 push-ups",
  "Dips, 10 reps bodyweight",
  "Cable flyes, 15 reps at 30 lbs",

  // Back
  "Deadlift 225 for 5 reps",
  "Barbell rows, 8 reps at 135",
  "10 pull-ups",
  "Lat pulldown, 12 reps at 120 lbs",
  "3 sets of seated cable row, 10 reps, 150 lbs",
  "Dumbbell rows, 8 reps each arm, 60 lbs",

  // Legs
  "Squats, 8 reps at 185 lbs",
  "Leg press, 12 reps at 360",
  "Romanian deadlifts, 10 reps, 135 lbs",
  "Lunges with 40 lb dumbbells, 10 each leg",
  "Leg curls, 15 reps at 80 lbs",
  "Calf raises, 20 reps at 200 lbs",

  // Shoulders / Arms
  "Overhead press, 5 reps at 95 lbs",
  "Lateral raises, 15 reps, 20 lb dumbbells",
  "Bicep curls, 12 reps at 30 lbs",
  "Tricep pushdowns, 12 reps, 50 lbs",
  "Hammer curls, 10 reps, 35 lbs",
  "5 sets of 5 skull crushers at 65 lbs",

  // Cardio
  "Ran for 30 minutes",
  "5k run in 25 minutes",
  "Treadmill, 20 minutes at 6.5 mph",
  "Cycled 10 miles",
  "Elliptical for 45 minutes",
  "Rowing machine, 2000 meters in 8 minutes",
];

export function getRandomPrompts(count: number): string[] {
  const shuffled = [...EXAMPLE_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
