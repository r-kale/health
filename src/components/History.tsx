import { useMemo, useState } from "react";
import { useApp } from "../state/AppContext";
import type { Session } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sessionLabel(s: Session): string {
  return s.dayName ?? (s.focus ? s.focus[0].toUpperCase() + s.focus.slice(1) : "Session");
}

export function History() {
  const { sessions } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  // Group sessions by local day key.
  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of sessions) {
      const k = dateKey(s.date);
      (m.get(k) ?? m.set(k, []).get(k)!).push(s);
    }
    return m;
  }, [sessions]);

  // Build the month grid (Monday-first).
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [year, month]);

  const prevMonth = () => {
    setSelected(null);
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelected(null);
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const selectedSessions = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="content">
      <h1>History</h1>
      <p className="sub">{sessions.length} session{sessions.length === 1 ? "" : "s"} logged.</p>

      <div className="card">
        <div className="row">
          <button className="sm ghost" onClick={prevMonth}>‹</button>
          <b>{MONTHS[month]} {year}</b>
          <button className="sm ghost" onClick={nextMonth}>›</button>
        </div>
        <div className="cal-grid" style={{ marginTop: 12 }}>
          {DOW.map((d) => (
            <div key={d} className="cal-dow">{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const key = `${year}-${month}-${d}`;
            const has = byDay.has(key);
            const isToday = key === dateKey(now.getTime());
            return (
              <button
                key={i}
                className={`cal-cell ${has ? "has" : ""} ${selected === key ? "sel" : ""} ${isToday ? "today" : ""}`}
                onClick={() => has && setSelected(key)}
              >
                {d}
                {has && <span className="cal-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      {selected && selectedSessions.map((s) => (
        <div className="card" key={s.id}>
          <div className="row">
            <b>{sessionLabel(s)}</b>
            <span className="muted">{new Date(s.date).toLocaleDateString()}</span>
          </div>
          <div style={{ height: 8 }} />
          {s.exercises.map((e, i) => (
            <div className="row" key={i} style={{ padding: "3px 0" }}>
              <span>{e.name}</span>
              <span className="muted">
                {e.value}{e.unit === "bw" ? "" : e.unit} · {e.completedReps.length || e.targetSets}×{e.targetReps}
              </span>
            </div>
          ))}
        </div>
      ))}

      {!selected && sessions.length > 0 && (
        <p className="muted" style={{ textAlign: "center" }}>Tap a highlighted day to see the session.</p>
      )}
    </div>
  );
}
