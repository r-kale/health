import { CATALOG, type CatalogExercise } from "../data/exercises";
import type {
  Equipment,
  Focus,
  LoggedExercise,
  Profile,
  RotationState,
  Session,
} from "../types";

// ---- Rule-based cadence + progression engine ----------------------------
// Pure functions: (profile, history, rotation, equipment) -> a planned
// session. Same input/output contract a future AI generator will satisfy,
// so the engine can be swapped without touching UI or storage.

/** Calendar-free rotation. General fitness rotates upper -> lower -> full. */
export const FOCUS_CYCLE: Focus[] = ["upper", "lower", "full"];

export function nextFocus(rotation: RotationState | null): Focus {
  const idx = rotation ? rotation.cycleIndex % FOCUS_CYCLE.length : 0;
  return FOCUS_CYCLE[idx];
}

/** Human hint about how long since this focus was last trained. */
export function recoveryHint(rotation: RotationState | null, focus: Focus): string {
  const last = rotation?.lastTrained?.[focus];
  if (!last) return "Not trained yet — good place to start.";
  const days = Math.floor((Date.now() - last) / 86_400_000);
  if (days <= 0) return "Trained today already.";
  if (days === 1) return "Last done yesterday.";
  return `Last done ${days} days ago.`;
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
function progress(ex: CatalogExercise, history: Session[], experience: Profile["experience"]): number {
  const last = lastResultFor(ex.id, history);
  if (!last) return ex.start[experience];
  return last.hitTargets ? +(last.value + ex.step).toFixed(2) : last.value;
}

const MAX_EXERCISES = 6;

/**
 * Build today's suggested session for a profile.
 * Picks catalog exercises matching the gym type and focus slot, prioritising
 * variety across muscle groups, and assigns each a progressed starting value.
 */
export function suggestSession(
  profile: Profile,
  history: Session[],
  rotation: RotationState | null,
  equipment: Equipment[]
): Session {
  const focus = nextFocus(rotation);

  const pool = CATALOG.filter(
    (e) => e.gyms.includes(profile.gymType) && e.focus.includes(focus)
  );

  // Prefer one exercise per muscle group first for balance, then fill up.
  const picked: CatalogExercise[] = [];
  const seenMuscles = new Set<string>();
  for (const e of pool) {
    const primary = e.muscleGroups[0];
    if (!seenMuscles.has(primary)) {
      picked.push(e);
      seenMuscles.add(primary);
    }
    if (picked.length >= MAX_EXERCISES) break;
  }
  for (const e of pool) {
    if (picked.length >= MAX_EXERCISES) break;
    if (!picked.includes(e)) picked.push(e);
  }

  const userExtras = equipment.filter((e) => e.source === "user");

  const exercises: LoggedExercise[] = picked.map((e) => ({
    exerciseId: e.id,
    name: e.name,
    muscleGroups: e.muscleGroups,
    unit: e.unit,
    value: progress(e, history, profile.experience),
    targetSets: e.defaultSets,
    targetReps: e.defaultReps,
    completedReps: [],
    done: false,
  }));

  // Surface user-added machines that aren't already in the plan.
  for (const eq of userExtras) {
    if (exercises.some((x) => x.exerciseId === eq.id)) continue;
    exercises.push({
      exerciseId: eq.id,
      name: eq.name,
      muscleGroups: eq.muscleGroups,
      unit: "kg",
      value: 0,
      targetSets: 3,
      targetReps: 10,
      completedReps: [],
      done: false,
    });
  }

  return {
    id: crypto.randomUUID(),
    profileId: profile.id,
    date: Date.now(),
    focus,
    exercises,
    completed: false,
  };
}

/** Advance the rotation after a session is completed. */
export function advanceRotation(
  prev: RotationState | null,
  profileId: string,
  focus: Focus
): RotationState {
  const cycleIndex = (prev ? prev.cycleIndex + 1 : 1) % FOCUS_CYCLE.length;
  return {
    profileId,
    cycleIndex,
    lastTrained: { ...(prev?.lastTrained ?? {}), [focus]: Date.now() },
  };
}
