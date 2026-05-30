import { useState } from "react";
import { useApp } from "../state/AppContext";
import { GOAL_LABELS, GYM_PRESETS } from "../data/exercises";
import type { Experience, Goal, GymType, Profile } from "../types";

const GOALS: Goal[] = ["general", "strength", "hypertrophy", "fatloss"];
const EXP: { id: Experience; label: string; blurb: string }[] = [
  { id: "beginner", label: "Beginner", blurb: "Under ~1 year" },
  { id: "intermediate", label: "Intermediate", blurb: "1–3 years" },
  { id: "advanced", label: "Advanced", blurb: "3+ years" },
];

export function Onboarding({ profile }: { profile: Profile }) {
  const { updateProfile } = useApp();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [experience, setExperience] = useState<Experience>(profile.experience);
  const [gymType, setGymType] = useState<GymType>(profile.gymType);

  const finish = () =>
    updateProfile({ ...profile, goal, experience, gymType, onboarded: true });

  return (
    <div className="content">
      <p className="muted">Setting up for {profile.name}</p>

      {step === 0 && (
        <>
          <h1>What's your goal?</h1>
          <p className="sub">This shapes your reps, rest and exercise mix.</p>
          <div className="choice-grid">
            {GOALS.map((g) => (
              <button
                key={g}
                className={`choice ${goal === g ? "selected" : ""}`}
                onClick={() => setGoal(g)}
              >
                <b>{GOAL_LABELS[g]}</b>
              </button>
            ))}
          </div>
          <div style={{ height: 16 }} />
          <button className="primary block" onClick={() => setStep(1)}>
            Continue
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <h1>Your experience</h1>
          <p className="sub">Sets sensible starting values and progression speed.</p>
          <div className="choice-grid">
            {EXP.map((e) => (
              <button
                key={e.id}
                className={`choice ${experience === e.id ? "selected" : ""}`}
                onClick={() => setExperience(e.id)}
              >
                <b>{e.label}</b>
                <small>{e.blurb}</small>
              </button>
            ))}
          </div>
          <div style={{ height: 16 }} />
          <div className="row">
            <button className="ghost" onClick={() => setStep(0)}>Back</button>
            <button className="primary" onClick={() => setStep(2)}>Continue</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1>What's your gym?</h1>
          <p className="sub">We'll seed your plan from the equipment you have.</p>
          <div className="choice-grid">
            {GYM_PRESETS.map((g) => (
              <button
                key={g.id}
                className={`choice ${gymType === g.id ? "selected" : ""}`}
                onClick={() => setGymType(g.id)}
              >
                <b>{g.label}</b>
                <small>{g.blurb}</small>
              </button>
            ))}
          </div>
          <div style={{ height: 16 }} />
          <div className="row">
            <button className="ghost" onClick={() => setStep(1)}>Back</button>
            <button className="success" onClick={finish}>Build my plan</button>
          </div>
        </>
      )}
    </div>
  );
}
