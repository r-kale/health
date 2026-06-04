import { useState } from "react";
import { useApp } from "../state/AppContext";
import { downloadFile, exportMachinesFile, slug } from "../lib/templateFiles";
import type { Equipment } from "../types";

interface Draft {
  id?: string;
  name: string;
  muscleGroups: string;
  settings: { label: string; value: string }[];
}

const empty: Draft = { name: "", muscleGroups: "", settings: [{ label: "", value: "" }] };

export function Machines() {
  const { equipment, currentProfile, upsertEquipment, removeEquipment } = useApp();
  const [draft, setDraft] = useState<Draft | null>(null);

  const machines = equipment.filter((e) => e.source === "user");

  const edit = (e: Equipment) =>
    setDraft({
      id: e.id,
      name: e.name,
      muscleGroups: e.muscleGroups.join(", "),
      settings: e.settings.length ? e.settings : [{ label: "", value: "" }],
    });

  const save = async () => {
    if (!draft || !currentProfile || !draft.name.trim()) return;
    const existing = equipment.find((e) => e.id === draft.id);
    const item: Equipment = {
      id: draft.id ?? crypto.randomUUID(),
      profileId: currentProfile.id,
      name: draft.name.trim(),
      muscleGroups: draft.muscleGroups.split(",").map((s) => s.trim()).filter(Boolean),
      settings: draft.settings.filter((s) => s.label.trim() || s.value.trim()),
      source: "user",
      createdAt: existing?.createdAt ?? Date.now(),
      photo: existing?.photo,
    };
    await upsertEquipment(item);
    setDraft(null);
  };

  const download = () =>
    downloadFile(
      `${slug(currentProfile?.name ?? "my")}-machines.json`,
      exportMachinesFile(`${currentProfile?.name ?? "My"} machines`, machines)
    );

  return (
    <>
      <h2>Machines & settings</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Save each machine's settings (seat, pin, pad…). Download as a template to edit or share.
      </p>

      {machines.map((m) => (
        <div className="card" key={m.id}>
          <div className="row">
            <div>
              <b>{m.name}</b>
              {m.muscleGroups.length > 0 && (
                <div className="muted">{m.muscleGroups.join(" · ")}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="sm ghost" onClick={() => edit(m)}>Edit</button>
              <button className="sm ghost" onClick={() => removeEquipment(m.id)}>✕</button>
            </div>
          </div>
          {m.settings.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {m.settings.map((s, i) => (
                <div className="row" key={i} style={{ padding: "2px 0" }}>
                  <span className="muted">{s.label}</span>
                  <span>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {machines.length === 0 && <div className="card muted">No machines saved yet.</div>}

      <div className="row" style={{ gap: 8 }}>
        <button className="ghost block" onClick={() => setDraft({ ...empty })}>+ Add machine</button>
        <button className="ghost block" onClick={download} disabled={machines.length === 0}>
          ⬇ Download
        </button>
      </div>

      {draft && (
        <div className="sheet-backdrop" onClick={() => setDraft(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <div className="row">
              <h2 style={{ margin: 0 }}>{draft.id ? "Edit machine" : "Add machine"}</h2>
              <button className="ghost sm" onClick={() => setDraft(null)}>Cancel</button>
            </div>
            <label className="field">
              <span>Name</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Leg Press" autoFocus />
            </label>
            <label className="field">
              <span>Muscle groups (comma-separated)</span>
              <input value={draft.muscleGroups} onChange={(e) => setDraft({ ...draft, muscleGroups: e.target.value })} placeholder="quads, glutes" />
            </label>

            <span className="muted">Settings</span>
            {draft.settings.map((s, i) => (
              <div className="row" key={i} style={{ gap: 8, marginTop: 6 }}>
                <input
                  placeholder="Label (Seat)"
                  value={s.label}
                  onChange={(e) =>
                    setDraft({ ...draft, settings: draft.settings.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })
                  }
                />
                <input
                  placeholder="Value (4)"
                  value={s.value}
                  onChange={(e) =>
                    setDraft({ ...draft, settings: draft.settings.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })
                  }
                />
                <button
                  className="sm ghost"
                  onClick={() => setDraft({ ...draft, settings: draft.settings.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="sm ghost block"
              style={{ marginTop: 8 }}
              onClick={() => setDraft({ ...draft, settings: [...draft.settings, { label: "", value: "" }] })}
            >
              + Setting
            </button>

            <div style={{ height: 14 }} />
            <button className="success block" onClick={save} disabled={!draft.name.trim()}>Save machine</button>
          </div>
        </div>
      )}
    </>
  );
}
