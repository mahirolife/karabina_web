# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Express + Vite) at http://localhost:3000
npm run build     # Production Vite build → dist/
npm run lint      # TypeScript type check (npx tsc --noEmit)
npm run preview   # Serve the production build locally
```

There is no test framework. `npm run lint` (tsc --noEmit) is the only automated correctness check.

## Architecture

**Stack:** React 19 + React Router 7 + Tailwind CSS v4, served via an Express server (`server.ts`) that wraps Vite middleware in dev and serves `dist/` in production. Backend is Supabase (Postgres + Edge Functions).

**Routes** (`src/App.tsx`):
- `/` — LandingPage
- `/menu` — FullMenuPage
- `/booking` — BookingPage (customer reservations)
- `/staff` — StaffDashboard (password-protected ops view)
- `/cancel/:token` — CancelPage

**Environment variables required:**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_SQUARE_APPLICATION_ID`, `VITE_SQUARE_LOCATION_ID`
- `OPENWEATHER_API_KEY` (used by `/api/weather` proxy in `server.ts`)

In dev, `DEV_MODE` (`import.meta.env.DEV`) skips Square payment tokenization.

---

## Two-Phase Booking System

This is the core domain logic. Understanding both phases is essential before touching anything in `src/lib/` or the booking/staff pages.

### Phase 1 — Booking (BookingPage.tsx)
Pure in-memory capacity check. No `table_assignments` row is ever written at booking time.

1. Call `assignCycle([...existingCycleReservations, newReservation], graph)` (in-memory, ~1ms).
2. If `newReservation.id` appears in `result.unassigned` → reject with a reason string.
3. If accepted → insert one `reservations` row only.

The slot-availability UI uses the same `assignCycle` check for each time slot to determine availability. There is no shared-table consent modal — 1A/1B are assigned silently when appropriate.

### Phase 2 — Seating Optimisation (StaffDashboard.tsx → `runPhase2Optimization`)
Runs automatically every time the `/staff` page loads or refreshes.

1. For each date+cycle, split reservations into **locked** (status=`'seated'` OR `locked=true`) and **unlocked** (`pending`/`confirmed`, not locked).
2. Build `preOccupied` from the seated parties' existing `table_assignments`.
3. Run `assignCycle(unlockedReservations, graph, preOccupied)`.
4. Delete old `table_assignments` for unlocked IDs, insert the new optimal set.

`table_assignments` is therefore always recomputed — never treated as ground truth except for seated guests.

---

## Table Graph (`src/lib/tableGraph.ts`)

**Physical vs logical names** — `physicalTables(name)` maps a logical table name to the atomic slots it occupies:
- `'1A'` → `['1A']`, `'1B'` → `['1B']` (independent halves of table 1)
- `'1'` → `['1A','1B']` (full table = both halves)
- `'1+2'` → `['1A','1B','2']`
- `'6+7'` → `['6','7']`, `'3+4'` → `['3','4']`
- Everything else is identity.

**`findSeatingOptions(graph, partySize, occupied)`** returns all viable tables/combos sorted:
1. By mode: `comfort` < `stretch` < `improvised`
2. Individual tables before combinations within the same mode (avoids wasting a combo when a single table suffices)
3. By `getComfortCapacity` ascending within same type+mode (tightest fit first)

**`assignmentMode`** for a given entity + partySize:
- `comfort` — partySize ≤ `comfort_max ?? absolute_max`
- `stretch` — partySize ≤ `absolute_max`
- `improvised` — exceeds `absolute_max` (tables only; combinations return `null`)

---

## Assignment Algorithm (`src/lib/assignTables.ts`)

`assignCycle(reservations, graph, preOccupied)`:
- Sorts parties **largest-first, FCFS tiebreaker** (hardest to seat goes first).
- `placeReservation` for each party:
  - **Phase 1**: grab the tightest free table via `findSeatingOptions`. If all remaining parties can also be seated (`scoreFreeSeatable < UNSEATED_PENALTY`), use it.
  - **Phase 2**: if Phase 1 leaves some parties unseated, try displacement via `PREFERENCE_ORDER` and pick whichever scores lower.
  - If no free table: attempt displacement using `PREFERENCE_ORDER`.
- `tryAssignToTable` recursively displaces blockers (max depth 5), preferring lateral/upgrade moves before one-step downgrades.
- `scoreFreeSeatable`: quality score = Σ(`comfort_max − party_size`) + 1000 per unseated party. Lower = better.
- `PREFERENCE_ORDER`: static per-party-size table preference list — used only for displacement chains, not initial free-table selection.
- **Swap pass** (runs after the greedy loop, before building results): iterates all assignment pairs; if a larger party is on a smaller-capacity table than a smaller party, swaps them when `canUse` passes and neither mode worsens. Repeats (`break outerLoop` + restart) until stable. This corrects tightest-fit greedy mispairings without affecting which tables are occupied.

**Split-table rule** (`canUse`): tables `1A` and `1B` require `res.party_size ≤ 4` only. No consent flags are checked.

---

## Supabase Schema (key tables)

| Table | Purpose |
|---|---|
| `reservations` | One row per booking; `status` ∈ `pending/confirmed/seated/cancelled`; `locked boolean` pins a reservation so Phase 2 never moves it |
| `table_assignments` | Written by Phase 2 only; `assignment_mode` ∈ `comfort/stretch/improvised` |
| `tables` | Physical + logical table config; `comfort_max` and `absolute_max` drive algorithm |
| `table_combinations` | Multi-table combos (6+7, 3+4, 1+2, 1+2+3…) |
| `restaurant_settings` | `party_of_one_enabled` flag |

**Cycles:** Cycle 1 = 18:00 seating, Cycle 2 = 20:00/20:30/21:00 seating. Treated as independent rooms for assignment purposes.
