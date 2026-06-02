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
import type {
  Equipment,
  Profile,
  RotationState,
  Routine,
  RoutineDay,
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

  createProfile: (name: string) => Promise<Profile>;
  updateProfile: (p: Profile) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;

  /** Routine day suggested for now (respects schedule mode). */
  suggestedDay: () => RoutineDay | null;
  /** Build a logged-session draft for a given routine day. */
  buildDay: (dayId: string) => Session | null;
  completeSession: (s: Session) => Promise<void>;
  saveRoutine: (r: Routine) => Promise<void>;
  addEquipment: (name: string, value: number) => Promise<void>;

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

  // Initial load.
  useEffect(() => {
    (async () => {
      const [ps, cid] = await Promise.all([repo.getProfiles(), repo.getCurrentProfileId()]);
      setProfiles(ps);
      setCurrentId(cid);
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
    async (name: string, value: number) => {
      if (!currentProfile) return;
      const e: Equipment = {
        id: crypto.randomUUID(),
        profileId: currentProfile.id,
        name: name.trim(),
        muscleGroups: [],
        settings: value ? [{ label: "Current value", value: String(value) }] : [],
        source: "user",
        createdAt: Date.now(),
      };
      await repo.saveEquipment(e);
      setEquipment((prev) => [...prev, e]);
    },
    [currentProfile]
  );

  const exportData = useCallback(() => repo.exportAll(), []);
  const importData = useCallback(async (json: string) => {
    await repo.importAll(json);
    const ps = await repo.getProfiles();
    setProfiles(ps);
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
    createProfile,
    updateProfile,
    selectProfile,
    suggestedDay,
    buildDay,
    completeSession,
    saveRoutine,
    addEquipment,
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
