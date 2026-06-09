import type { LoggedExercise, LoggedSet } from "../types";

// ---- Per-set helpers ----------------------------------------------------
// Centralises set logic and bridges legacy sessions (value/completedReps)
// to the per-set model so history and progress keep working.

export function seedSets(count: number, weight: number, reps: number): LoggedSet[] {
  return Array.from({ length: Math.max(1, count) }, () => ({ weight, reps, done: false }));
}

/** Sets for an exercise, reconstructing them from legacy fields if needed. */
export function getSets(ex: LoggedExercise): LoggedSet[] {
  if (ex.sets && ex.sets.length) return ex.sets;
  if (ex.completedReps && ex.completedReps.length) {
    return ex.completedReps.map((reps) => ({ weight: ex.value ?? 0, reps, done: true }));
  }
  return seedSets(ex.targetSets, ex.value ?? 0, ex.targetReps);
}

/** True if any set is marked done (or the legacy whole-exercise flag is set). */
export function isExerciseDone(ex: LoggedExercise): boolean {
  if (ex.sets && ex.sets.length) return ex.sets.some((s) => s.done);
  return !!ex.done;
}

/** The representative working weight — the heaviest completed set. */
export function workingWeight(ex: LoggedExercise): number {
  const sets = getSets(ex).filter((s) => s.done);
  const pool = sets.length ? sets : getSets(ex);
  return pool.reduce((mx, s) => Math.max(mx, s.weight), 0);
}

/** Whether the planned targets were met (for progressive overload). */
export function hitTargets(ex: LoggedExercise): boolean {
  const done = getSets(ex).filter((s) => s.done);
  return done.length >= ex.targetSets && done.every((s) => s.reps >= ex.targetReps);
}

/** Compact summary: "3 × 51.5kg × 10" when uniform, else "50×10, 50×8, 45×8". */
export function setsSummary(ex: LoggedExercise, unit: string): string {
  const done = getSets(ex).filter((s) => s.done);
  const sets = done.length ? done : getSets(ex);
  if (sets.length === 0) return "—";
  const u = unit === "bw" ? "" : unit;
  const uniform = sets.every((s) => s.weight === sets[0].weight && s.reps === sets[0].reps);
  if (uniform) {
    const s = sets[0];
    return `${sets.length} × ${s.weight}${u} × ${s.reps}`;
  }
  return sets.map((s) => `${s.weight}${u}×${s.reps}`).join(", ");
}
