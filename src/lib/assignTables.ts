import type { Reservation, TableAssignment, TableGraph, CycleAssignmentResult } from './types';
import { physicalTables, findSeatingOptions, getComfortCapacity } from './tableGraph';

export const PREFERENCE_ORDER: Record<number, string[]> = {
  1:  ['8','9','7','6','4','5','2','3','1A','1B'],
  2:  ['8','9','7','6','4','5','2','1A','1B','3'],
  3:  ['5','4','6','2','1A','1B','3'],
  4:  ['4','5','2','3','1A','1B'],
  5:  ['2','6+7','3','5','1'],
  6:  ['2','6+7','3','1'],
  7:  ['3','1'],
  8:  ['3','1'],
  9:  ['3','1'],
  10: ['1','3+4'],
  11: ['1','3+4'],
  12: ['3+4','1'],
  13: ['3+4','1+2'],
  14: ['3+4','1+2'],
  15: ['3+4','1+2'],
  16: ['1+2'],
  17: ['1+2'],
  18: ['1+2'],
};

const MAX_CHAIN_DEPTH = 5;
const MODE_ORDER = { comfort: 0, stretch: 1, improvised: 2 } as const;
const UNSEATED_PENALTY = 1000;


function isAvailable(name: string, occupied: Set<string>): boolean {
  return physicalTables(name).every(t => !occupied.has(t));
}

function occupy(name: string, s: Set<string>): void {
  physicalTables(name).forEach(t => s.add(t));
}

function vacate(name: string, s: Set<string>): void {
  physicalTables(name).forEach(t => s.delete(t));
}

function canUse(tableName: string, res: Reservation): boolean {
  if (tableName === '1A' || tableName === '1B') {
    return res.party_size <= 4;
  }
  return true;
}

function getModeFor(
  tableName: string,
  partySize: number,
  graph: TableGraph,
): 'comfort' | 'stretch' | 'improvised' {
  if (tableName.includes('+')) {
    const combo = graph.combinations.find(c => c.combination_name === tableName);
    if (!combo) return 'improvised';
    const cap = combo.comfort_max ?? combo.absolute_max;
    if (partySize <= cap) return 'comfort';
    if (partySize <= combo.absolute_max) return 'stretch';
    return 'improvised';
  }
  const table = graph.tables.find(t => t.table_name === tableName);
  if (!table) return 'improvised';
  const cap = table.comfort_max ?? table.absolute_max;
  if (partySize <= cap) return 'comfort';
  if (partySize <= table.absolute_max) return 'stretch';
  return 'improvised';
}

function getComfortCapForTable(tableName: string, graph: TableGraph): number | null {
  if (tableName.includes('+')) {
    const combo = graph.combinations.find(c => c.combination_name === tableName);
    return combo ? getComfortCapacity(combo) : null;
  }
  const table = graph.tables.find(t => t.table_name === tableName);
  return table ? getComfortCapacity(table) : null;
}

interface SearchState {
  assignments: Map<string, string>; // reservation_id → table_name
  occupied: Set<string>;            // physical table names currently in use
  reassigned: Set<string>;          // reservation_ids displaced from their original table
}

function cloneState(s: SearchState): SearchState {
  return {
    assignments: new Map(s.assignments),
    occupied: new Set(s.occupied),
    reassigned: new Set(s.reassigned),
  };
}

function blockersFor(targetTable: string, state: SearchState): string[] {
  const targets = physicalTables(targetTable);
  const ids: string[] = [];
  for (const [resId, tName] of state.assignments) {
    if (physicalTables(tName).some(pt => targets.includes(pt)) && !ids.includes(resId)) {
      ids.push(resId);
    }
  }
  return ids;
}

/**
 * Attempts to seat `res` at `targetTable`, displacing blockers if necessary.
 *
 * `reservedPhysical` — physical table names already claimed by a higher-level call
 * in the same chain; displaced parties must not be relocated there.
 */
