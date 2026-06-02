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

/** One logged set: a weight and rep count the user can edit independently. */
export interface LoggedSet {
  weight: number;
  reps: number;
  done: boolean;
}

/** One exercise inside a logged session. */
export interface LoggedExercise {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  /** Unit the value is expressed in (kg, level, min, bw = bodyweight). */
  unit: string;
  /** Default targets used to seed the sets. */
  targetSets: number;
  targetReps: number;
  /** Per-set weight + reps. Editable any time, even after marked done. */
  sets: LoggedSet[];
  // --- legacy fields kept so sessions logged before per-set logging still read ---
  /** @deprecated single working value; superseded by per-set weights. */
  value?: number;
  /** @deprecated reps per completed set; superseded by `sets`. */
  completedReps?: number[];
  /** @deprecated whole-exercise done flag; now derived from `sets`. */
  done?: boolean;
}

export interface Session {
  id: string;
  profileId: string;
  date: number;
  /** @deprecated kept for older logged sessions; new sessions use dayName. */
  focus?: Focus;
  /** Id of the routine day this session came from. */
  dayId?: string;
  /** Human label for the session, e.g. "Push", "Legs". */
  dayName?: string;
  exercises: LoggedExercise[];
  completed: boolean;
}

// ---- Customisable routine ----------------------------------------------

/** One training day in the user's routine: an ordered list of exercises. */
export interface RoutineDay {
  id: string;
  name: string;
  /** Ordered exercise ids (catalog ids or custom equipment ids). */
  exerciseIds: string[];
}

export type ScheduleMode = "rotation" | "weekday";

/** A profile's editable routine — order of days and how they're scheduled. */
export interface Routine {
  profileId: string;
  days: RoutineDay[];
  scheduleMode: ScheduleMode;
  /**
   * Weekday assignment for "weekday" mode. Index 0 = Sunday … 6 = Saturday.
   * Each entry is a RoutineDay id, or null for a rest day.
   */
  weekdayMap: (string | null)[];
}

/** Per-profile cadence state — calendar-free, recovery-by-rotation. */
export interface RotationState {
  profileId: string;
  /** Index into the routine's day list for the next "anytime" session. */
  cycleIndex: number;
  /** RoutineDay id -> timestamp last trained, for the "what's due" hint. */
  lastTrained: Record<string, number>;
}

/** A saved, reusable workout plan — shared across all profiles on the device. */
export interface RoutineTemplate {
  id: string;
  name: string;
  days: RoutineDay[];
  createdAt: number;
}
