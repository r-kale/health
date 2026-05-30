// ---- Domain types -------------------------------------------------------
// These are deliberately storage-agnostic. The Repository interface
// (see storage/Repository.ts) is the only thing that touches persistence,
// so swapping IndexedDB for a synced backend later changes nothing here.

export type Goal = "general" | "strength" | "hypertrophy" | "fatloss";
export type Experience = "beginner" | "intermediate" | "advanced";

/** High-level "what does your gym have" preset. Seeds the exercise pool. */
export type GymType = "full" | "machines_cardio" | "free_weights" | "home";

/** Rotation slots the cadence engine cycles through. */
export type Focus = "upper" | "lower" | "full";

export interface Profile {
  id: string;
  name: string;
  goal: Goal;
  experience: Experience;
  gymType: GymType;
  onboarded: boolean;
  createdAt: number;
}

/** A piece of equipment the user has confirmed exists in *their* gym. */
export interface Equipment {
  id: string;
  profileId: string;
  name: string;
  muscleGroups: string[];
  /** Flexible saved machine settings: seat height, pin, pad, etc. */
  settings: { label: string; value: string }[];
  /** Phase 2: photo of the machine / its setting dials. */
  photo?: string;
  source: "preset" | "user";
  createdAt: number;
}

/** One exercise inside a logged session. */
export interface LoggedExercise {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  /** Unit the value is expressed in (kg, level, min, bw = bodyweight). */
  unit: string;
  /** The "value you are on" — weight / machine level / etc. */
  value: number;
  targetSets: number;
  targetReps: number;
  /** Reps actually completed per set; length grows as user logs sets. */
  completedReps: number[];
  done: boolean;
}

export interface Session {
  id: string;
  profileId: string;
  date: number;
  focus: Focus;
  exercises: LoggedExercise[];
  completed: boolean;
}

/** Per-profile cadence state — calendar-free, recovery-by-rotation. */
export interface RotationState {
  profileId: string;
  /** Index into the focus cycle for this profile's goal. */
  cycleIndex: number;
  /** Focus -> timestamp last trained, for the "what's due" hint. */
  lastTrained: Partial<Record<Focus, number>>;
}
