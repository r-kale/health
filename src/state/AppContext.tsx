import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { repo } from "../storage/idbRepository";
import { advanceRotation, buildSessionForDay, pickDay } from "../engine/suggest";
import { buildDefaultRoutine } from "../data/templates";
import { CATALOG_BY_ID } from "../data/exercises";
import type { MachineFile, PlanFile } from "../lib/templateFiles";
import type {
  Equipment,
  Profile,
  RotationState,
  Routine,
  RoutineDay,
  RoutineTemplate,
  Session,
} from "../types";

interface AppState {
  loading: boolean;
  /** True once the active profile's data is loaded. */
  ready: boolean;
  profiles: Profile[];
  currentProfile: Profile | null;
  equipment: Equipment[];
  sessions: Session[];
  rotation: RotationState | null;
  routine: Routine | null;
  templates: RoutineTemplate[];

  createProfile: (name: string) => Promise<Profile>;
  updateProfile: (p: Profile) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;

  /** Routine day suggested for now (respects schedule mode). */
  suggestedDay: () => RoutineDay | null;
  /** Build a logged-session draft for a given routine day. */
  buildDay: (dayId: string) => Session | null;
  completeSession: (s: Session) => Promise<void>;
  saveRoutine: (r: Routine) => Promise<void>;
  addEquipment: (name: string, value: number) => Promise<Equipment>;

  /** Create or update a machine in the library. */
  upsertEquipment: (e: Equipment) => Promise<void>;
  removeEquipment: (id: string) => Promise<void>;

