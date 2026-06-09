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

/** A loud, attention-grabbing alarm: three rising beeps. Scheduled on the
 *  audio clock so it fires precisely even if JS timers are throttled. Returns
 *  the scheduled oscillators so they can be cancelled (skip / reschedule). */
function scheduleAlarm(ctx: AudioContext, atTime: number): OscillatorNode[] {
  const start = Math.max(atTime, ctx.currentTime + 0.01);
  const tones = [880, 1175, 1568]; // A5, D6, G6 — bright and rising
  const oscs: OscillatorNode[] = [];
  tones.forEach((freq, i) => {
    const t = start + i * 0.32;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square"; // richer/louder than sine through phone speakers
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.8, t + 0.02);
    gain.gain.setValueAtTime(0.8, t + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.32);
    oscs.push(osc);
  });
  return oscs;
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
  const audioRef = useRef<AudioContext | null>(null);
  const scheduledRef = useRef<OscillatorNode[]>([]);

  const cancelAlarm = useCallback(() => {
    for (const o of scheduledRef.current) {
      try {
        o.stop();
        o.disconnect();
      } catch {
        /* already stopped */
      }
    }
    scheduledRef.current = [];
  }, []);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (!audioRef.current) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) audioRef.current = new AC();
    }
    void audioRef.current?.resume();
    return audioRef.current;
  }, []);

  /** Arm the alarm to fire in `seconds` from now (audio-clock scheduled). */
  const arm = useCallback(
    (seconds: number) => {
      const ctx = ensureCtx();
      cancelAlarm();
      if (ctx) scheduledRef.current = scheduleAlarm(ctx, ctx.currentTime + seconds);
    },
    [ensureCtx, cancelAlarm]
  );

  // Tick only while a timer is running.
  useEffect(() => {
    if (endsAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

  // Vibrate (where supported) and clear when the countdown hits zero; the
  // beeps were pre-scheduled on the audio clock so they ring on their own.
  useEffect(() => {
    if (endsAt != null && remaining === 0 && !buzzed.current) {
      buzzed.current = true;
      navigator.vibrate?.([300, 120, 300]);
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
    arm(duration);
    setNow(Date.now());
    setEndsAt(Date.now() + duration * 1000);
  }, [duration, arm]);

  const skip = useCallback(() => {
    cancelAlarm();
    setEndsAt(null);
  }, [cancelAlarm]);

  const bump = useCallback(
    (delta: number) => {
      setEndsAt((prev) => {
        if (prev == null) return null;
        const next = Math.max(Date.now(), prev + delta * 1000);
        arm((next - Date.now()) / 1000);
        return next;
      });
    },
    [arm]
  );

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
