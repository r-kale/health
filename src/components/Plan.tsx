import { useState } from "react";
import { useApp } from "../state/AppContext";
import { CATALOG, CATALOG_BY_ID } from "../data/exercises";
import { DAY_TEMPLATES, SPLIT_PRESETS, dayFromTemplate, exercisesForTemplate } from "../data/templates";
import type { Routine, RoutineDay, ScheduleMode } from "../types";

const WEEKDAYS = [
  { idx: 1, label: "Mon" },
  { idx: 2, label: "Tue" },
  { idx: 3, label: "Wed" },
  { idx: 4, label: "Thu" },
  { idx: 5, label: "Fri" },
  { idx: 6, label: "Sat" },
  { idx: 0, label: "Sun" },
];

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

export function Plan() {
  const { routine, saveRoutine, currentProfile, equipment, templates, saveAsTemplate, applyTemplate, deleteTemplate } =
    useApp();
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState(false);

  if (!routine || !currentProfile) {
    return <div className="content center muted">Loading…</div>;
  }
  const gym = currentProfile.gymType;

  const commit = (r: Routine) => saveRoutine(r);

  const exerciseName = (id: string) =>
    CATALOG_BY_ID[id]?.name ?? equipment.find((e) => e.id === id)?.name ?? "Exercise";

  // --- day-level mutations ---
  const renameDay = (id: string, name: string) =>
    commit({ ...routine, days: routine.days.map((d) => (d.id === id ? { ...d, name } : d)) });

  const reorderDay = (i: number, dir: -1 | 1) =>
    commit({ ...routine, days: move(routine.days, i, dir) });

  const deleteDay = (id: string) =>
    commit({
      ...routine,
      days: routine.days.filter((d) => d.id !== id),
      weekdayMap: routine.weekdayMap.map((w) => (w === id ? null : w)),
    });

  const addDay = (templateKey: string) => {
    const day =
      templateKey === "blank"
        ? { id: crypto.randomUUID(), name: "New day", exerciseIds: [] }
        : dayFromTemplate(templateKey, gym);
    commit({ ...routine, days: [...routine.days, day] });
    setAddingDay(false);
  };

  const applyPreset = (presetId: string) => {
    const preset = SPLIT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (!confirm(`Replace your days with "${preset.label}"? Your logged history stays.`)) return;
    commit({ ...routine, days: preset.days.map((k) => dayFromTemplate(k, gym)) });
  };

  // --- exercise-level mutations ---
  const mutateDay = (id: string, fn: (d: RoutineDay) => RoutineDay) =>
    commit({ ...routine, days: routine.days.map((d) => (d.id === id ? fn(d) : d)) });

  const reorderExercise = (dayId: string, i: number, dir: -1 | 1) =>
    mutateDay(dayId, (d) => ({ ...d, exerciseIds: move(d.exerciseIds, i, dir) }));

  const removeExercise = (dayId: string, exId: string) =>
    mutateDay(dayId, (d) => ({ ...d, exerciseIds: d.exerciseIds.filter((x) => x !== exId) }));

  const addExercise = (dayId: string, exId: string) =>
    mutateDay(dayId, (d) =>
      d.exerciseIds.includes(exId) ? d : { ...d, exerciseIds: [...d.exerciseIds, exId] }
    );

  // --- schedule ---
  const setMode = (mode: ScheduleMode) => commit({ ...routine, scheduleMode: mode });
  const setWeekday = (dow: number, dayId: string | null) =>
    commit({
      ...routine,
      weekdayMap: routine.weekdayMap.map((w, i) => (i === dow ? dayId : w)),
    });

  // Exercises available to add: catalog for this gym + custom machines.
  const available = [
    ...CATALOG.filter((e) => e.gyms.includes(gym)).map((e) => ({
      id: e.id,
      name: e.name,
      tag: e.muscleGroups[0],
    })),
    ...equipment
      .filter((e) => e.source === "user")
      .map((e) => ({ id: e.id, name: e.name, tag: "custom" })),
  ];

  return (
    <div className="content">
      <h1>Your plan</h1>
      <p className="sub">Reorder days, edit exercises, and choose how it's scheduled.</p>

      {/* Schedule */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Schedule</h2>
        <div className="choice-grid">
          <button
            className={`choice ${routine.scheduleMode === "rotation" ? "selected" : ""}`}
            onClick={() => setMode("rotation")}
          >
            <b>Anytime rotation</b>
            <small>Cycles your days in order whenever you train</small>
          </button>
          <button
            className={`choice ${routine.scheduleMode === "weekday" ? "selected" : ""}`}
            onClick={() => setMode("weekday")}
          >
            <b>By weekday</b>
            <small>Fixed day-of-week assignment</small>
          </button>
        </div>

        {routine.scheduleMode === "rotation" && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Order below = sequence. The first day is where you'll start next.
          </p>
        )}

        {routine.scheduleMode === "weekday" && (
          <div style={{ marginTop: 12 }}>
            {WEEKDAYS.map((w) => (
              <div className="row" key={w.idx} style={{ padding: "5px 0" }}>
                <span style={{ width: 44 }}>{w.label}</span>
                <select
                  value={routine.weekdayMap[w.idx] ?? ""}
                  onChange={(e) => setWeekday(w.idx, e.target.value || null)}
                >
                  <option value="">Rest</option>
                  {routine.days.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Days */}
      <h2>Training days</h2>
      {routine.days.map((day, i) => (
        <div className="card" key={day.id}>
          <div className="ex-head" style={{ alignItems: "center" }}>
            <input
              value={day.name}
              onChange={(e) => renameDay(day.id, e.target.value)}
              style={{ fontWeight: 700, maxWidth: 180 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="sm ghost" disabled={i === 0} onClick={() => reorderDay(i, -1)}>↑</button>
              <button className="sm ghost" disabled={i === routine.days.length - 1} onClick={() => reorderDay(i, 1)}>↓</button>
              <button className="sm ghost" onClick={() => deleteDay(day.id)}>✕</button>
            </div>
          </div>

          <div style={{ height: 10 }} />
          {day.exerciseIds.length === 0 && <div className="muted">No exercises yet.</div>}
          {day.exerciseIds.map((exId, j) => (
            <div className="row" key={exId} style={{ padding: "4px 0" }}>
              <span>{j + 1}. {exerciseName(exId)}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="sm ghost" disabled={j === 0} onClick={() => reorderExercise(day.id, j, -1)}>↑</button>
                <button className="sm ghost" disabled={j === day.exerciseIds.length - 1} onClick={() => reorderExercise(day.id, j, 1)}>↓</button>
                <button className="sm ghost" onClick={() => removeExercise(day.id, exId)}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ height: 8 }} />
          <button className="sm ghost block" onClick={() => setPickerDay(day.id)}>+ Add exercise</button>
        </div>
      ))}

      {addingDay ? (
        <div className="card">
          <b>Add a day</b>
          <div style={{ height: 10 }} />
          <div className="choice-grid">
            {Object.values(DAY_TEMPLATES).map((t) => (
              <button key={t.key} className="choice" onClick={() => addDay(t.key)}>
                <b>{t.name}</b>
                <small>{exercisesForTemplate(t.key, gym).length} exercises</small>
              </button>
            ))}
            <button className="choice" onClick={() => addDay("blank")}>
              <b>Blank</b>
              <small>Start empty</small>
            </button>
          </div>
          <div style={{ height: 10 }} />
          <button className="ghost block" onClick={() => setAddingDay(false)}>Cancel</button>
        </div>
      ) : (
        <button className="ghost block" onClick={() => setAddingDay(true)}>+ Add training day</button>
      )}

      <h2>Start from a preset</h2>
      <p className="muted" style={{ marginTop: 0 }}>Replaces your days with a common split (history is kept).</p>
      {SPLIT_PRESETS.map((p) => (
        <button key={p.id} className="ghost block" style={{ marginBottom: 8, textAlign: "left" }} onClick={() => applyPreset(p.id)}>
          {p.label}
        </button>
      ))}

      <h2>My templates</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Save this plan to reuse it later or load onto another family member's profile.
      </p>
      <button
        className="ghost block"
        style={{ marginBottom: 10 }}
        onClick={() => {
          const name = prompt("Name this plan template:", `${currentProfile.name}'s plan`);
          if (name) saveAsTemplate(name);
        }}
      >
        💾 Save current plan as template
      </button>
      {templates.map((t) => (
        <div className="card" key={t.id}>
          <div className="row">
            <div>
              <b>{t.name}</b>
              <div className="muted">{t.days.length} day{t.days.length === 1 ? "" : "s"}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="sm primary"
                onClick={() => {
                  if (confirm(`Load "${t.name}"? This replaces your current days.`)) applyTemplate(t.id);
                }}
              >
                Load
              </button>
              <button className="sm ghost" onClick={() => deleteTemplate(t.id)}>✕</button>
            </div>
          </div>
        </div>
      ))}

      {/* Exercise picker sheet */}
      {pickerDay && (
        <div className="sheet-backdrop" onClick={() => setPickerDay(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "75vh", overflowY: "auto" }}>
            <div className="row">
              <h2 style={{ margin: 0 }}>Add exercise</h2>
              <button className="ghost sm" onClick={() => setPickerDay(null)}>Done</button>
            </div>
            {available.map((a) => {
              const inDay = routine.days.find((d) => d.id === pickerDay)?.exerciseIds.includes(a.id);
              return (
                <div className="row" key={a.id} style={{ padding: "6px 0" }}>
                  <span>{a.name} <span className="tag">{a.tag}</span></span>
                  <button
                    className="sm primary"
                    disabled={inDay}
                    onClick={() => addExercise(pickerDay, a.id)}
                  >
                    {inDay ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
