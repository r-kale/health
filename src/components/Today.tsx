import { useEffect, useState } from "react";
import { useApp } from "../state/AppContext";
import { recoveryHint } from "../engine/suggest";
import type { LoggedExercise, Session } from "../types";

function stepFor(unit: string): number {
  if (unit === "kg") return 2.5;
  if (unit === "min") return 1;
  return 1; // level / bw reps
}

export function Today({ goToPlan }: { goToPlan: () => void }) {
  const { ready, routine, rotation, suggestedDay, buildDay, completeSession, addEquipment } =
    useApp();

  const [dayId, setDayId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVal, setNewVal] = useState("");

  // Choose the suggested day once data is ready.
  useEffect(() => {
    if (!ready || !routine || dayId) return;
    const picked = suggestedDay()?.id ?? routine.days[0]?.id ?? null;
    setDayId(picked);
  }, [ready, routine, dayId, suggestedDay]);

  // (Re)build the draft session when the selected day changes.
  useEffect(() => {
    if (dayId && !saved) setSession(buildDay(dayId));
  }, [dayId, saved, buildDay]);

  if (!ready) return <div className="center muted">Loading…</div>;

  if (!routine || routine.days.length === 0) {
    return (
      <div className="content center">
        <div style={{ fontSize: 40 }}>📋</div>
        <h1>No routine yet</h1>
        <p className="sub">Set up your training days and exercises first.</p>
        <button className="primary" onClick={goToPlan}>Go to Plan</button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="center">
        <div style={{ fontSize: 48 }}>✅</div>
        <h1>Session logged</h1>
        <p className="sub">Nice work — your rotation has advanced for next time.</p>
        <button className="primary" onClick={() => window.location.reload()}>Done</button>
      </div>
    );
  }

  if (!session) return <div className="center muted">Building your plan…</div>;

  const update = (i: number, patch: Partial<LoggedExercise>) =>
    setSession((s) =>
      s ? { ...s, exercises: s.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) } : s
    );

  const adjust = (i: number, dir: 1 | -1) => {
    const e = session.exercises[i];
    update(i, { value: Math.max(0, +(e.value + dir * stepFor(e.unit)).toFixed(2)) });
  };

  const toggleDone = (i: number) => {
    const e = session.exercises[i];
    if (e.done) update(i, { done: false, completedReps: [] });
    else update(i, { done: true, completedReps: Array(e.targetSets).fill(e.targetReps) });
  };

  const doneCount = session.exercises.filter((e) => e.done).length;

  const finish = async () => {
    await completeSession({ ...session, exercises: session.exercises.filter((e) => e.done) });
    setSaved(true);
  };

  const submitAdd = async () => {
    if (!newName.trim()) return;
    await addEquipment(newName, Number(newVal) || 0);
    setSession((s) =>
      s
        ? {
            ...s,
            exercises: [
              ...s.exercises,
              {
                exerciseId: crypto.randomUUID(),
                name: newName.trim(),
                muscleGroups: [],
                unit: "kg",
                value: Number(newVal) || 0,
                targetSets: 3,
                targetReps: 10,
                completedReps: [],
                done: false,
              },
            ],
          }
        : s
    );
    setNewName("");
    setNewVal("");
    setAdding(false);
  };

  const suggestedId = suggestedDay()?.id;

  return (
    <div className="content">
      <p className="muted">Today's session</p>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <h1 style={{ margin: 0 }}>{session.dayName}</h1>
        <select
          value={dayId ?? ""}
          onChange={(e) => setDayId(e.target.value)}
          style={{ width: "auto", flex: "0 0 auto" }}
          aria-label="Choose training day"
        >
          {routine.days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}{d.id === suggestedId ? " (suggested)" : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="sub">{dayId ? recoveryHint(rotation, dayId) : ""}</p>

      {session.exercises.length === 0 && (
        <div className="card muted">This day has no exercises yet. Add one below or edit it in Plan.</div>
      )}

      {session.exercises.map((e, i) => (
        <div className="card" key={i}>
          <div className="ex-head">
            <div>
              <b>{e.name}</b>
              <div className="muted">
                {e.targetSets} × {e.targetReps} {e.unit === "bw" ? "reps" : ""}{"  "}
                {e.muscleGroups.map((m) => (
                  <span className="tag" key={m}>{m}</span>
                ))}
              </div>
            </div>
            <button className={`done-pill ${e.done ? "on" : ""}`} onClick={() => toggleDone(i)}>
              {e.done ? "Done" : "Mark done"}
            </button>
          </div>

          <div style={{ height: 12 }} />
          <div className="row">
            <span className="muted">
              {e.unit === "bw" ? "Reps" : e.unit === "min" ? "Minutes" : e.unit === "level" ? "Level" : "Weight"}
            </span>
            <div className="stepper">
              <button onClick={() => adjust(i, -1)}>−</button>
              <span className="val">
                {e.value}
                <span className="unit"> {e.unit === "bw" ? "" : e.unit}</span>
              </span>
              <button onClick={() => adjust(i, 1)}>+</button>
            </div>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="card">
          <label className="field">
            <span>Machine / exercise name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Pec Deck" autoFocus />
          </label>
          <label className="field">
            <span>Value you're on (optional)</span>
            <input value={newVal} onChange={(e) => setNewVal(e.target.value)} inputMode="decimal" placeholder="kg / level" />
          </label>
          <div className="row">
            <button className="ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="primary" onClick={submitAdd}>Add</button>
          </div>
        </div>
      ) : (
        <button className="ghost block" onClick={() => setAdding(true)}>+ Add a machine I'm using</button>
      )}

      <div style={{ height: 16 }} />
      <button className="success block" onClick={finish} disabled={doneCount === 0}>
        Finish session ({doneCount} logged)
      </button>
    </div>
  );
}
