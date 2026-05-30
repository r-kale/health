# 🏋️ Gym Tracker

An intelligent, machine-aware gym tracker for the whole family. Unlike generic
loggers, it remembers *your* machines and settings, suggests what to do each
time you show up, and progresses your weights automatically.

## Status — Phase 1

- **Profiles** — multiple users per install (you, son, wife), one-tap switch, no login.
- **Onboarding survey** — goal → experience → gym type.
- **Rule-based starter plan** — a suggested session seeded from your gym type,
  with sensible starting values for your experience level.
- **Calendar-free cadence** — rotates upper → lower → full body based on what you
  last trained, so an irregular schedule never breaks the plan.
- **Progressive overload** — hit your targets and it nudges the weight up next time.
- **Add machines on the fly** — log the value you're actually on.
- **Local-first** — data stays in your browser (IndexedDB); export/import to move
  between devices. Built behind a `Repository` interface so a synced backend can
  be added later without touching the UI.
- **PWA** — installable, works offline at the gym.

### Roadmap

2. Equipment library with saved settings + photos
3. Richer set-by-set logging with last-time autofill
4. Cadence/progression polish
5. AI layer (Claude) — generates/adapts plans and reads setting photos

## Develop

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # type checking
npm run build      # production build (dist/)
```

## Architecture

- `src/types.ts` — storage-agnostic domain model.
- `src/storage/Repository.ts` — the single persistence contract.
- `src/storage/idbRepository.ts` — IndexedDB implementation (swap for a synced one later).
- `src/engine/suggest.ts` — pure rule-based cadence + progression engine
  (same I/O contract a future AI generator will satisfy).
- `src/data/exercises.ts` — exercise catalog + gym presets.
- `src/state/AppContext.tsx` — wires storage + engine to React.
- `src/components/` — screens.
