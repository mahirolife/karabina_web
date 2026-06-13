// ── Database row types ────────────────────────────────────────────────────────

export interface Table {
  id: number;
  table_name: string;
  min_capacity: number;
  comfort_max: number | null;
  absolute_max: number;
  is_combination: boolean;
  is_split: boolean;
}

export interface TableCombination {
  id: string;
  combination_name: string;
  constituent_table_names: string[];
  comfort_max: number | null;
  absolute_max: number;
}

export interface Reservation {
  id: string;
  created_at: string | null;
  name: string;
  email: string;
  phone: string;
  party_size: number;
  date: string;           // ISO date string: "YYYY-MM-DD"
  cycle: 1 | 2;
  arrival_time: string;   // "HH:MM"
  status: 'pending' | 'confirmed' | 'seated' | 'cancelled';
  notes: string | null;
  shared_table: boolean;
  shared_table_consent: boolean;
  square_card_token: string | null;
  square_customer_id?: string | null;
  square_card_id?: string | null;
  cancellation_token?: string;
  locked?: boolean;
  cancelled_at?: string | null;
  charged_at?: string | null;
  charge_amount_yen?: number | null;
}

export interface TableAssignment {
  id: string;
  created_at: string | null;
  reservation_id: string | null;
  table_name: string;
  physical_table_name: string;
  date: string;
  cycle: 1 | 2;
  assignment_mode: 'comfort' | 'stretch' | 'improvised';
  was_reassigned: boolean;
  requires_staff_review: boolean;
}

// ── Derived / algorithm types ─────────────────────────────────────────────────

/** Adjacency graph used by the table-assignment algorithm. */
export interface TableGraph {
  tables: Table[];
  combinations: TableCombination[];
  /** table_name → names of tables it can be physically combined with */
  adjacency: Record<string, string[]>;
}

/** Outcome of assigning tables for all reservations in one cycle on one date. */
export interface CycleAssignmentResult {
  date: string;   // "YYYY-MM-DD"
  cycle: 1 | 2;
  assignments: Array<{
    reservation: Reservation;
    assignment: TableAssignment;
  }>;
  /** Reservations that could not be seated within capacity limits. */
  unassigned: Reservation[];
  /** True when at least one assignment needs a staff decision. */
  requires_staff_review: boolean;
}
