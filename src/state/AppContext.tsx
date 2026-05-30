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
import { advanceRotation, suggestSession } from "../engine/suggest";
import type { Equipment, Profile, RotationState, Session } from "../types";

interface AppState {
  loading: boolean;
  /** True once the active profile's data (equipment/sessions/rotation) is loaded. */
  ready: boolean;
  profiles: Profile[];
  currentProfile: Profile | null;
  equipment: Equipment[];
  sessions: Session[];
  rotation: RotationState | null;

  createProfile: (name: string) => Promise<Profile>;
  updateProfile: (p: Profile) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;

  buildToday: () => Session | null;
  completeSession: (s: Session) => Promise<void>;
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
      setReady(false);
      return;
    }
    setReady(false);
    let cancelled = false;
    (async () => {
      const [eq, ss, rot] = await Promise.all([
        repo.getEquipment(currentId),
        repo.getSessions(currentId),
        repo.getRotation(currentId),
      ]);
      if (cancelled) return;
      setEquipment(eq);
      setSessions(ss);
      setRotation(rot);
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

  const updateProfile = useCallback(async (p: Profile) => {
    await repo.saveProfile(p);
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }, []);

  const selectProfile = useCallback(async (id: string | null) => {
    await repo.setCurrentProfileId(id);
    setCurrentId(id);
  }, []);

  const buildToday = useCallback((): Session | null => {
    if (!currentProfile) return null;
    return suggestSession(currentProfile, sessions, rotation, equipment);
  }, [currentProfile, sessions, rotation, equipment]);

  const completeSession = useCallback(
    async (s: Session) => {
      const done: Session = { ...s, completed: true, date: Date.now() };
      await repo.saveSession(done);
      const rot = advanceRotation(rotation, s.profileId, s.focus);
      await repo.saveRotation(rot);
      setSessions((prev) => [done, ...prev]);
      setRotation(rot);
    },
    [rotation]
  );

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
    createProfile,
    updateProfile,
    selectProfile,
    buildToday,
    completeSession,
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
