import type { Experience, Focus, GymType } from "../types";

// ---- Exercise catalog ---------------------------------------------------
// The seed pool. The rule-based engine filters this by the profile's gym
// type and the day's focus slot, then assigns a sensible starting value.

export interface CatalogExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  /** Which rotation slots this exercise can fill. */
  focus: Focus[];
  /** Gyms that have this equipment available. */
  gyms: GymType[];
  unit: "kg" | "level" | "min" | "bw";
  /** Starting value by experience (in `unit`). */
  start: Record<Experience, number>;
  /** Increment applied on a successful progression. */
  step: number;
  defaultSets: number;
  defaultReps: number;
}

export const CATALOG: CatalogExercise[] = [
  // --- Upper push ---
  {
    id: "chest-press",
    name: "Chest Press Machine",
    muscleGroups: ["chest", "triceps"],
    focus: ["upper", "full"],
    gyms: ["full", "machines_cardio"],
    unit: "kg",
    start: { beginner: 20, intermediate: 35, advanced: 50 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    id: "bench-press",
    name: "Barbell Bench Press",
    muscleGroups: ["chest", "triceps"],
    focus: ["upper", "full"],
    gyms: ["full", "free_weights"],
    unit: "kg",
    start: { beginner: 30, intermediate: 50, advanced: 70 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 8,
  },
  {
    id: "shoulder-press",
    name: "Shoulder Press",
    muscleGroups: ["shoulders", "triceps"],
    focus: ["upper", "full"],
    gyms: ["full", "machines_cardio", "free_weights", "home"],
    unit: "kg",
    start: { beginner: 10, intermediate: 20, advanced: 32 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    id: "pushup",
    name: "Push-ups",
    muscleGroups: ["chest", "triceps", "shoulders"],
    focus: ["upper", "full"],
    gyms: ["home", "free_weights", "full", "machines_cardio"],
    unit: "bw",
    start: { beginner: 8, intermediate: 15, advanced: 25 },
    step: 2,
    defaultSets: 3,
    defaultReps: 12,
  },
  // --- Upper pull ---
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscleGroups: ["back", "biceps"],
    focus: ["upper", "full"],
    gyms: ["full", "machines_cardio"],
    unit: "kg",
    start: { beginner: 25, intermediate: 40, advanced: 60 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    id: "seated-row",
    name: "Seated Cable Row",
    muscleGroups: ["back", "biceps"],
    focus: ["upper", "full"],
    gyms: ["full", "machines_cardio"],
    unit: "kg",
    start: { beginner: 25, intermediate: 40, advanced: 55 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    id: "db-row",
    name: "Dumbbell Row",
    muscleGroups: ["back", "biceps"],
    focus: ["upper", "full"],
    gyms: ["free_weights", "home", "full"],
    unit: "kg",
    start: { beginner: 8, intermediate: 16, advanced: 26 },
    step: 2,
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    id: "bicep-curl",
    name: "Dumbbell Bicep Curl",
    muscleGroups: ["biceps"],
    focus: ["upper"],
    gyms: ["free_weights", "home", "full"],
    unit: "kg",
    start: { beginner: 6, intermediate: 12, advanced: 18 },
    step: 1,
    defaultSets: 3,
    defaultReps: 12,
  },
  // --- Lower ---
  {
    id: "leg-press",
    name: "Leg Press",
    muscleGroups: ["quads", "glutes"],
    focus: ["lower", "full"],
    gyms: ["full", "machines_cardio"],
    unit: "kg",
    start: { beginner: 40, intermediate: 80, advanced: 130 },
    step: 5,
    defaultSets: 3,
    defaultReps: 12,
  },
  {
    id: "squat",
    name: "Barbell Squat",
    muscleGroups: ["quads", "glutes"],
    focus: ["lower", "full"],
    gyms: ["full", "free_weights"],
    unit: "kg",
    start: { beginner: 30, intermediate: 60, advanced: 90 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 8,
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    muscleGroups: ["quads", "glutes"],
    focus: ["lower", "full"],
    gyms: ["home", "free_weights", "full"],
    unit: "kg",
    start: { beginner: 8, intermediate: 16, advanced: 24 },
    step: 2,
    defaultSets: 3,
    defaultReps: 12,
  },
  {
    id: "leg-curl",
    name: "Leg Curl Machine",
    muscleGroups: ["hamstrings"],
    focus: ["lower"],
    gyms: ["full", "machines_cardio"],
    unit: "kg",
    start: { beginner: 15, intermediate: 30, advanced: 45 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 12,
  },
  {
    id: "calf-raise",
    name: "Calf Raise",
    muscleGroups: ["calves"],
    focus: ["lower", "full"],
    gyms: ["home", "free_weights", "full", "machines_cardio"],
    unit: "kg",
    start: { beginner: 20, intermediate: 40, advanced: 60 },
    step: 2.5,
    defaultSets: 3,
    defaultReps: 15,
  },
  // --- Core / conditioning ---
  {
    id: "plank",
    name: "Plank",
    muscleGroups: ["core"],
    focus: ["full", "lower", "upper"],
    gyms: ["home", "free_weights", "full", "machines_cardio"],
    unit: "min",
    start: { beginner: 1, intermediate: 1, advanced: 2 },
    step: 0,
    defaultSets: 3,
    defaultReps: 1,
  },
  {
    id: "treadmill",
    name: "Treadmill (warm-up/cardio)",
    muscleGroups: ["cardio"],
    focus: ["full", "upper", "lower"],
    gyms: ["full", "machines_cardio"],
    unit: "min",
    start: { beginner: 10, intermediate: 12, advanced: 15 },
    step: 0,
    defaultSets: 1,
    defaultReps: 1,
  },
];

// ---- Gym presets --------------------------------------------------------

export const CATALOG_BY_ID: Record<string, CatalogExercise> = Object.fromEntries(
  CATALOG.map((e) => [e.id, e])
);

export const GYM_PRESETS: { id: GymType; label: string; blurb: string }[] = [
  { id: "full", label: "Fully equipped", blurb: "Machines + free weights + cardio" },
  { id: "machines_cardio", label: "Machines + cardio", blurb: "Typical commercial gym floor" },
  { id: "free_weights", label: "Free weights", blurb: "Barbells, dumbbells, benches" },
  { id: "home", label: "Home / minimal", blurb: "Dumbbells & bodyweight" },
];

export const GOAL_LABELS: Record<string, string> = {
  general: "General fitness",
  strength: "Strength",
  hypertrophy: "Muscle / physique",
  fatloss: "Fat loss",
};

export const FOCUS_LABELS: Record<string, string> = {
  upper: "Upper body",
  lower: "Lower body",
  full: "Full body",
};
