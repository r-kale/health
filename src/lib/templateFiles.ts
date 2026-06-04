import { CATALOG_BY_ID } from "../data/exercises";
import type { Equipment, RoutineTemplate } from "../types";

// ---- Portable template files -------------------------------------------
// Human-readable, versioned JSON you can download, edit in any text editor,
// and re-upload. Two kinds:
//   - gym-tracker-plan:     a workout plan (days + exercises)
//   - gym-tracker-machines: a set of machines with their settings
// Exercises are referenced by both a stable `id` (for round-tripping on the
// same device) and a `name` (so the file stays readable and editable).

export const PLAN_TYPE = "gym-tracker-plan";
export const MACHINES_TYPE = "gym-tracker-machines";

export interface PlanFileExercise {
  id?: string;
  name: string;
}
export interface PlanFileDay {
  name: string;
  exercises: PlanFileExercise[];
}
export interface PlanFile {
  type: typeof PLAN_TYPE;
  version: 1;
  name: string;
  days: PlanFileDay[];
}

export interface MachineFileItem {
  name: string;
  muscleGroups: string[];
  settings: { label: string; value: string }[];
}
export interface MachineFile {
  type: typeof MACHINES_TYPE;
  version: 1;
  name: string;
  machines: MachineFileItem[];
}

const nameFor = (id: string, equipment: Equipment[]) =>
  CATALOG_BY_ID[id]?.name ?? equipment.find((e) => e.id === id)?.name ?? id;

/** Serialise a stored plan template to a portable file. */
export function exportPlanFile(t: RoutineTemplate, equipment: Equipment[]): string {
  const file: PlanFile = {
    type: PLAN_TYPE,
    version: 1,
    name: t.name,
    days: t.days.map((d) => ({
      name: d.name,
      exercises: d.exerciseIds.map((id) => ({ id, name: nameFor(id, equipment) })),
    })),
  };
  return JSON.stringify(file, null, 2);
}

/** Serialise the user's machines to a portable file. */
export function exportMachinesFile(name: string, machines: Equipment[]): string {
  const file: MachineFile = {
    type: MACHINES_TYPE,
    version: 1,
    name,
    machines: machines.map((m) => ({
      name: m.name,
      muscleGroups: m.muscleGroups,
      settings: m.settings,
    })),
  };
  return JSON.stringify(file, null, 2);
}

export type ParsedFile =
  | { kind: "plan"; data: PlanFile }
  | { kind: "machines"; data: MachineFile };

/** Validate and classify an uploaded template file. Throws on bad input. */
export function parseTemplateFile(json: string): ParsedFile {
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const o = obj as Record<string, unknown>;

  if (o.type === PLAN_TYPE) {
    if (!Array.isArray(o.days)) throw new Error("Plan file is missing a 'days' list.");
    const days: PlanFileDay[] = (o.days as PlanFileDay[]).map((d) => ({
      name: String(d?.name ?? "Day"),
      exercises: Array.isArray(d?.exercises)
        ? d.exercises
            .map((e) => ({ id: e?.id ? String(e.id) : undefined, name: String(e?.name ?? "").trim() }))
            .filter((e) => e.name)
        : [],
    }));
    return { kind: "plan", data: { type: PLAN_TYPE, version: 1, name: String(o.name ?? "Imported plan"), days } };
  }

  if (o.type === MACHINES_TYPE) {
    if (!Array.isArray(o.machines)) throw new Error("Machine file is missing a 'machines' list.");
    const machines: MachineFileItem[] = (o.machines as MachineFileItem[])
      .map((m) => ({
        name: String(m?.name ?? "").trim(),
        muscleGroups: Array.isArray(m?.muscleGroups) ? m.muscleGroups.map(String) : [],
        settings: Array.isArray(m?.settings)
          ? m.settings.map((s) => ({ label: String(s?.label ?? ""), value: String(s?.value ?? "") }))
          : [],
      }))
      .filter((m) => m.name);
    return { kind: "machines", data: { type: MACHINES_TYPE, version: 1, name: String(o.name ?? "Imported machines"), machines } };
  }

  throw new Error("Unrecognised file. Expected a Gym Tracker plan or machines template.");
}

/** Trigger a browser download of a text file. */
export function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Safe filename slug from a template name. */
export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "template";
}
