import { useState } from "react";
import { useApp } from "./state/AppContext";
import { Onboarding } from "./components/Onboarding";
import { Today } from "./components/Today";
import { Plan } from "./components/Plan";
import { History } from "./components/History";
import { Progress } from "./components/Progress";
import { ProfileSheet } from "./components/ProfileSheet";

type Tab = "today" | "plan" | "history" | "progress";

export function App() {
  const { loading, profiles, currentProfile, createProfile } = useApp();
  const [tab, setTab] = useState<Tab>("today");
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState("");

  if (loading) {
    return <div className="center muted">Loading…</div>;
  }

  // First run — no profiles at all.
  if (profiles.length === 0) {
    return (
      <div className="app">
        <div className="content center">
          <div style={{ fontSize: 48 }}>🏋️</div>
          <h1>Gym Tracker</h1>
          <p className="sub">
            Smart, machine-aware training for you and your family. Create a profile to start.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <div style={{ height: 12 }} />
          <button className="primary block" onClick={() => createProfile(name)}>
            Get started
          </button>
        </div>
      </div>
    );
  }

  // A profile exists but none is active (e.g. after deselect).
  if (!currentProfile) {
    return (
      <div className="app">
        <div className="content center">
          <h1>Pick a profile</h1>
          <button className="primary" onClick={() => setSheet(true)}>Choose</button>
        </div>
        {sheet && <ProfileSheet onClose={() => setSheet(false)} />}
      </div>
    );
  }

  // Onboarding survey for a freshly created profile.
  if (!currentProfile.onboarded) {
    return (
      <div className="app">
        <Onboarding profile={currentProfile} />
      </div>
    );
  }

  const initial = currentProfile.name.charAt(0).toUpperCase();

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          Gym Tracker
          <small>{currentProfile.name}</small>
        </div>
        <button className="avatar" onClick={() => setSheet(true)} aria-label="Switch profile">
          {initial}
        </button>
      </div>

      {tab === "today" && <Today key={currentProfile.id} goToPlan={() => setTab("plan")} />}
      {tab === "plan" && <Plan key={currentProfile.id} />}
      {tab === "history" && <History />}
      {tab === "progress" && <Progress />}

      <div className="tabbar">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>
          <span className="ic">🏋️</span>
          Today
        </button>
        <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}>
          <span className="ic">📋</span>
          Plan
        </button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
          <span className="ic">🗓️</span>
          History
        </button>
        <button className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}>
          <span className="ic">📈</span>
          Progress
        </button>
      </div>

      {sheet && <ProfileSheet onClose={() => setSheet(false)} />}
    </div>
  );
}
