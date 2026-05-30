import { useApp } from "../state/AppContext";
import { FOCUS_LABELS } from "../data/exercises";

export function History() {
  const { sessions } = useApp();

  if (sessions.length === 0) {
    return (
      <div className="content">
        <h1>History</h1>
        <p className="sub">No sessions yet. Finish one on the Today tab and it'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>History</h1>
      <p className="sub">{sessions.length} session{sessions.length > 1 ? "s" : ""} logged.</p>
      {sessions.map((s) => (
        <div className="card" key={s.id}>
          <div className="row">
            <b>{FOCUS_LABELS[s.focus]}</b>
            <span className="muted">{new Date(s.date).toLocaleDateString()}</span>
          </div>
          <div style={{ height: 8 }} />
          {s.exercises.map((e, i) => (
            <div className="row" key={i} style={{ padding: "3px 0" }}>
              <span>{e.name}</span>
              <span className="muted">
                {e.value}{e.unit === "bw" ? "" : e.unit} · {e.completedReps.length}×
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
