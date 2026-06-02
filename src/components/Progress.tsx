import { useApp } from "../state/AppContext";
import { CATALOG_BY_ID } from "../data/exercises";
import { isExerciseDone, workingWeight } from "../lib/sets";
import { Sparkline } from "./Sparkline";

interface Series {
  id: string;
  name: string;
  unit: string;
  points: { date: number; value: number }[];
  last: number;
}

export function Progress() {
  const { sessions, equipment } = useApp();

  const name = (id: string) =>
    CATALOG_BY_ID[id]?.name ?? equipment.find((e) => e.id === id)?.name ?? "Exercise";

  // Build a value-over-time series per exercise from oldest to newest.
  const map = new Map<string, Series>();
  const ordered = [...sessions].sort((a, b) => a.date - b.date);
  for (const s of ordered) {
    for (const e of s.exercises) {
      if (!isExerciseDone(e)) continue;
      const value = workingWeight(e);
      const key = e.exerciseId;
      if (!map.has(key)) {
        map.set(key, { id: key, name: name(key), unit: e.unit, points: [], last: value });
      }
      const series = map.get(key)!;
      series.points.push({ date: s.date, value });
      series.unit = e.unit;
      series.last = value;
    }
  }

  const series = [...map.values()].sort(
    (a, b) => b.points[b.points.length - 1].date - a.points[a.points.length - 1].date
  );

  if (series.length === 0) {
    return (
      <div className="content">
        <h1>Progress</h1>
        <p className="sub">Log a few sessions and your weight trends will show up here.</p>
      </div>
    );
  }

  const unitLabel = (u: string) => (u === "bw" ? "reps" : u);

  return (
    <div className="content">
      <h1>Progress</h1>
      <p className="sub">Weight / level over time, per exercise.</p>
      {series.map((s) => {
        const first = s.points[0].value;
        const delta = +(s.last - first).toFixed(2);
        const sign = delta > 0 ? "+" : "";
        return (
          <div className="card" key={s.id}>
            <div className="row">
              <b>{s.name}</b>
              <span className="muted">
                {s.last}{s.unit === "bw" ? "" : unitLabel(s.unit)}
                {s.points.length > 1 && (
                  <span style={{ color: delta >= 0 ? "var(--accent-2)" : "var(--danger)", marginLeft: 8 }}>
                    {sign}{delta}
                  </span>
                )}
              </span>
            </div>
            <div style={{ height: 8 }} />
            {s.points.length > 1 ? (
              <Sparkline values={s.points.map((p) => p.value)} />
            ) : (
              <span className="muted">One session so far — need another to chart a trend.</span>
            )}
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              {s.points.length} session{s.points.length > 1 ? "s" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
