import { useEffect, useRef, useState } from "react";
import { useApp } from "../state/AppContext";
import { recoveryHint } from "../engine/suggest";
import { RestTimer, useRestTimer } from "./RestTimer";
import type { LoggedExercise, LoggedSet, Session } from "../types";

function wtStep(unit: string): number {
  if (unit === "kg") return 2.5;
  if (unit === "min") return 1;
  return 1;
}

export function Today({ goToPlan }: { goToPlan: () => void }) {
  const { ready, routine, rotation, currentProfile, suggestedDay, buildDay, completeSession, addEquipment } =
    useApp();
  const rest = useRestTimer();

  const [dayId, setDayId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVal, setNewVal] = useState("");

  const draftKey = currentProfile ? `gym-draft-${currentProfile.id}` : null;

  // Keep the latest builder in a ref so building depends ONLY on an explicit
  // day choice — not on equipment/sessions changing — which previously rebuilt
  // the draft mid-session and wiped progress when adding a machine.
  const buildRef = useRef(buildDay);
  buildRef.current = buildDay;

  // One-time init: restore a saved in-progress draft (survives app restart),
  // otherwise build a fresh session for the suggested day.
  const inited = useRef(false);
  useEffect(() => {
    if (!ready || !routine || inited.current) return;
    inited.current = true;
    if (draftKey) {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        try {
          const d = JSON.parse(raw) as { dayId: string | null; session: Session };
          if (d.session) {
            setDayId(d.dayId);
            setSession(d.session);
            return;
          }
        } catch {
          /* ignore corrupt draft */
        }
      }
    }
    const id = suggestedDay()?.id ?? routine.days[0]?.id ?? null;
    setDayId(id);
    if (id) setSession(buildRef.current(id));
  }, [ready, routine, suggestedDay, draftKey]);

  // Persist the draft on every change so closing the app doesn't lose progress.
  useEffect(() => {
    if (!draftKey || saved) return;
    if (session) localStorage.setItem(draftKey, JSON.stringify({ dayId, session }));
  }, [session, dayId, saved, draftKey]);

  // Switching day is an explicit choice: rebuild the draft for that day.
  const changeDay = (id: string) => {
    setDayId(id);
    setSession(buildRef.current(id));
  };

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

  const patchExercise = (i: number, patch: Partial<LoggedExercise>) =>
    setSession((s) =>
      s ? { ...s, exercises: s.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) } : s
    );

  const patchSet = (ei: number, si: number, patch: Partial<LoggedSet>) => {
    const ex = session.exercises[ei];
    patchExercise(ei, { sets: ex.sets.map((set, j) => (j === si ? { ...set, ...patch } : set)) });
  };

  const adjustWeight = (ei: number, si: number, dir: 1 | -1) => {
    const ex = session.exercises[ei];
    const set = ex.sets[si];
    patchSet(ei, si, { weight: Math.max(0, +(set.weight + dir * wtStep(ex.unit)).toFixed(2)) });
  };

  const toggleSet = (ei: number, si: number) => {
    const wasDone = session.exercises[ei].sets[si].done;
    patchSet(ei, si, { done: !wasDone });
    if (!wasDone) rest.start(); // start the rest timer when completing a set
  };

  const addSet = (ei: number) => {
    const ex = session.exercises[ei];
    const last = ex.sets[ex.sets.length - 1];
    patchExercise(ei, {
      sets: [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? ex.targetReps, done: false }],
    });
  };

  const removeSet = (ei: number) => {
    const ex = session.exercises[ei];
    if (ex.sets.length <= 1) return;
    patchExercise(ei, { sets: ex.sets.slice(0, -1) });
  };

  const doneCount = session.exercises.filter((e) => e.sets.some((s) => s.done)).length;

  const finish = async () => {
    const logged = session.exercises.filter((e) => e.sets.some((s) => s.done));
    await completeSession({ ...session, exercises: logged });
    if (draftKey) localStorage.removeItem(draftKey);
    setSaved(true);
  };

  const submitAdd = async () => {
    if (!newName.trim()) return;
    const eq = await addEquipment(newName, Number(newVal) || 0);
    const w = Number(newVal) || 0;
    setSession((s) =>
      s
        ? {
            ...s,
            exercises: [
              ...s.exercises,
              {
                exerciseId: eq.id,
                name: eq.name,
                muscleGroups: [],
                unit: "kg",
                targetSets: 3,
                targetReps: 10,
                sets: [{ weight: w, reps: 10, done: false }],
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
  const unitWord = (u: string) =>
    u === "bw" ? "reps" : u === "min" ? "min" : u === "level" ? "lvl" : "kg";

  return (
    <div className="content">
      <p className="muted">Today's session</p>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <h1 style={{ margin: 0 }}>{session.dayName}</h1>
        <select
          value={dayId ?? ""}
          onChange={(e) => changeDay(e.target.value)}
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

      {session.exercises.map((e, ei) => (
        <div className="card" key={ei}>
          <div className="ex-head">
            <div>
              <b>{e.name}</b>
              <div className="muted">
                target {e.targetSets} × {e.targetReps}{"  "}
                {e.muscleGroups.map((m) => (
                  <span className="tag" key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="set-head muted">
            <span>Set</span>
            <span>{unitWord(e.unit) === "kg" ? "Weight" : unitWord(e.unit)}</span>
            <span>Reps</span>
            <span></span>
          </div>

          {e.sets.map((set, si) => (
            <div className={`set-row ${set.done ? "done" : ""}`} key={si}>
              <span className="set-n">{si + 1}</span>
              <div className="numwrap">
                <button className="mini" onClick={() => adjustWeight(ei, si, -1)}>−</button>
                <input
                  className="num"
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(ev) => patchSet(ei, si, { weight: Number(ev.target.value) || 0 })}
                />
                <button className="mini" onClick={() => adjustWeight(ei, si, 1)}>+</button>
              </div>
              <input
                className="num"
                inputMode="numeric"
                value={set.reps}
                onChange={(ev) => patchSet(ei, si, { reps: Number(ev.target.value) || 0 })}
              />
              <button
                className={`check ${set.done ? "on" : ""}`}
                onClick={() => toggleSet(ei, si)}
                aria-label="Mark set done"
              >
                ✓
              </button>
            </div>
          ))}

          <div className="row" style={{ marginTop: 8 }}>
            <button className="sm ghost" onClick={() => removeSet(ei)} disabled={e.sets.length <= 1}>− Set</button>
            <button className="sm ghost" onClick={() => addSet(ei)}>+ Set</button>
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
            <span>Starting weight (optional)</span>
            <input value={newVal} onChange={(e) => setNewVal(e.target.value)} inputMode="decimal" placeholder="kg" />
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

      <RestTimer rest={rest} />
    </div>
  );
}