function tryAssignToTable(
  res: Reservation,
  targetTable: string,
  state: SearchState,
  allReservations: Map<string, Reservation>,
  graph: TableGraph,
  depth: number,
  reservedPhysical: ReadonlySet<string>,
): SearchState | null {
  if (isAvailable(targetTable, state.occupied)) {
    const next = cloneState(state);
    occupy(targetTable, next.occupied);
    next.assignments.set(res.id, targetTable);
    return next;
  }

  if (depth >= MAX_CHAIN_DEPTH) return null;

  const blockerIds = blockersFor(targetTable, state);
  if (blockerIds.length === 0) return null;

  // Reserve target's physical tables so displaced parties can't take them.
  const newReserved = new Set([...reservedPhysical, ...physicalTables(targetTable)]);

  let working = cloneState(state);

  for (const blockerId of blockerIds) {
    const blockerRes = allReservations.get(blockerId);
    if (!blockerRes) return null;

    const oldTable = working.assignments.get(blockerId);
    if (!oldTable) return null;
    const oldMode = getModeFor(oldTable, blockerRes.party_size, graph);

    vacate(oldTable, working.occupied);
    working.assignments.delete(blockerId);

    const prefs = PREFERENCE_ORDER[blockerRes.party_size] ?? [];
    let placed = false;

    // Phase 1: lateral move or upgrade (same or better mode)
    for (const newTable of prefs) {
      if (!canUse(newTable, blockerRes)) continue;
      if (physicalTables(newTable).some(pt => newReserved.has(pt))) continue;
      if (MODE_ORDER[getModeFor(newTable, blockerRes.party_size, graph)] > MODE_ORDER[oldMode]) continue;
      const result = tryAssignToTable(blockerRes, newTable, working, allReservations, graph, depth + 1, newReserved);
      if (result) { working = result; placed = true; break; }
    }

    // Phase 2: one-step downgrade (comfort → stretch) only when no lateral/upgrade exists
    if (!placed) {
      for (const newTable of prefs) {
        if (!canUse(newTable, blockerRes)) continue;
        if (physicalTables(newTable).some(pt => newReserved.has(pt))) continue;
        if (MODE_ORDER[getModeFor(newTable, blockerRes.party_size, graph)] !== MODE_ORDER[oldMode] + 1) continue;
        const result = tryAssignToTable(blockerRes, newTable, working, allReservations, graph, depth + 1, newReserved);
        if (result) {
          working = result;
          working.reassigned.add(blockerId);
          placed = true;
          break;
        }
      }
    }

    if (!placed) return null;
  }

  if (!isAvailable(targetTable, working.occupied)) return null;

  const final = cloneState(working);
  occupy(targetTable, final.occupied);
  final.assignments.set(res.id, targetTable);
  return final;
}

/**
 * Quality score for the remaining queue given baseState.
 * Returns sum(comfort_max − party_size) across seated parties, plus UNSEATED_PENALTY
 * for each party that cannot be seated. Lower = tighter fit = better.
 */
function scoreFreeSeatable(queue: Reservation[], baseState: SearchState, graph: TableGraph): number {
  const sim = new Set(baseState.occupied);
  let score = 0;
  for (const p of queue) {
    const options = findSeatingOptions(graph, p.party_size, sim);
    let seated = false;
    for (const { entity } of options) {
      const t = 'table_name' in entity ? entity.table_name : entity.combination_name;
      if (!canUse(t, p)) continue;
      score += getComfortCapacity(entity) - p.party_size;
      occupy(t, sim);
      seated = true;
      break;
    }
    if (!seated) score += UNSEATED_PENALTY;
  }
  return score;
}

function placeReservation(
  res: Reservation,
  state: SearchState,
  allReservations: Map<string, Reservation>,
  graph: TableGraph,
  remainingParties: Reservation[],
): SearchState | null {
  // PREFERENCE_ORDER retained for displacement chains; free-table grab uses tightest-fit.
  const prefs = PREFERENCE_ORDER[res.party_size] ?? [];

  // Phase 1: tightest free table via findSeatingOptions (sorted by comfort_max ascending).
  let phase1Result: SearchState | null = null;
  for (const { entity } of findSeatingOptions(graph, res.party_size, state.occupied)) {
    const tableName = 'table_name' in entity ? entity.table_name : entity.combination_name;
    if (!canUse(tableName, res)) continue;
    const next = cloneState(state);
    occupy(tableName, next.occupied);
    next.assignments.set(res.id, tableName);
    phase1Result = next;
    break;
  }

  if (phase1Result !== null) {
    if (remainingParties.length === 0) return phase1Result;
    const phase1Score = scoreFreeSeatable(remainingParties, phase1Result, graph);
    // All remaining parties can be seated — no need to displace anyone.
    if (phase1Score < UNSEATED_PENALTY) return phase1Result;

    // Phase 1 leaves some parties unseated — check if a displacement scores better (lower).
    for (const tableName of prefs) {
      if (!canUse(tableName, res)) continue;
      const candidate = tryAssignToTable(res, tableName, state, allReservations, graph, 0, new Set());
      if (!candidate) continue;
      if (scoreFreeSeatable(remainingParties, candidate, graph) < phase1Score) {
        return candidate;
      }
    }

    // No displacement improves on phase 1.
    return phase1Result;
  }

  // No free table at all — allow displacement.
  for (const tableName of prefs) {
    if (!canUse(tableName, res)) continue;
    const result = tryAssignToTable(res, tableName, state, allReservations, graph, 0, new Set());
    if (result) return result;
  }
  return null;
}

