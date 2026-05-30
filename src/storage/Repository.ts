import type { Equipment, Profile, RotationState, Session } from "../types";

// ---- Repository interface ----------------------------------------------
// The ONLY persistence contract in the app. Phase 1 ships an IndexedDB
// implementation; a future hosted/synced backend just provides another
// implementation of this same interface — no UI or engine changes needed.

export interface Repository {
  getProfiles(): Promise<Profile[]>;
  saveProfile(p: Profile): Promise<void>;
  deleteProfile(id: string): Promise<void>;

  getCurrentProfileId(): Promise<string | null>;
  setCurrentProfileId(id: string | null): Promise<void>;

  getEquipment(profileId: string): Promise<Equipment[]>;
  saveEquipment(e: Equipment): Promise<void>;

  getSessions(profileId: string): Promise<Session[]>;
  saveSession(s: Session): Promise<void>;

  getRotation(profileId: string): Promise<RotationState | null>;
  saveRotation(r: RotationState): Promise<void>;

  /** Whole-store export/import — lets the family move data between devices. */
  exportAll(): Promise<string>;
  importAll(json: string): Promise<void>;
}
