import { CATALOG_BY_ID } from "../data/exercises";
import type {
  Equipment,
  Experience,
  LoggedExercise,
  Profile,
  RotationState,
  Routine,
  RoutineDay,
  Session,
} from "../types";

// ---- Rule-based cadence + progression engine ----------------------------
// Pure functions over a profile's editable routine. Same input/output
// contract a future AI generator will satisfy, so the engine can be swapped
// without touching UI or storage.

interface ResolvedExercise {
  name: string;
  muscleGroups: string[];
  unit: string;
  targetSets: number;
  targetReps: number;
  step: number;
  start: number;
}

/** Resolve an exercise id to its metadata, from the catalog or a custom machine. */
function resolveExercise(
  id: string,
  equipment: Equipment[],
  experience: Experience
): ResolvedExercise {
  const cat = CATALOG_BY_ID[id];
  if (cat) {
    return {
      name: cat.name,
      muscleGroups: cat.muscleGroups,
      unit: cat.unit,
      targetSets: cat.defaultSets,
      targetReps: cat.defaultReps,
      step: cat.step,
      start: cat.start[experience],
    };
  }
  const custom = equipment.find((e) => e.id === id);
  return {
    name: custom?.name ?? "Exercise",
    muscleGroups: custom?.muscleGroups ?? [],
    unit: "kg",
    targetSets: 3,
    targetReps: 10,
    step: 2.5,
    start: 0,
  };
}

/** Find the most recent logged value for an exercise, for progression. */
function lastResultFor(
  exerciseId: string,
  history: Session[]
): { value: number; hitTargets: boolean } | null {
  for (const s of history) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId && e.done);
    if (ex) {
      const hit =
        ex.completedReps.length >= ex.targetSets &&
        ex.completedReps.every((r) => r >= ex.targetReps);
      return { value: ex.value, hitTargets: hit };
    }
  }
  return null;
}

/** Progressive overload: nudge up if last session hit all targets, else hold. */
function progressedValue(meta: ResolvedExercise, id: string, history: Session[]): number {
  const last = lastResultFor(id, history);
  if (!last) return meta.start;
  return last.hitTargets ? +(last.value + meta.step).toFixed(2) : last.value;
}

/** The routine day suggested for "now", per the schedule mode. */
export function pickDay(routine: Routine, rotation: RotationState | null): RoutineDay | null {
  if (routine.days.length === 0) return null;
  if (routine.scheduleMode === "weekday") {
    const dow = new Date().getDay();
    const dayId = routine.weekdayMap[dow];
    return routine.days.find((d) => d.id === dayId) ?? null;
  }
  const idx = (rotation ? rotation.cycleIndex : 0) % routine.days.length;
  return routine.days[idx];
}

/** Human hint about how long since this day was last trained. */
export function recoveryHint(rotation: RotationState | null, dayId: string): string {
  const last = rotation?.lastTrained?.[dayId];
  if (!last) return "Not trained yet — good place to start.";
  const days = Math.floor((Date.now() - last) / 86_400_000);
  if (days <= 0) return "Trained today already.";
  if (days === 1) return "Last done yesterday.";
  return `Last done ${days} days ago.`;
}

/** Build a logged-session draft for a specific routine day. */
export function buildSessionForDay(
  profile: Profile,
  day: RoutineDay,
  history: Session[],
  equipment: Equipment[]
): Session {
  const exercises: LoggedExercise[] = day.exerciseIds.map((id) => {
    const meta = resolveExercise(id, equipment, profile.experience);
    return {
      exerciseId: id,
      name: meta.name,
      muscleGroups: meta.muscleGroups,
      unit: meta.unit,
      value: progressedValue(meta, id, history),
      targetSets: meta.targetSets,
      targetReps: meta.targetReps,
      completedReps: [],
      done: false,
    };
  });

  return {
    id: crypto.randomUUID(),
    profileId: profile.id,
    date: Date.now(),
    dayId: day.id,
    dayName: day.name,
    exercises,
    completed: false,
  };
}

/** Advance the rotation after a session is completed. */
export function advanceRotation(
  prev: RotationState | null,
  routine: Routine,
  profileId: string,
  dayId: string
): RotationState {
  const len = Math.max(1, routine.days.length);
  // In rotation mode, advance past the day that was just trained.
  let cycleIndex = prev ? prev.cycleIndex : 0;
  if (routine.scheduleMode === "rotation") {
    const trainedIdx = routine.days.findIndex((d) => d.id === dayId);
    cycleIndex = ((trainedIdx >= 0 ? trainedIdx : cycleIndex) + 1) % len;
  }
  return {
    profileId,
    cycleIndex,
    lastTrained: { ...(prev?.lastTrained ?? {}), [dayId]: Date.now() },
  };
}
