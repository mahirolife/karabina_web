import { findSeatingOptions, physicalTables } from './tableGraph';
import type { Reservation, TableGraph } from './types';

/**
 * Greedily simulates table assignments for a set of reservations to derive
 * which physical table names are occupied. Reservations are processed in
 * created_at order so the result is deterministic.
 */
export function deriveOccupied(
  reservations: Reservation[],
  graph: TableGraph,
  preOccupied: Set<string> = new Set(),
): Set<string> {
  const occupied = new Set<string>(preOccupied);

  const sorted = [...reservations].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  );

  for (const r of sorted) {
    const options = findSeatingOptions(graph, r.party_size, occupied);
    if (options.length === 0) continue;

    const entity = options[0].entity;
    const logicalName = 'table_name' in entity ? entity.table_name : entity.combination_name;
    for (const p of physicalTables(logicalName)) occupied.add(p);
  }

  return occupied;
}

export function validateBooking(
  newReservation: Reservation,
  existingReservations: Reservation[],
  graph: TableGraph,
  partyOfOneEnabled: boolean,
  preOccupied: Set<string> = new Set(),
): { valid: boolean; reason?: string; suggestCycle2?: boolean } {
  const { party_size, date, cycle } = newReservation;

  // Rule 1: single-guest bookings require the setting to be on
  if (party_size === 1 && !partyOfOneEnabled) {
    return {
      valid: false,
      reason: 'Single-guest reservations are not currently available online. Please call us to book.',
    };
  }

  // Rule 2: parties of 19+ must call
  if (party_size >= 19) {
    return {
      valid: false,
      reason: 'For parties of 19 or more, please call us directly at 0136-50-2850.',
    };
  }

  // Only active reservations on the same date consume table space
  const activeOnDay = existingReservations.filter(
    r => r.date === date && r.status !== 'cancelled',
  );

  const reservationsForCycle = (c: 1 | 2) => activeOnDay.filter(r => r.cycle === c);

  // Rule 3: check whether the requested cycle has room
  const occupied = deriveOccupied(reservationsForCycle(cycle), graph, preOccupied);
  const options = findSeatingOptions(graph, party_size, occupied);

  if (options.length > 0) {
    return { valid: true };
  }

  // Rule 4: if Cycle 1 was requested and is full, check Cycle 2 as a fallback
  if (cycle === 1) {
    const occupied2 = deriveOccupied(reservationsForCycle(2), graph);
    const options2 = findSeatingOptions(graph, party_size, occupied2);

    if (options2.length > 0) {
      return {
        valid: false,
        reason: 'Cycle 1 is fully booked for that date. Cycle 2 still has availability — would you like to switch?',
        suggestCycle2: true,
      };
    }
  }

  return {
    valid: false,
    reason: 'No seating is available for your party size on that date.',
  };
}
