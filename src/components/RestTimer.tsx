import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "gym-rest-duration";
const DEFAULT = 90; // seconds

export interface RestApi {
  duration: number;
  setDuration: (s: number) => void;
  endsAt: number | null;
  remaining: number;
  start: () => void;
  skip: () => void;
  bump: (delta: number) => void;
}

/** Countdown rest timer with a custom, persisted default duration. */
export function useRestTimer(): RestApi {
  const [duration, setDurationState] = useState<number>(() => {
    const v = Number(localStorage.getItem(KEY));
    return v > 0 ? v : DEFAULT;
  });
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef(false);

  // Tick only while a timer is running.
  useEffect(() => {
    if (endsAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

  // Buzz once and clear when the countdown hits zero.
  useEffect(() => {
    if (endsAt != null && remaining === 0 && !buzzed.current) {
      buzzed.current = true;
      navigator.vibrate?.(200);
      setEndsAt(null);
    }
  }, [endsAt, remaining]);

  const setDuration = useCallback((s: number) => {
    const v = Math.max(5, s);
    setDurationState(v);
    localStorage.setItem(KEY, String(v));
  }, []);

  const start = useCallback(() => {
    buzzed.current = false;
    setNow(Date.now());
    setEndsAt(Date.now() + duration * 1000);
  }, [duration]);

  const skip = useCallback(() => setEndsAt(null), []);

  const bump = useCallback((delta: number) => {
    setEndsAt((prev) => (prev == null ? null : Math.max(Date.now(), prev + delta * 1000)));
  }, []);

  return { duration, setDuration, endsAt, remaining, start, skip, bump };
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function RestTimer({ rest }: { rest: RestApi }) {
  const [editing, setEditing] = useState(false);

  if (rest.endsAt == null) {
    return (
      <div className="rest-pref muted">
        Rest timer:{" "}
        {editing ? (
          <span>
            <button className="sm ghost" onClick={() => rest.setDuration(rest.duration - 15)}>−15s</button>
            <b style={{ margin: "0 8px" }}>{fmt(rest.duration)}</b>
            <button className="sm ghost" onClick={() => rest.setDuration(rest.duration + 15)}>+15s</button>
            <button className="sm" onClick={() => setEditing(false)} style={{ marginLeft: 8 }}>Done</button>
          </span>
        ) : (
          <button className="sm ghost" onClick={() => setEditing(true)}>{fmt(rest.duration)} · change</button>
        )}
      </div>
    );
  }

  return (
    <div className="rest-bar">
      <span className="rest-time">{fmt(rest.remaining)}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="sm ghost" onClick={() => rest.bump(-15)}>−15s</button>
        <button className="sm ghost" onClick={() => rest.bump(15)}>+15s</button>
        <button className="sm primary" onClick={rest.skip}>Skip</button>
      </div>
    </div>
  );
}
