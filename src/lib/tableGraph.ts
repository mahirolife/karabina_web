import type { Table, TableCombination, TableGraph } from './types';

/**
 * Maps a logical table name to the atomic physical units it occupies.
 *
 * '1A' and '1B' are independent halves of physical table 1 — they do NOT
 * block each other, but both are blocked when the full table ('1' or '1+2')
 * is taken.
 *
 *   '1A'  → ['1A']           half — only occupies its own slot
 *   '1B'  → ['1B']           half — only occupies its own slot
 *   '1'   → ['1A','1B']      full table = both halves
 *   '1+2' → ['1A','1B','2']  combo: full table-1 + table-2
 *   '3+4' → ['3','4']
 *   '6+7' → ['6','7']
 *   '8'   → ['8']            everything else is atomic
 */
export function physicalTables(name: string): string[] {
  if (name === '1A' || name === '1B') return [name];
  if (name === '1') return ['1A', '1B'];
  if (name.includes('+')) {
    return name.split('+').flatMap(n => n === '1' ? ['1A', '1B'] : [n]);
  }
  return [name];
}

/**
 * Builds a TableGraph from raw DB rows.
 * Adjacency is derived from combinations: any two tables that appear together
 * in a combination are considered neighbours.
 */
export function buildTableGraph(
  tables: Table[],
  combinations: TableCombination[],
): TableGraph {
  const adjacency: Record<string, string[]> = {};

  for (const t of tables) {
    adjacency[t.table_name] = [];
  }

  for (const combo of combinations) {
    const names = combo.constituent_table_names;
    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < names.length; j++) {
        if (i === j) continue;
        const list = (adjacency[names[i]] ??= []);
        if (!list.includes(names[j])) list.push(names[j]);
      }
    }
  }

  return { tables, combinations, adjacency };
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export function getTableByName(graph: TableGraph, name: string): Table | undefined {
  return graph.tables.find(t => t.table_name === name);
}

/** All combinations that include the given table. */
export function findCombinationsFor(graph: TableGraph, tableName: string): TableCombination[] {
  return graph.combinations.filter(c => c.constituent_table_names.includes(tableName));
}

/** comfort_max when set, otherwise falls back to absolute_max. */
export function getComfortCapacity(entity: Table | TableCombination): number {
  return entity.comfort_max ?? entity.absolute_max;
}

/**
 * Returns the tightest assignment mode that fits the party, or null if
 * absolute_max is exceeded. absolute_max is a hard cap for all algorithmic
 * assignment — only explicit staff manual overrides may exceed it.
 *
 * comfort — party fits within comfort_max (preferred)
 * stretch — party exceeds comfort_max but fits absolute_max
 * null    — party exceeds absolute_max; not offered by the algorithm
 */
export function assignmentMode(
  entity: Table | TableCombination,
  partySize: number,
): 'comfort' | 'stretch' | null {
  const comfort = entity.comfort_max ?? entity.absolute_max;
  if (partySize <= comfort) return 'comfort';
  if (partySize <= entity.absolute_max) return 'stretch';
  return null;
}

/**
 * Returns every seatable option (individual tables and combinations) for the
 * given party size, sorted from tightest comfort fit to loosest improvised.
 *
 * occupiedTableNames — physical table names already assigned in this cycle.
 * Any individual table in that set is excluded, and any combination whose
 * constituent tables overlap with it is excluded entirely.
 */
export function findSeatingOptions(
  graph: TableGraph,
  partySize: number,
  occupiedTableNames: ReadonlySet<string> = new Set(),
): Array<{ entity: Table | TableCombination; mode: 'comfort' | 'stretch' }> {
  const results: Array<{ entity: Table | TableCombination; mode: 'comfort' | 'stretch' }> = [];

  for (const entity of [...graph.tables, ...graph.combinations]) {
    if ('table_name' in entity) {
      if (physicalTables(entity.table_name).some(p => occupiedTableNames.has(p))) continue;
    } else {
      // Use the combination_name (not constituent_table_names) so that split-half
      // combos like '1A' only block their own slot, while '1+2' correctly blocks
      // both '1A' and '1B'.
      if (physicalTables(entity.combination_name).some(p => occupiedTableNames.has(p))) continue;
    }

    const mode = assignmentMode(entity, partySize);
    if (mode !== null) results.push({ entity, mode });
  }

  const order = { comfort: 0, stretch: 1, improvised: 2 };
  return results.sort((a, b) => {
    if (order[a.mode] !== order[b.mode]) return order[a.mode] - order[b.mode];
    // Prefer individual tables over combinations in the same mode — avoids wasting
    // a combo (e.g. 6+7) when a single table already fits the party.
    const aIsCombo = !('table_name' in a.entity);
    const bIsCombo = !('table_name' in b.entity);
    if (aIsCombo !== bIsCombo) return aIsCombo ? 1 : -1;
    // Within same type and mode, prefer smallest comfortable fit to leave bigger tables free
    return getComfortCapacity(a.entity) - getComfortCapacity(b.entity);
  });
}