/**
 * Assigns tables for all reservations in a single date/cycle.
 * Processes largest parties first (hardest to seat), using FCFS as tiebreaker.
 * Re-runs from scratch on every call.
 */
export function assignCycle(
  reservations: Reservation[],
  graph: TableGraph,
  preOccupied: Set<string> = new Set(),
): CycleAssignmentResult {
  const first = reservations[0];
  const date = first?.date ?? '';
  const cycle = (first?.cycle ?? 1) as 1 | 2;

  const sorted = [...reservations].sort((a, b) => {
    if (b.party_size !== a.party_size) return b.party_size - a.party_size;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });

  const allReservationsMap = new Map(sorted.map(r => [r.id, r]));

  let state: SearchState = {
    assignments: new Map(),
    occupied: new Set(preOccupied),
    reassigned: new Set(),
  };

  const unassigned: Reservation[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const res = sorted[i];
    const remainingParties = sorted.slice(i + 1);
    const result = placeReservation(res, state, allReservationsMap, graph, remainingParties);
    if (result) {
      state = result;
    } else {
      unassigned.push(res);
    }
  }

  // Swap pass: ensure larger parties are on larger-capacity tables.
  // Break immediately after each swap and restart so we never read stale data.
  let swapped = true;
  while (swapped) {
    swapped = false;
    const ids = [...state.assignments.keys()];
    outerLoop: for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        const tableA = state.assignments.get(idA)!;
        const tableB = state.assignments.get(idB)!;
        const resA = allReservationsMap.get(idA);
        const resB = allReservationsMap.get(idB);
        if (!resA || !resB) continue;

        const capA = getComfortCapForTable(tableA, graph);
        const capB = getComfortCapForTable(tableB, graph);
        if (capA === null || capB === null) continue;

        const sizeA = resA.party_size;
        const sizeB = resB.party_size;
        if (sizeA === sizeB) continue;
        if ((sizeA > sizeB && capA >= capB) || (sizeB > sizeA && capB >= capA)) continue;

        if (!canUse(tableB, resA)) continue;
        if (!canUse(tableA, resB)) continue;

        const modeA = getModeFor(tableA, sizeA, graph);
        const modeB = getModeFor(tableB, sizeB, graph);
        const newModeA = getModeFor(tableB, sizeA, graph);
        const newModeB = getModeFor(tableA, sizeB, graph);
        if (MODE_ORDER[newModeA] > MODE_ORDER[modeA]) continue;
        if (MODE_ORDER[newModeB] > MODE_ORDER[modeB]) continue;

        state.assignments.set(idA, tableB);
        state.assignments.set(idB, tableA);
        swapped = true;
        break outerLoop;
      }
    }
  }

  const assignments: CycleAssignmentResult['assignments'] = [];
  let requires_staff_review = false;

  for (const res of reservations) {
    const tableName = state.assignments.get(res.id);
    if (!tableName) continue;
    const mode = getModeFor(tableName, res.party_size, graph);
    if (mode === 'improvised') requires_staff_review = true;
    const assignment: TableAssignment = {
      id: `${res.id}_assignment`,
      created_at: null,
      reservation_id: res.id,
      table_name: tableName,
      physical_table_name: physicalTables(tableName)[0],
      date: res.date,
      cycle: res.cycle,
      assignment_mode: mode,
      was_reassigned: state.reassigned.has(res.id),
      requires_staff_review: mode === 'improvised',
    };
    assignments.push({ reservation: res, assignment });
  }

  return { date, cycle, assignments, unassigned, requires_staff_review };
}
