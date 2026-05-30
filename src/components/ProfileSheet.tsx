import { useRef, useState } from "react";
import { useApp } from "../state/AppContext";
import { GOAL_LABELS, GYM_PRESETS } from "../data/exercises";

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { profiles, currentProfile, selectProfile, createProfile, exportData, importData } =
    useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gym-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    await importData(await file.text());
    onClose();
  };

  const gymLabel = (id: string) => GYM_PRESETS.find((g) => g.id === id)?.label ?? id;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 style={{ margin: 0 }}>Profiles</h2>
          <button className="ghost sm" onClick={onClose}>Close</button>
        </div>

        {profiles.map((p) => (
          <button
            key={p.id}
            className={`choice ${p.id === currentProfile?.id ? "selected" : ""}`}
            style={{ width: "100%", marginTop: 10 }}
            onClick={async () => {
              await selectProfile(p.id);
              onClose();
            }}
          >
            <b>{p.name}</b>
            <small>
              {p.onboarded ? `${GOAL_LABELS[p.goal]} · ${gymLabel(p.gymType)}` : "Not set up yet"}
            </small>
          </button>
        ))}

        <div style={{ height: 14 }} />
        {creating ? (
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (e.g. Rahul, Aarav, Priya)"
              autoFocus
            />
            <div style={{ height: 10 }} />
            <div className="row">
              <button className="ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  await createProfile(name);
                  onClose();
                }}
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button className="ghost block" onClick={() => setCreating(true)}>+ Add profile</button>
        )}

        <h2>Data</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Local to this device. Export to move it to another phone or laptop.
        </p>
        <div className="row">
          <button className="ghost" onClick={doExport}>Export backup</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>Import backup</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
      </div>
    </div>
  );
}
