import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Equipment, Profile, RotationState, Session } from "../types";
import type { Repository } from "./Repository";

interface GymDB extends DBSchema {
  profiles: { key: string; value: Profile };
  equipment: { key: string; value: Equipment; indexes: { byProfile: string } };
  sessions: { key: string; value: Session; indexes: { byProfile: string } };
  rotation: { key: string; value: RotationState };
  meta: { key: string; value: string };
}

const DB_NAME = "gym-tracker";
const DB_VERSION = 1;

function open(): Promise<IDBPDatabase<GymDB>> {
  return openDB<GymDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("profiles", { keyPath: "id" });
      const eq = db.createObjectStore("equipment", { keyPath: "id" });
      eq.createIndex("byProfile", "profileId");
      const se = db.createObjectStore("sessions", { keyPath: "id" });
      se.createIndex("byProfile", "profileId");
      db.createObjectStore("rotation", { keyPath: "profileId" });
      db.createObjectStore("meta");
    },
  });
}

export class IdbRepository implements Repository {
  private dbp = open();

  async getProfiles(): Promise<Profile[]> {
    return (await this.dbp).getAll("profiles");
  }
  async saveProfile(p: Profile): Promise<void> {
    await (await this.dbp).put("profiles", p);
  }
  async deleteProfile(id: string): Promise<void> {
    const db = await this.dbp;
    await db.delete("profiles", id);
    await db.delete("rotation", id);
    for (const e of await db.getAllFromIndex("equipment", "byProfile", id)) {
      await db.delete("equipment", e.id);
    }
    for (const s of await db.getAllFromIndex("sessions", "byProfile", id)) {
      await db.delete("sessions", s.id);
    }
  }

  async getCurrentProfileId(): Promise<string | null> {
    return (await (await this.dbp).get("meta", "currentProfileId")) ?? null;
  }
  async setCurrentProfileId(id: string | null): Promise<void> {
    const db = await this.dbp;
    if (id) await db.put("meta", id, "currentProfileId");
    else await db.delete("meta", "currentProfileId");
  }

  async getEquipment(profileId: string): Promise<Equipment[]> {
    return (await this.dbp).getAllFromIndex("equipment", "byProfile", profileId);
  }
  async saveEquipment(e: Equipment): Promise<void> {
    await (await this.dbp).put("equipment", e);
  }

  async getSessions(profileId: string): Promise<Session[]> {
    const all = await (await this.dbp).getAllFromIndex("sessions", "byProfile", profileId);
    return all.sort((a, b) => b.date - a.date);
  }
  async saveSession(s: Session): Promise<void> {
    await (await this.dbp).put("sessions", s);
  }

  async getRotation(profileId: string): Promise<RotationState | null> {
    return (await (await this.dbp).get("rotation", profileId)) ?? null;
  }
  async saveRotation(r: RotationState): Promise<void> {
    await (await this.dbp).put("rotation", r);
  }

  async exportAll(): Promise<string> {
    const db = await this.dbp;
    const dump = {
      version: DB_VERSION,
      profiles: await db.getAll("profiles"),
      equipment: await db.getAll("equipment"),
      sessions: await db.getAll("sessions"),
      rotation: await db.getAll("rotation"),
    };
    return JSON.stringify(dump, null, 2);
  }
  async importAll(json: string): Promise<void> {
    const data = JSON.parse(json);
    const db = await this.dbp;
    const tx = db.transaction(["profiles", "equipment", "sessions", "rotation"], "readwrite");
    for (const p of data.profiles ?? []) await tx.objectStore("profiles").put(p);
    for (const e of data.equipment ?? []) await tx.objectStore("equipment").put(e);
    for (const s of data.sessions ?? []) await tx.objectStore("sessions").put(s);
    for (const r of data.rotation ?? []) await tx.objectStore("rotation").put(r);
    await tx.done;
  }
}

export const repo: Repository = new IdbRepository();