  saveAsTemplate: (name: string) => Promise<void>;
  applyTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  /** Import a downloaded/edited plan file into My Templates. */
  importPlanFile: (file: PlanFile) => Promise<void>;
  /** Import a downloaded/edited machines file into the library. */
  importMachineFile: (file: MachineFile) => Promise<void>;

  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rotation, setRotation] = useState<RotationState | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);

  // Initial load.
  useEffect(() => {
    (async () => {
      const [ps, cid, tpls] = await Promise.all([
        repo.getProfiles(),
        repo.getCurrentProfileId(),
        repo.getTemplates(),
      ]);
      setProfiles(ps);
      setCurrentId(cid);
      setTemplates(tpls);
      setLoading(false);
    })();
  }, []);

  // Load per-profile data whenever the active profile changes.
  useEffect(() => {
    if (!currentId) {
      setEquipment([]);
      setSessions([]);
      setRotation(null);
      setRoutine(null);
      setReady(false);
      return;
    }
    setReady(false);
    let cancelled = false;
    (async () => {
      const [eq, ss, rot, allProfiles] = await Promise.all([
        repo.getEquipment(currentId),
        repo.getSessions(currentId),
        repo.getRotation(currentId),
        repo.getProfiles(),
      ]);
      let rt = await repo.getRoutine(currentId);
      // Migration: onboarded profiles created before routines existed get a
      // sensible default generated from their goal + gym type.
      const prof = allProfiles.find((p) => p.id === currentId);
      if (!rt && prof?.onboarded) {
        rt = buildDefaultRoutine(prof.id, prof.goal, prof.gymType);
        await repo.saveRoutine(rt);
      }
      if (cancelled) return;
      setEquipment(eq);
      setSessions(ss);
      setRotation(rot);
      setRoutine(rt);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  const currentProfile = useMemo(
    () => profiles.find((p) => p.id === currentId) ?? null,
    [profiles, currentId]
  );

  const createProfile = useCallback(async (name: string) => {
    const p: Profile = {
      id: crypto.randomUUID(),
      name: name.trim() || "Athlete",
      goal: "general",
      experience: "intermediate",
      gymType: "full",
      onboarded: false,
      createdAt: Date.now(),
    };
    await repo.saveProfile(p);
    await repo.setCurrentProfileId(p.id);
    setProfiles((prev) => [...prev, p]);
    setCurrentId(p.id);
    return p;
  }, []);

  const updateProfile = useCallback(
    async (p: Profile) => {
      await repo.saveProfile(p);
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      // Generate the starter routine the first time onboarding completes.
      if (p.onboarded && p.id === currentId && !(await repo.getRoutine(p.id))) {
        const rt = buildDefaultRoutine(p.id, p.goal, p.gymType);
        await repo.saveRoutine(rt);
        setRoutine(rt);
      }
    },
    [currentId]
  );

  const selectProfile = useCallback(async (id: string | null) => {
    await repo.setCurrentProfileId(id);
    setCurrentId(id);
  }, []);

  const suggestedDay = useCallback((): RoutineDay | null => {
    if (!routine) return null;
    return pickDay(routine, rotation);
  }, [routine, rotation]);

  const buildDay = useCallback(
    (dayId: string): Session | null => {
      if (!currentProfile || !routine) return null;
      const day = routine.days.find((d) => d.id === dayId);
      if (!day) return null;
      return buildSessionForDay(currentProfile, day, sessions, equipment);
    },
    [currentProfile, routine, sessions, equipment]
  );

  const completeSession = useCallback(
    async (s: Session) => {
      const done: Session = { ...s, completed: true, date: Date.now() };
      await repo.saveSession(done);
      setSessions((prev) => [done, ...prev]);
      if (routine && s.dayId) {
        const rot = advanceRotation(rotation, routine, s.profileId, s.dayId);
        await repo.saveRotation(rot);
        setRotation(rot);
      }
    },
    [rotation, routine]
  );

  const saveRoutine = useCallback(async (r: Routine) => {
    await repo.saveRoutine(r);
    setRoutine(r);
  }, []);

  const addEquipment = useCallback(
    async (name: string, value: number): Promise<Equipment> => {
      const e: Equipment = {
        id: crypto.randomUUID(),
        profileId: currentProfile?.id ?? "",
        name: name.trim(),
        muscleGroups: [],
        settings: value ? [{ label: "Current value", value: String(value) }] : [],
        source: "user",
        createdAt: Date.now(),
      };
      await repo.saveEquipment(e);
      setEquipment((prev) => [...prev, e]);
      return e;
    },
    [currentProfile]
  );

  const upsertEquipment = useCallback(async (e: Equipment) => {
    await repo.saveEquipment(e);
    setEquipment((prev) =>
      prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]
    );
  }, []);

  const removeEquipment = useCallback(async (id: string) => {
    await repo.deleteEquipment(id);
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const saveAsTemplate = useCallback(
    async (name: string) => {
      if (!routine) return;
      const t: RoutineTemplate = {
        id: crypto.randomUUID(),
        name: name.trim() || "My plan",
        // Deep copy days so editing the routine later doesn't mutate the template.
        days: routine.days.map((d) => ({ ...d, exerciseIds: [...d.exerciseIds] })),
        createdAt: Date.now(),
      };
      await repo.saveTemplate(t);
      setTemplates((prev) => [...prev, t]);
    },
    [routine]
  );

  const applyTemplate = useCallback(
    async (templateId: string) => {
      if (!routine) return;
      const t = templates.find((x) => x.id === templateId);
      if (!t) return;
      // Fresh day ids so the new routine is independent of the template.
      const days: RoutineDay[] = t.days.map((d) => ({
        id: crypto.randomUUID(),
        name: d.name,
        exerciseIds: [...d.exerciseIds],
      }));
      const next: Routine = { ...routine, days, weekdayMap: Array(7).fill(null) };
      await repo.saveRoutine(next);
      setRoutine(next);
    },
    [routine, templates]
  );

  const deleteTemplate = useCallback(async (templateId: string) => {
    await repo.deleteTemplate(templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  const importPlanFile = useCallback(
    async (file: PlanFile) => {
      if (!currentProfile) return;
      // Resolve each exercise to an id: catalog match, existing machine by id
      // or name, otherwise create a custom machine so it always resolves later.
      const working = [...equipment];
      const created: Equipment[] = [];
      const resolveId = (ex: { id?: string; name: string }): string => {
        if (ex.id && CATALOG_BY_ID[ex.id]) return ex.id;
        if (ex.id && working.some((e) => e.id === ex.id)) return ex.id;
        const byName = working.find(
          (e) => e.source === "user" && e.name.toLowerCase() === ex.name.toLowerCase()
        );
        if (byName) return byName.id;
        const fresh: Equipment = {
          id: crypto.randomUUID(),
          profileId: currentProfile.id,
          name: ex.name,
          muscleGroups: [],
          settings: [],
          source: "user",
          createdAt: Date.now(),
        };
        working.push(fresh);
        created.push(fresh);
        return fresh.id;
      };

      const days: RoutineDay[] = file.days.map((d) => ({
        id: crypto.randomUUID(),
        name: d.name,
        exerciseIds: d.exercises.map(resolveId),
      }));

      for (const e of created) await repo.saveEquipment(e);
      if (created.length) setEquipment((prev) => [...prev, ...created]);

      const t: RoutineTemplate = {
        id: crypto.randomUUID(),
        name: file.name,
        days,
        createdAt: Date.now(),
      };
      await repo.saveTemplate(t);
      setTemplates((prev) => [...prev, t]);
    },
    [currentProfile, equipment]
  );

  const importMachineFile = useCallback(
    async (file: MachineFile) => {
      if (!currentProfile) return;
      const working = [...equipment];
      const changed: Equipment[] = [];
      for (const m of file.machines) {
        const existing = working.find(
          (e) => e.source === "user" && e.name.toLowerCase() === m.name.toLowerCase()
        );
        const item: Equipment = existing
          ? { ...existing, muscleGroups: m.muscleGroups, settings: m.settings }
          : {
              id: crypto.randomUUID(),
              profileId: currentProfile.id,
              name: m.name,
              muscleGroups: m.muscleGroups,
              settings: m.settings,
              source: "user",
              createdAt: Date.now(),
            };
        await repo.saveEquipment(item);
        changed.push(item);
      }
      setEquipment((prev) => {
        const map = new Map(prev.map((e) => [e.id, e]));
        for (const c of changed) map.set(c.id, c);
        return [...map.values()];
      });
    },
    [currentProfile, equipment]
  );

  const exportData = useCallback(() => repo.exportAll(), []);
  const importData = useCallback(async (json: string) => {
    await repo.importAll(json);
    const [ps, tpls] = await Promise.all([repo.getProfiles(), repo.getTemplates()]);
    setProfiles(ps);
    setTemplates(tpls);
  }, []);

  const value: AppState = {
    loading,
    ready,
    profiles,
    currentProfile,
    equipment,
    sessions,
    rotation,
    routine,
    templates,
    createProfile,
    updateProfile,
    selectProfile,
    suggestedDay,
    buildDay,
    completeSession,
    saveRoutine,
    addEquipment,
    upsertEquipment,
    removeEquipment,
    saveAsTemplate,
    applyTemplate,
    deleteTemplate,
    importPlanFile,
    importMachineFile,
    exportData,
    importData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
