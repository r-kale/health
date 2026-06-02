import { CATALOG } from "./exercises";
import type { Goal, GymType, Routine, RoutineDay } from "../types";

// ---- Day templates ------------------------------------------------------
// A template is a named day with the muscle groups it targets. We populate
// its exercises by filtering the catalog to the user's gym type.

interface DayTemplate {
  key: string;
  name: string;
  muscles: string[];
}

export const DAY_TEMPLATES: Record<string, DayTemplate> = {
  push: { key: "push", name: "Push", muscles: ["chest", "shoulders", "triceps"] },
  pull: { key: "pull", name: "Pull", muscles: ["back", "biceps"] },
  legs: { key: "legs", name: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
  upper: { key: "upper", name: "Upper", muscles: ["chest", "back", "shoulders", "biceps", "triceps"] },
  lower: { key: "lower", name: "Lower", muscles: ["quads", "hamstrings", "glutes", "calves"] },
  full: { key: "full", name: "Full body", muscles: ["chest", "back", "quads", "glutes", "shoulders", "core"] },
  chest: { key: "chest", name: "Chest", muscles: ["chest", "triceps"] },
  back: { key: "back", name: "Back", muscles: ["back", "biceps"] },
  arms: { key: "arms", name: "Arms", muscles: ["biceps", "triceps"] },
  shoulders: { key: "shoulders", name: "Shoulders", muscles: ["shoulders"] },
  core: { key: "core", name: "Core & cardio", muscles: ["core", "cardio"] },
};

/** Named multi-day splits the user can pick from. */
export const SPLIT_PRESETS: { id: string; label: string; days: string[] }[] = [
  { id: "ppl", label: "Push / Pull / Legs", days: ["push", "pull", "legs"] },
  { id: "ul", label: "Upper / Lower", days: ["upper", "lower"] },
  { id: "full", label: "Full body", days: ["full"] },
  { id: "bro", label: "Chest / Back / Legs / Shoulders / Arms", days: ["chest", "back", "legs", "shoulders", "arms"] },
];

const MAX_PER_DAY = 5;

/** Pick catalog exercise ids for a template, filtered to the gym type. */
export function exercisesForTemplate(key: string, gym: GymType): string[] {
  const tpl = DAY_TEMPLATES[key];
  if (!tpl) return [];
  return CATALOG.filter(
    (e) => e.gyms.includes(gym) && e.muscleGroups.some((m) => tpl.muscles.includes(m))
  )
    .slice(0, MAX_PER_DAY)
    .map((e) => e.id);
}

/** Build a RoutineDay from a template key. */
export function dayFromTemplate(key: string, gym: GymType): RoutineDay {
  const tpl = DAY_TEMPLATES[key];
  return {
    id: crypto.randomUUID(),
    name: tpl?.name ?? "Day",
    exerciseIds: exercisesForTemplate(key, gym),
  };
}

/** Default split per goal — a sensible starting point the user can edit. */
function defaultSplitFor(goal: Goal): string {
  switch (goal) {
    case "strength":
      return "ul";
    case "hypertrophy":
      return "ppl";
    case "fatloss":
      return "full";
    default:
      return "ppl";
  }
}

/** Generate a starter routine from the onboarding answers. */
export function buildDefaultRoutine(
  profileId: string,
  goal: Goal,
  gym: GymType
): Routine {
  const split = SPLIT_PRESETS.find((s) => s.id === defaultSplitFor(goal)) ?? SPLIT_PRESETS[0];
  const days = split.days.map((k) => dayFromTemplate(k, gym));
  return {
    profileId,
    days,
    scheduleMode: "rotation",
    weekdayMap: Array(7).fill(null),
  };
}
