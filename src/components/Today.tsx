import { useEffect, useState } from "react";
import { useApp } from "../state/AppContext";
import { nextFocus, recoveryHint } from "../engine/suggest";
import { FOCUS_LABELS } from "../data/exercises";
import type { LoggedExercise, Session } from "../types";

function stepFor(unit: string): number {
  if (unit === "kg") return 2.5;
  if (unit === "min") return 1;
  return 1; // level / bw reps
}

export function Today() {
  const { ready, buildToday, completeSession, rotation, addEquipment } = useApp();
  const focus = nextFocus(rotation);

  // Build the suggested session once the profile's data has loaded; the user
  // then edits this draft. Building eagerly would risk stale/empty data.
  const [session, setSession] = useState<Session | null>(null);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVal, setNewVal] = useState("");

  useEffect(() => {
    if (ready && !session && !saved) setSession(buildToday());
  }, [ready, session, saved, buildToday]);

  if (!session) return <div className="center muted">Building your plan…</div>;

  const update = (i: number, patch: Partial<LoggedExercise>) =>
    setSession((s) =>
      s ? { ...s, exercises: s.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) } : s
    );

  const adjust = (i: number, dir: 1 | -1) => {
    const e = session.exercises[i];
    const v = Math.max(0, +(e.value + dir * stepFor(e.unit)).toFixed(2));
    update(i, { value: v });
  };

  const toggleDone = (i: number) => {
    const e = session.exercises[i];
    if (e.done) {
      update(i, { done: false, completedReps: [] });
    } else {
      // Mark all target sets as hitting the target reps by default.
      update(i, { done: true, completedReps: Array(e.targetSets).fill(e.targetReps) });
    }
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

  if (saved) {
    return (
      <div className="center">
        <div style={{ fontSize: 48 }}>✅</div>
        <h1>Session logged</h1>
        <p className="sub">
          Nice work. Your rotation has advanced — next time you'll get a different focus.
        </p>
        <button className="primary" onClick={() => window.location.reload()}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="content">
      <p className="muted">Today's suggestion</p>
      <h1>{FOCUS_LABELS[focus]}</h1>
      <p className="sub">{recoveryHint(rotation, focus)}</p>

      {session.exercises.map((e, i) => (
        <div className="card" key={i}>
          <div className="ex-head">
            <div>
              <b>{e.name}</b>
              <div className="muted">
                {e.targetSets} × {e.targetReps} {e.unit === "bw" ? "reps" : ""}
                {"  "}
                {e.muscleGroups.map((m) => (
                  <span className="tag" key={m}>{m}</span>
                ))}
              </div>
            </div>
            <button
              className={`done-pill ${e.done ? "on" : ""}`}
              onClick={() => toggleDone(i)}
            >
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
        <button className="ghost block" onClick={() => setAdding(true)}>
          + Add a machine I'm using
        </button>
      )}

      <div style={{ height: 16 }} />
      <button className="success block" onClick={finish} disabled={doneCount === 0}>
        Finish session ({doneCount} logged)
      </button>
    </div>
  );
}
