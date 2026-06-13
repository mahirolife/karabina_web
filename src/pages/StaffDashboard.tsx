import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, BookOpen, Users, AlertCircle,
  Calendar as CalendarIcon, X, Plus, Store, Lock, LockOpen,
  Phone, Mail, GripHorizontal, Clock,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { Reservation, TableAssignment, TableGraph } from '../lib/types';
import { buildTableGraph, physicalTables, assignmentMode } from '../lib/tableGraph';
import { assignCycle } from '../lib/assignTables';

// Returns true if `asgTable` (e.g. '6+7', '1A') belongs to whiteboard block `blockTable` (e.g. '6', '1')
function assignmentMatchesBlock(asgTable: string, blockTable: string): boolean {
  if (asgTable === blockTable) return true;
  const blockParts = blockTable.split('+');
  const asgParts = asgTable.split('+');
  return asgParts.every(p => blockParts.some(bp => p === bp || p.startsWith(bp)));
}

function isLateCancel(res: { date: string; arrival_time: string; cancelled_at?: string | null }): boolean {
  if (!res.cancelled_at) return false;
  const resTime = new Date(`${res.date}T${res.arrival_time}:00`);
  const cancelTime = new Date(res.cancelled_at);
  return (resTime.getTime() - cancelTime.getTime()) / 3_600_000 < 24;
}

async function runPhase2Optimization(
  dateStr: string,
  reservationsForDate: Reservation[],
  graph: TableGraph,
  sb: typeof supabase,
): Promise<void> {
  for (const cycleNum of [1, 2] as const) {
    const cycleReservations = reservationsForDate.filter(r => r.cycle === cycleNum);
    if (cycleReservations.length === 0) continue;

    const { data: existingAsgData } = await sb
      .from('table_assignments')
      .select('*')
      .in('reservation_id', cycleReservations.map(r => r.id));

    const existingAsgs = (existingAsgData ?? []) as TableAssignment[];

    const seatedIds = new Set(cycleReservations.filter(r => r.status === 'seated' || r.locked === true).map(r => r.id));
    const unlockedReservations = cycleReservations.filter(r => r.status !== 'seated' && r.locked !== true);

    if (unlockedReservations.length === 0) continue;

    const preOccupied = new Set<string>(
      existingAsgs
        .filter(a => a.reservation_id != null && seatedIds.has(a.reservation_id))
        .flatMap(a => physicalTables(a.table_name))
    );

    const result = assignCycle(unlockedReservations, graph, preOccupied);

    const unlockedIds = new Set(unlockedReservations.map(r => r.id));
    const idsToDelete = existingAsgs
      .filter(a => a.reservation_id != null && unlockedIds.has(a.reservation_id))
      .map(a => a.id);

    if (idsToDelete.length > 0) {
      await sb.from('table_assignments').delete().in('id', idsToDelete);
    }

    if (result.assignments.length > 0) {
      await sb.from('table_assignments').insert(
        result.assignments.map(({ reservation: r, assignment: a }) => ({
          reservation_id: r.id,
          date: dateStr,
          cycle: cycleNum,
          table_name: a.table_name,
          physical_table_name: a.physical_table_name,
          assignment_mode: a.assignment_mode,
          was_reassigned: a.was_reassigned,
          requires_staff_review: a.requires_staff_review,
        }))
      );
    }
  }
}

const PHYSICAL_TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function generateSlots(startH: number, startM: number, endH: number, endM: number, cycle: 1 | 2): Array<{ time: string; cycle: 1 | 2 }> {
  const slots: Array<{ time: string; cycle: 1 | 2 }> = [];
  let h = startH, m = startM;
  while (h < endH || (h === endH && m <= endM)) {
    slots.push({ time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, cycle });
    m += 15;
    if (m >= 60) { m = 0; h++; }
  }
  return slots;
}

const CYCLE_TIMES: Array<{ time: string; cycle: 1 | 2 }> = [
  ...generateSlots(18, 0, 19, 45, 1),  // 18:00 – 19:45
  ...generateSlots(20, 0, 22, 0, 2),   // 20:00 – 22:00
];

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([]);
  const [tableGraph, setTableGraph] = useState<TableGraph | null>(null);
  const [partyOfOneEnabled, setPartyOfOneEnabled] = useState(false);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'whiteboard' | 'book'>('whiteboard');
  const [cancelledForDate, setCancelledForDate] = useState<Reservation[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isCancelConfirm, setIsCancelConfirm] = useState(false);
  const [isAddingRes, setIsAddingRes] = useState<{ tableName: string | null; cycle: 1 | 2 } | null>(null);
  const [modalCycle, setModalCycle] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [chargeRes, setChargeRes] = useState<Reservation | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [cancelledHeight, setCancelledHeight] = useState(120);
  const [reassignMode, setReassignMode] = useState(false);
  const [timeChangeMode, setTimeChangeMode] = useState(false);

  useEffect(() => {
    if (isAddingRes) setModalCycle(isAddingRes.cycle);
  }, [isAddingRes]);

  useEffect(() => { setReassignMode(false); setTimeChangeMode(false); }, [selectedRes?.id]);

  const isClosed = closedDates.includes(format(selectedDate, 'yyyy-MM-dd'));
  const selectedResAssignment = selectedRes
    ? tableAssignments.find(a => a.reservation_id === selectedRes.id)
    : null;
  const totalGuests = reservations.reduce((sum, r) => sum + r.party_size, 0);
  const cycle1Guests = reservations.filter(r => r.cycle === 1).reduce((sum, r) => sum + r.party_size, 0);
  const cycle2Guests = reservations.filter(r => r.cycle === 2).reduce((sum, r) => sum + r.party_size, 0);

  useEffect(() => {
    const fetchConfig = async () => {
      const [tablesRes, combinationsRes, settingsRes, closedRes] = await Promise.all([
        supabase.from('tables').select('*'),
        supabase.from('table_combinations').select('*'),
        supabase.from('restaurant_settings')
          .select('setting_value')
          .eq('setting_name', 'party_of_one_enabled')
          .maybeSingle(),
        supabase.from('closed_dates').select('date'),
      ]);
      if (tablesRes.data && combinationsRes.data) {
        setTableGraph(buildTableGraph(tablesRes.data, combinationsRes.data));
      }
      setPartyOfOneEnabled(settingsRes.data?.setting_value ?? false);
      if (closedRes.data) {
        setClosedDates(closedRes.data.map((d: { date: string }) => d.date));
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!tableGraph) return;
    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: resData, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('date', dateStr)
        .neq('status', 'cancelled');
      if (cancelled) return;
      if (error) { setIsLoading(false); return; }
      const resList: Reservation[] = resData ?? [];
      const { data: cancelledData } = await supabase
        .from('reservations').select('*').eq('date', dateStr).eq('status', 'cancelled')
        .order('cancelled_at', { ascending: false });
      if (!cancelled) setCancelledForDate(cancelledData ?? []);

      if (resList.length > 0) {
        await runPhase2Optimization(dateStr, resList, tableGraph, supabase);
        if (cancelled) return;
        const { data: asgData } = await supabase
          .from('table_assignments')
          .select('*')
          .in('reservation_id', resList.map(r => r.id));
        if (!cancelled) {
          setReservations(resList);
          setTableAssignments(asgData ?? []);
        }
      } else {
        if (!cancelled) {
          setReservations([]);
          setTableAssignments([]);
        }
      }
      if (!cancelled) setIsLoading(false);
    };
    fetch();
    return () => { cancelled = true; };
  }, [selectedDate, tableGraph]);

  const refreshReservations = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const [{ data: resData }, { data: cancelledData }] = await Promise.all([
      supabase.from('reservations').select('*').eq('date', dateStr).neq('status', 'cancelled'),
      supabase.from('reservations').select('*').eq('date', dateStr).eq('status', 'cancelled')
        .order('cancelled_at', { ascending: false }),
    ]);
    const resList: Reservation[] = resData ?? [];
    setCancelledForDate(cancelledData ?? []);
    if (resList.length > 0) {
      if (tableGraph) {
        await runPhase2Optimization(dateStr, resList, tableGraph, supabase);
      }
      const { data: asgData } = await supabase
        .from('table_assignments').select('*').in('reservation_id', resList.map(r => r.id));
      setReservations(resList);
      setTableAssignments(asgData ?? []);
    } else {
      setReservations([]);
      setTableAssignments([]);
    }
  };

  const togglePartyOfOne = async () => {
    const newValue = !partyOfOneEnabled;
    const { error } = await supabase
      .from('restaurant_settings')
      .update({ setting_value: newValue })
      .eq('setting_name', 'party_of_one_enabled');
    if (!error) setPartyOfOneEnabled(newValue);
  };

  const toggleStatus = async (id: string) => {
    const res = reservations.find(r => r.id === id);
    if (!res) return;
    const newStatus: Reservation['status'] = res.status === 'seated' ? 'confirmed' : 'seated';
    const { error } = await supabase
      .from('reservations').update({ status: newStatus }).eq('id', id);
    if (error) { console.error('Status update failed:', error); return; }
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setSelectedRes(null);
  };

  const toggleLock = async (id: string) => {
    const res = reservations.find(r => r.id === id);
    if (!res) return;
    const newLocked = !res.locked;
    const { error } = await supabase.from('reservations').update({ locked: newLocked }).eq('id', id);
    if (error) { console.error('Lock toggle failed:', error); return; }
    await refreshReservations();
  };

  const handleTableReassign = async (resId: string, targetTableName: string) => {
    const res = reservations.find(r => r.id === resId);
    if (!res || !tableGraph) return;

    const existingAsg = tableAssignments.find(a => a.reservation_id === resId);
    if (existingAsg?.table_name === targetTableName) return;

    const targetPhysicals = physicalTables(targetTableName);
    const occupyingAsg = tableAssignments.find(a =>
      a.reservation_id !== null &&
      a.reservation_id !== resId &&
      a.cycle === res.cycle &&
      physicalTables(a.table_name).some(p => targetPhysicals.includes(p))
    );

    const getMode = (tName: string, partySize: number): 'comfort' | 'stretch' | 'improvised' => {
      const ent = tName.includes('+')
        ? tableGraph!.combinations.find(c => c.combination_name === tName)
        : tableGraph!.tables.find(t => t.table_name === tName);
      return ent ? (assignmentMode(ent, partySize) ?? 'improvised') : 'improvised';
    };

    if (occupyingAsg) {
      const otherRes = reservations.find(r => r.id === occupyingAsg.reservation_id);
      const sourceTableName = existingAsg?.table_name;
      if (!otherRes || !sourceTableName) return;

      const modeA = getMode(targetTableName, res.party_size);
      const modeB = getMode(sourceTableName, otherRes.party_size);

      await supabase.from('table_assignments').update({
        table_name: targetTableName,
        physical_table_name: physicalTables(targetTableName)[0],
        assignment_mode: modeA,
        requires_staff_review: modeA === 'improvised',
        was_reassigned: true,
      }).eq('id', existingAsg!.id);

      await supabase.from('table_assignments').update({
        table_name: sourceTableName,
        physical_table_name: physicalTables(sourceTableName)[0],
        assignment_mode: modeB,
        requires_staff_review: modeB === 'improvised',
        was_reassigned: true,
      }).eq('id', occupyingAsg.id);

      await supabase.from('reservations').update({ locked: true }).in('id', [resId, otherRes.id]);
    } else {
      const mode = getMode(targetTableName, res.party_size);
      if (existingAsg) {
        await supabase.from('table_assignments').update({
          table_name: targetTableName,
          physical_table_name: physicalTables(targetTableName)[0],
          assignment_mode: mode,
          requires_staff_review: mode === 'improvised',
        }).eq('id', existingAsg.id);
      } else {
        await supabase.from('table_assignments').insert({
          reservation_id: resId,
          table_name: targetTableName,
          physical_table_name: physicalTables(targetTableName)[0],
          date: res.date,
          cycle: res.cycle,
          assignment_mode: mode,
          requires_staff_review: mode === 'improvised',
          was_reassigned: true,
        });
      }
      await supabase.from('reservations').update({ locked: true }).eq('id', resId);
    }

    setReassignMode(false);
    setSelectedRes(null);
    await refreshReservations();
  };

  const handleTimeChange = async (resId: string, newTime: string, newCycle: 1 | 2) => {
    const res = reservations.find(r => r.id === resId);
    if (!res) return;
    if (res.cycle !== newCycle) {
      await supabase.from('table_assignments').delete().eq('reservation_id', resId);
      await supabase.from('reservations').update({
        cycle: newCycle,
        arrival_time: newTime,
        locked: false,
      }).eq('id', resId);
    } else {
      await supabase.from('reservations').update({ arrival_time: newTime }).eq('id', resId);
    }
    setTimeChangeMode(false);
    setSelectedRes(null);
    await refreshReservations();
  };

  const handleCancelReservation = async (id: string) => {
    const { error: statusError } = await supabase
      .from('reservations').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id);
    if (statusError) { console.error('Cancel failed:', statusError); return; }
    await supabase.from('table_assignments').delete().eq('reservation_id', id);
    setSelectedRes(null);
    setIsCancelConfirm(false);
    await refreshReservations();
  };

  const handleCharge = async () => {
    if (!chargeRes?.square_customer_id || !chargeRes?.square_card_id) return;
    setIsCharging(true);
    setChargeError(null);
    try {
      const res = await fetch('/api/square/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          square_customer_id: chargeRes.square_customer_id,
          square_card_id: chargeRes.square_card_id,
          party_size: chargeRes.party_size,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await supabase.from('reservations').update({
        charged_at: new Date().toISOString(),
        charge_amount_yen: json.amount_yen,
      }).eq('id', chargeRes.id);
      setChargeRes(null);
      await refreshReservations();
    } catch (e: any) {
      setChargeError(e.message ?? '請求に失敗しました');
    } finally {
      setIsCharging(false);
    }
  };

  const handleAddReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAddingRes || !tableGraph) return;
    setAddError(null);
    setIsSubmittingAdd(true);
    const isSlotAdd = isAddingRes.tableName !== null;
    try {
      const formData = new FormData(e.currentTarget);
      const cycleNum = modalCycle;
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const partySize = parseInt(formData.get('guests') as string);
      if (partySize === 1 && !partyOfOneEnabled) {
        setAddError('1名予約は現在受け付けていません。');
        return;
      }
      const cycleReservations = reservations.filter(r => r.cycle === cycleNum);
      // isSlotAdd = staff explicitly clicked a table; skip algorithmic gate and allow override.
      if (!isSlotAdd) {
        const cycleLockedIds = new Set(
          cycleReservations.filter(r => r.status === 'seated' || r.locked === true).map(r => r.id)
        );
        const unlockedCycleReservations = cycleReservations.filter(r => !cycleLockedIds.has(r.id));
        const preOccupied = new Set<string>(
          tableAssignments
            .filter(a => a.cycle === cycleNum && a.reservation_id !== null && cycleLockedIds.has(a.reservation_id))
            .flatMap(a => physicalTables(a.table_name))
        );
        const testRes: Reservation = {
          id: 'capacity-check',
          created_at: new Date().toISOString(),
          name: '',
          email: '',
          phone: '',
          party_size: partySize,
          date: dateStr,
          cycle: cycleNum,
          arrival_time: '',
          status: 'pending',
          notes: null,
          shared_table: false,
          shared_table_consent: false,
          square_card_token: null,
        };
        const baseline = assignCycle(unlockedCycleReservations, tableGraph, preOccupied);
        const baselineUnassignedIds = new Set(baseline.unassigned.map(r => r.id));
        const capacityCheck = assignCycle([...unlockedCycleReservations, testRes], tableGraph, preOccupied);
        const rejected =
          capacityCheck.unassigned.some(r => r.id === 'capacity-check') ||
          capacityCheck.unassigned.some(r => r.id !== 'capacity-check' && !baselineUnassignedIds.has(r.id));
        if (rejected) {
          setAddError(modalCycle === 1
            ? '第1部はご指定の人数に対応できるテーブルがありません。'
            : '第2部はご指定の人数に対応できるテーブルがありません。');
          return;
        }
      }
      const { data: insertedData, error: resError } = await supabase.from('reservations').insert([{
        name: formData.get('name') as string,
        email: '',
        phone: '',
        party_size: partySize,
        date: dateStr,
        cycle: cycleNum,
        arrival_time: formData.get('time') as string,
        status: 'confirmed',
        notes: (formData.get('note') as string) || null,
        shared_table: false,
        shared_table_consent: false,
        square_card_token: null,
        locked: isSlotAdd,
      }]).select().single();
      if (resError || !insertedData) { setAddError('保存に失敗しました: ' + (resError?.message ?? '')); return; }

      if (isSlotAdd && isAddingRes.tableName) {
        const tbl = tableGraph.tables.find(t => t.table_name === isAddingRes.tableName);
        const comfortMax = tbl?.comfort_max ?? tbl?.absolute_max ?? partySize;
        const absoluteMax = tbl?.absolute_max ?? partySize;
        const mode = partySize <= comfortMax ? 'comfort' : partySize <= absoluteMax ? 'stretch' : 'improvised';
        await supabase.from('table_assignments').insert([{
          reservation_id: insertedData.id,
          date: dateStr,
          cycle: cycleNum,
          table_name: isAddingRes.tableName,
          physical_table_name: isAddingRes.tableName,
          assignment_mode: mode,
          was_reassigned: false,
          requires_staff_review: false,
        }]);
      }

      setIsAddingRes(null);
      await refreshReservations();
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const toggleDateHoliday = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (closedDates.includes(dateStr)) {
      const { error } = await supabase.from('closed_dates').delete().eq('date', dateStr);
      if (!error) setClosedDates(prev => prev.filter(d => d !== dateStr));
    } else {
      const { error } = await supabase.from('closed_dates').insert([{ date: dateStr }]);
      if (!error) setClosedDates(prev => [...prev, dateStr]);
    }
  };

  const DotGrid = () => (
    <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
      <svg width="100%" height="100%">
        <pattern id="dotGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#4D2C1A" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#dotGrid)" />
      </svg>
    </div>
  );

  const daysInMonth = () => {
    const start = startOfWeek(startOfMonth(calendarMonth));
    const end = endOfWeek(endOfMonth(calendarMonth));
    return eachDayOfInterval({ start, end });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-[#f8f5f2] text-brown font-sans relative overflow-hidden flex flex-col"
    >
      {/* HEADER */}
      <header className="bg-white border-b border-brown/10 px-6 py-3 flex items-center justify-between z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tighter uppercase">Karabina スタッフ用</h1>
          <div className="h-6 w-px bg-brown/10 mx-2 hidden sm:block" />
          <div className="flex items-center gap-2 bg-cream/50 p-1 rounded-full border border-brown/5">
            <button
              onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="p-1 hover:bg-brown/20 rounded-full transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <AnimatePresence mode="wait">
              <motion.button
                key={format(selectedDate, 'yyyy-MM-dd')}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => { setIsCalendarOpen(true); setCalendarMonth(selectedDate); }}
                className="text-sm font-mono font-bold px-4 py-1 hover:bg-brown/10 hover:shadow-inner rounded-full transition-all flex items-center gap-2 min-w-[180px] justify-center active:scale-[0.98]"
              >
                <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
                {format(selectedDate, 'yyyy年 MM月 dd日', { locale: ja })}
                {isClosed && <span className="text-[10px] bg-red-500 text-white px-1.5 rounded-full">定休日</span>}
                {isLoading && <span className="text-[10px] opacity-40 animate-pulse ml-1">読込中</span>}
              </motion.button>
            </AnimatePresence>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="p-1 hover:bg-brown/20 rounded-full transition-all active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePartyOfOne}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border active:scale-95",
              partyOfOneEnabled
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-white text-brown/50 border-brown/10 hover:bg-brown/5"
            )}
          >
            1名予約
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              partyOfOneEnabled ? "bg-green-600 text-white" : "bg-brown/10 text-brown/40"
            )}>
              {partyOfOneEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
          <div className="h-6 w-px bg-brown/10" />
          <button
            onClick={() => { setIsHolidayModalOpen(true); setCalendarMonth(selectedDate); }}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 bg-white text-brown border border-brown/10 hover:bg-brown/5 hover:border-brown/30 hover:shadow-sm active:scale-95"
          >
            <Store className="w-4 h-4" />
            定休日設定
          </button>
          <div className="h-6 w-px bg-brown/10 mx-1" />
          <button
            onClick={() => setIsAddingRes({ tableName: null, cycle: 1 })}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 bg-brown text-cream hover:shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            予約追加
          </button>
          <div className="h-6 w-px bg-brown/10 mx-1" />
          <button
            onClick={() => setViewMode('whiteboard')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95",
              viewMode === 'whiteboard' ? "bg-brown text-cream shadow-md" : "bg-white text-brown border border-transparent hover:bg-brown/5 hover:border-brown/10"
            )}
          >
            ホワイトボード
          </button>
          <button
            onClick={() => setViewMode('book')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-2 active:scale-95",
              viewMode === 'book' ? "bg-brown text-cream shadow-md" : "bg-white text-brown border border-transparent hover:bg-brown/5 hover:border-brown/10"
            )}
          >
            <BookOpen className="w-4 h-4" />
            予約帳
          </button>
          <div className="h-6 w-px bg-brown/10 mx-1" />
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate('/staff/login', { replace: true }); }}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 bg-white text-brown/40 border border-brown/10 hover:text-brown hover:border-brown/30 hover:bg-brown/5"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* CALENDAR MODAL */}
      <AnimatePresence>
        {isCalendarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCalendarOpen(false)}
              className="absolute inset-0 bg-brown/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-brown p-6 text-cream flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="hover:bg-white/10 p-1 rounded-full">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-lg font-bold min-w-[120px] text-center">
                    {format(calendarMonth, 'yyyy年 MM月', { locale: ja })}
                  </div>
                  <button onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="hover:bg-white/10 p-1 rounded-full">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <button onClick={() => setIsCalendarOpen(false)} className="hover:bg-white/10 p-1 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-2 text-brown">
                  {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold opacity-40 uppercase py-2">{day}</div>
                  ))}
                  {daysInMonth().map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedDate(day); setIsCalendarOpen(false); }}
                      className={cn(
                        "aspect-square rounded-full flex items-center justify-center text-sm transition-all relative font-bold",
                        !isSameMonth(day, calendarMonth) && "opacity-10",
                        isSameDay(day, selectedDate) ? "bg-brown text-cream" : "hover:bg-brown/5",
                        isSameDay(day, new Date()) && !isSameDay(day, selectedDate) && "text-orange-500 after:content-[''] after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-orange-500 after:rounded-full"
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setSelectedDate(new Date()); setIsCalendarOpen(false); }}
                  className="w-full mt-4 py-2 text-xs font-bold uppercase tracking-widest text-brown/60 hover:text-brown transition-colors"
                >
                  今日に戻る
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESERVATION DETAIL MODAL */}
      <AnimatePresence>
        {selectedRes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelectedRes(null); setIsCancelConfirm(false); }}
              className="absolute inset-0 bg-brown/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-bold tracking-tighter mb-1">{selectedRes.name}</h3>
                  <p className="text-sm font-mono opacity-60 uppercase tracking-widest">
                    Table {selectedResAssignment?.table_name ?? '?'} • {selectedRes.arrival_time}
                  </p>
                </div>
                <button onClick={() => setSelectedRes(null)} className="p-2 hover:bg-brown/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cream/30 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold opacity-40 mb-1">人数</p>
                    <p className="text-xl font-bold flex items-center gap-2">
                      <Users className="w-5 h-5" /> {selectedRes.party_size}名
                    </p>
                  </div>
                  <div className="bg-cream/30 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold opacity-40 mb-1">ステータス</p>
                    <p className={cn(
                      "text-lg font-bold",
                      selectedRes.status === 'seated' ? "text-green-600" :
                      selectedRes.status === 'pending' ? "text-orange-500" : "text-brown"
                    )}>
                      {selectedRes.status === 'seated' ? '着席済' :
                       selectedRes.status === 'confirmed' ? '確認済' : '確認待ち'}
                    </p>
                  </div>
                </div>

                <div className="bg-cream/30 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">予約日</p>
                  <p className="text-sm font-bold">
                    {format(new Date(selectedRes.date), 'yyyy年M月d日 (eee)', { locale: ja })}
                    {' '}— サイクル {selectedRes.cycle}
                  </p>
                </div>

                <div className="bg-cream/30 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">電話番号</p>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Phone className="w-4 h-4 opacity-50" /> {selectedRes.phone}
                  </p>
                </div>

                <div className="bg-cream/30 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">メールアドレス</p>
                  <p className="text-sm font-bold flex items-center gap-2 break-all">
                    <Mail className="w-4 h-4 opacity-50 shrink-0" /> {selectedRes.email}
                  </p>
                </div>

                {selectedRes.notes && (
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100 italic text-sm text-red-900">
                    <p className="not-italic text-[10px] font-bold uppercase opacity-40 mb-1">特記事項</p>
                    {selectedRes.notes}
                  </div>
                )}

                {selectedResAssignment?.requires_staff_review && (
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-sm text-orange-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">スタッフ確認が必要</p>
                      テーブル割り当てをご確認ください。
                    </div>
                  </div>
                )}
              </div>

              {selectedRes.locked && (
                <div className="flex items-center gap-2 text-xs font-bold text-brown/50 mb-4 px-1">
                  <Lock className="w-3.5 h-3.5" />
                  テーブルにロック済み（アルゴリズムで移動しません）
                </div>
              )}

              {isCancelConfirm ? (
                <div className="flex flex-col gap-3">
                  <p className="text-center text-sm font-bold opacity-70 mb-1">本当にキャンセルしますか？</p>
                  <button
                    onClick={() => handleCancelReservation(selectedRes.id)}
                    className="w-full py-4 rounded-2xl font-bold text-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                  >
                    キャンセルを確定
                  </button>
                  <button
                    onClick={() => setIsCancelConfirm(false)}
                    className="w-full py-3 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
                  >
                    戻る
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => toggleStatus(selectedRes.id)}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-lg transition-all",
                      selectedRes.status === 'seated'
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-brown text-cream shadow-lg hover:shadow-xl hover:-translate-y-1"
                    )}
                  >
                    {selectedRes.status === 'seated' ? '着席を解除' : 'ご来店（着席）'}
                  </button>

                  {/* Table reassignment */}
                  {!reassignMode ? (
                    <button
                      onClick={() => { setReassignMode(true); setTimeChangeMode(false); }}
                      className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl border border-brown/20 hover:border-brown/40 text-brown/60 hover:text-brown text-xs font-bold transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                      テーブル再割り当て
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 border border-brown/15 rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-wider">移動先テーブルを選択</p>
                      <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
                        {tableGraph && (() => {
                          const currentAsgName = selectedResAssignment?.table_name;
                          const options = [
                            ...tableGraph.tables.map(t => t.table_name),
                            ...tableGraph.combinations.map(c => c.combination_name),
                          ];
                          return options.map(name => {
                            const isCurrent = currentAsgName === name ||
                              physicalTables(currentAsgName ?? '').some(p => physicalTables(name).includes(p));
                            if (isCurrent) return null;
                            const isSwap = tableAssignments.some(a =>
                              a.reservation_id !== null &&
                              a.reservation_id !== selectedRes.id &&
                              a.cycle === selectedRes.cycle &&
                              physicalTables(a.table_name).some(p => physicalTables(name).includes(p))
                            );
                            return (
                              <button
                                key={name}
                                onClick={() => handleTableReassign(selectedRes.id, name)}
                                className={cn(
                                  "py-1.5 px-2 rounded-lg text-xs font-bold transition-all border text-center",
                                  isSwap
                                    ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                                    : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                )}
                              >
                                <div>{name}</div>
                                <div className="text-[9px] font-normal opacity-70 mt-0.5">
                                  {isSwap ? 'スワップ' : '空き'}
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                      <button
                        onClick={() => setReassignMode(false)}
                        className="text-[10px] opacity-40 hover:opacity-70 transition-opacity text-center"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}

                  {/* Time / cycle change */}
                  {!timeChangeMode ? (
                    <button
                      onClick={() => { setTimeChangeMode(true); setReassignMode(false); }}
                      className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl border border-brown/20 hover:border-brown/40 text-brown/60 hover:text-brown text-xs font-bold transition-all"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      時間変更
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 border border-brown/15 rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-wider">新しい時間を選択</p>
                      {([1, 2] as const).map(cyc => (
                        <div key={cyc}>
                          <p className={cn(
                            "text-[9px] font-bold uppercase tracking-wider mb-1",
                            cyc !== selectedRes.cycle ? "opacity-40" : "opacity-60"
                          )}>
                            {cyc}部
                            {cyc !== selectedRes.cycle && <span className="ml-1 text-amber-500">（サイクル変更）</span>}
                          </p>
                          <div className="flex gap-1.5 flex-wrap">
                            {CYCLE_TIMES.filter(s => s.cycle === cyc).map(({ time }) => {
                              const isCurrent = selectedRes.arrival_time === time && selectedRes.cycle === cyc;
                              return (
                                <button
                                  key={time}
                                  disabled={isCurrent}
                                  onClick={() => handleTimeChange(selectedRes.id, time, cyc)}
                                  className={cn(
                                    "py-1.5 px-3 rounded-lg text-xs font-bold transition-all border",
                                    isCurrent
                                      ? "bg-brown/10 border-brown/20 text-brown/40 cursor-default"
                                      : cyc !== selectedRes.cycle
                                        ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                                        : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                  )}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <p className="text-[9px] opacity-40 mt-1">
                        サイクル変更するとテーブル割り当てがリセットされます
                      </p>
                      <button
                        onClick={() => setTimeChangeMode(false)}
                        className="text-[10px] opacity-40 hover:opacity-70 transition-opacity text-center mt-1"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setIsCancelConfirm(true)}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-red-500 border border-red-100 hover:bg-red-50 transition-all"
                  >
                    予約をキャンセル
                  </button>
                  <button
                    onClick={() => { setSelectedRes(null); setIsCancelConfirm(false); }}
                    className="w-full py-3 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHARGE MODAL */}
      <AnimatePresence>
        {chargeRes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setChargeRes(null); setChargeError(null); }}
              className="absolute inset-0 bg-brown/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tighter mb-1">{chargeRes.name}</h3>
                  <p className="text-xs font-mono opacity-60 uppercase tracking-widest">
                    {format(new Date(chargeRes.date), 'M月d日 (eee)', { locale: ja })}
                    {' '}· {chargeRes.cycle === 1 ? '1部' : '2部'} {chargeRes.arrival_time}
                  </p>
                </div>
                <button onClick={() => { setChargeRes(null); setChargeError(null); }} className="p-2 hover:bg-brown/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {/* Cancellation info */}
                <div className="bg-cream/30 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">キャンセル日時</p>
                  <p className="text-sm font-bold">
                    {chargeRes.cancelled_at
                      ? format(new Date(chargeRes.cancelled_at), 'M月d日 HH:mm')
                      : '—'}
                    {chargeRes.cancelled_at && (
                      <span className={cn(
                        "ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isLateCancel(chargeRes) ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                      )}>
                        {isLateCancel(chargeRes) ? '24時間以内' : '早期キャンセル'}
                      </span>
                    )}
                  </p>
                </div>

                {/* Card status */}
                <div className="bg-cream/30 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">カード情報</p>
                  <p className={cn("text-sm font-bold", chargeRes.square_card_id ? "text-green-600" : "opacity-40")}>
                    {chargeRes.square_card_id ? 'カード保存済み — 請求可能' : 'カード未登録 — 請求不可'}
                  </p>
                </div>

                {/* Charge amount */}
                <div className="bg-cream/30 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">請求金額</p>
                  <p className="text-xl font-bold">
                    {chargeRes.party_size}名 × ¥3,000 = ¥{(chargeRes.party_size * 3000).toLocaleString()}
                  </p>
                </div>
              </div>

              {chargeRes.charged_at ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                  <p className="text-sm font-bold text-green-700">
                    ✓ 請求済み — ¥{(chargeRes.charge_amount_yen ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 opacity-70 mt-1">
                    {format(new Date(chargeRes.charged_at), 'M月d日 HH:mm')}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {chargeError && (
                    <p className="text-xs text-red-600 font-bold bg-red-50 rounded-xl px-4 py-2 text-center">
                      {chargeError}
                    </p>
                  )}
                  <button
                    onClick={handleCharge}
                    disabled={!chargeRes.square_card_id || isCharging}
                    className="w-full py-4 rounded-2xl font-bold text-lg bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCharging ? '処理中...' : `¥${(chargeRes.party_size * 3000).toLocaleString()} を請求する`}
                  </button>
                  <button
                    onClick={() => { setChargeRes(null); setChargeError(null); }}
                    className="w-full py-3 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HOLIDAY SETTINGS MODAL */}
      <AnimatePresence>
        {isHolidayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsHolidayModalOpen(false)}
              className="absolute inset-0 bg-brown/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-red-500 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="hover:bg-white/10 p-1 rounded-full">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-lg font-bold min-w-[120px] text-center">
                    {format(calendarMonth, 'yyyy年 MM月', { locale: ja })}
                  </div>
                  <button onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="hover:bg-white/10 p-1 rounded-full">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">定休日カレンダー</span>
                  <button onClick={() => setIsHolidayModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-bold text-brown/40 uppercase mb-4 text-center">カレンダーをタップして定休日を切り替えます</p>
                <div className="grid grid-cols-7 gap-1 mb-2 text-brown">
                  {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold opacity-40 uppercase py-2">{day}</div>
                  ))}
                  {daysInMonth().map((day, idx) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const isHoliday = closedDates.includes(dayStr);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleDateHoliday(day)}
                        className={cn(
                          "aspect-square rounded-full flex flex-col items-center justify-center text-sm transition-all relative font-bold group",
                          !isSameMonth(day, calendarMonth) && "opacity-10",
                          isHoliday ? "bg-red-500 text-white" : "hover:bg-brown/5",
                          isSameDay(day, new Date()) && !isHoliday && "text-orange-500 after:content-[''] after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-orange-500 after:rounded-full"
                        )}
                      >
                        {format(day, 'd')}
                        {isHoliday && <Store className="w-2 h-2 mt-0.5 opacity-50" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="w-full mt-4 py-3 bg-brown text-cream rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  設定を完了する
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD RESERVATION MODAL */}
      <AnimatePresence>
        {isAddingRes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddingRes(null)}
              className="absolute inset-0 bg-brown/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <h3 className="text-2xl font-bold mb-2">新規予約</h3>
              {isAddingRes.tableName === null ? (
                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setModalCycle(1)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      modalCycle === 1 ? "bg-brown text-cream shadow" : "bg-cream/50 text-brown/60 hover:bg-cream"
                    )}
                  >
                    1部 (18:00〜)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalCycle(2)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      modalCycle === 2 ? "bg-brown text-cream shadow" : "bg-cream/50 text-brown/60 hover:bg-cream"
                    )}
                  >
                    2部 (20:00〜)
                  </button>
                </div>
              ) : (
                <p className="text-sm opacity-50 font-mono mb-6">
                  Table {isAddingRes.tableName} — {modalCycle === 1 ? '第1部 (18:00〜)' : '第2部 (20:00〜)'}
                </p>
              )}

              {addError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddReservation} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase opacity-40 mb-1">お名前</label>
                  <input name="name" required className="w-full bg-cream/30 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown/20" placeholder="田中 様" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase opacity-40 mb-1">人数</label>
                    <input name="guests" type="number" defaultValue="2" min="1" className="w-full bg-cream/30 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase opacity-40 mb-1">時間</label>
                    <input key={`time-${modalCycle}`} name="time" defaultValue={modalCycle === 1 ? '18:00' : '20:30'} className="w-full bg-cream/30 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown/20" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase opacity-40 mb-1">メモ</label>
                  <textarea name="note" className="w-full bg-cream/30 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown/20 h-20" placeholder="アレルギーなど..." />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="w-full py-4 bg-brown text-cream rounded-2xl font-bold text-lg mt-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-lg"
                >
                  {isSubmittingAdd ? '処理中...' : <><Plus className="w-5 h-5" /> 予約を確定</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 relative p-0 overflow-hidden">
        <DotGrid />

        <div className="absolute inset-x-1 inset-y-1 bg-white/40 border-2 border-brown/5 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          <AnimatePresence>
            {isClosed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-[#f8f5f2]/80 flex flex-col items-center justify-center text-center p-8 backdrop-blur-[2px]"
              >
                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center text-white mb-6">
                  <Store className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold mb-2">本日定休日</h2>
                <p className="text-lg opacity-60">
                  {format(selectedDate, 'yyyy年MM月dd日')}はお休みです。<br />
                  設定から営業日に変更できます。
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {viewMode === 'whiteboard' ? (
              <motion.div
                key="whiteboard"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                className="absolute inset-0 p-2 grid grid-cols-12 grid-rows-12 gap-2"
              >
                {(() => {
                  const activeCombos1 = new Set(
                    tableAssignments
                      .filter(a => a.table_name.includes('+'))
                      .filter(a => reservations.find(r => r.id === a.reservation_id)?.cycle === 1)
                      .map(a => a.table_name)
                  );
                  const activeCombos2 = new Set(
                    tableAssignments
                      .filter(a => a.table_name.includes('+'))
                      .filter(a => reservations.find(r => r.id === a.reservation_id)?.cycle === 2)
                      .map(a => a.table_name)
                  );
                  const activeCombos = new Set([...activeCombos1, ...activeCombos2]);
                  const TB = (tn: string, cls: string, onEmpty: (cycle: 1|2, tbl?: string) => void, cyc?: { 1: boolean; 2: boolean }) => (
                    <TableBlock tableName={tn} reservations={reservations} assignments={tableAssignments} onResClick={setSelectedRes} onEmptyClick={onEmpty} onLockToggle={toggleLock} className={cls} cycleIsCombined={cyc} />
                  );
                  return (
                    <>
                      {/* Row 1 — Tables 3, 9, [2+1 or 2 and 1] */}
                      {!activeCombos.has('3+4') && TB('3', 'col-span-3 row-span-4', (cycle) => setIsAddingRes({ tableName: '3', cycle }))}
                      {TB('9', 'col-span-2 row-span-4', (cycle) => setIsAddingRes({ tableName: '9', cycle }))}
                      {activeCombos.has('1+2') ? (
                        TB('1+2', 'col-start-6 col-span-7 row-span-4', (cycle, tbl) => setIsAddingRes({ tableName: tbl ?? '1+2', cycle }),
                          { 1: activeCombos1.has('1+2'), 2: activeCombos2.has('1+2') })
                      ) : (
                        <>
                          {TB('2', 'col-span-3 row-span-4', (cycle) => setIsAddingRes({ tableName: '2', cycle }))}
                          {TB('1', 'col-span-4 row-span-4', (cycle, tbl) => setIsAddingRes({ tableName: tbl ?? '1', cycle }))}
                        </>
                      )}

                      {/* Row 2 — [3+4 or 4], 5, 8 */}
                      {activeCombos.has('3+4') ? (
                        TB('3+4', 'col-start-1 col-span-3 row-start-1 row-span-8', (cycle, tbl) => setIsAddingRes({ tableName: tbl ?? '3+4', cycle }),
                          { 1: activeCombos1.has('3+4'), 2: activeCombos2.has('3+4') })
                      ) : (
                        TB('4', 'col-span-4 row-span-4 col-start-1 row-start-5', (cycle) => setIsAddingRes({ tableName: '4', cycle }))
                      )}
                      {TB('5', 'col-span-4 row-span-4 col-start-5 row-start-5', (cycle) => setIsAddingRes({ tableName: '5', cycle }))}
                      {TB('8', 'col-span-4 row-span-4 col-start-9 row-start-5', (cycle) => setIsAddingRes({ tableName: '8', cycle }))}

                      {/* Row 3 — Date button + [6+7 or 6 and 7] */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="col-span-6 row-span-4 col-start-1 row-start-9 bg-[#f06292] rounded-[2rem] shadow-xl p-4 flex items-center justify-center text-center text-white cursor-pointer group"
                        onClick={() => setViewMode('book')}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={format(selectedDate, 'yyyy-MM-dd')}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.1, opacity: 0 }}
                          >
                            <div className="text-3xl lg:text-4xl font-bold tracking-tighter mb-1 uppercase">
                              {format(selectedDate, 'EEEE', { locale: ja })}
                            </div>
                            <div className="text-base lg:text-lg opacity-90 font-mono tracking-widest uppercase">
                              {format(selectedDate, 'yyyy.MM.dd')}
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-bold group-hover:gap-4 transition-all bg-white/20 px-4 py-1.5 rounded-full">
                              予約帳を開く <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>

                      {activeCombos.has('6+7') ? (
                        TB('6+7', 'col-start-7 col-span-6 row-start-9 row-span-4', (cycle, tbl) => setIsAddingRes({ tableName: tbl ?? '6+7', cycle }),
                          { 1: activeCombos1.has('6+7'), 2: activeCombos2.has('6+7') })
                      ) : (
                        <>
                          {TB('6', 'col-span-3 row-span-4 col-start-7 row-start-9', (cycle) => setIsAddingRes({ tableName: '6', cycle }))}
                          {TB('7', 'col-span-3 row-span-4 col-start-10 row-start-9', (cycle) => setIsAddingRes({ tableName: '7', cycle }))}
                        </>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div
                key="book"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 p-6 lg:p-8 flex flex-col"
              >
                <div className="flex justify-between items-end mb-4 border-b-2 border-brown/10 pb-2 shrink-0">
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">予約帳</h2>
                    <p className="text-xs opacity-60 font-mono italic font-bold">予約詳細とステータス一覧</p>
                  </div>
                  <button onClick={() => setViewMode('whiteboard')} className="text-sm font-bold uppercase underline hover:opacity-70">
                    ホワイトボードに戻る
                  </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
                  {([1, 2] as const).map(cycleNum => {
                    const cycleReservations = reservations.filter(r => r.cycle === cycleNum);
                    return (
                      <div key={cycleNum} className="flex flex-col min-h-0 border-r last:border-r-0 border-brown/5 pr-3 last:pr-0">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold bg-brown text-cream px-3 py-1 rounded inline-block self-start">
                            {cycleNum === 1 ? '1部 (18:00 - 20:30)' : '2部 (21:00 - 閉店)'}
                          </h3>
                          <div className="flex gap-1 overflow-x-auto max-w-[200px] scrollbar-none pb-1">
                            {PHYSICAL_TABLES.filter(tName =>
                              !tableAssignments.some(a => {
                                if (!a.reservation_id) return false;
                                const res = reservations.find(r => r.id === a.reservation_id);
                                return res?.cycle === cycleNum && assignmentMatchesBlock(a.table_name, tName);
                              })
                            ).map(tName => (
                              <button
                                key={tName}
                                onClick={() => setIsAddingRes({ tableName: tName, cycle: cycleNum })}
                                className="text-[8px] bg-brown/5 hover:bg-brown/10 w-6 h-6 rounded flex items-center justify-center font-bold"
                              >
                                T{tName}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-none">
                          {cycleReservations.length > 0 ? (
                            cycleReservations.map(res => {
                              const asg = tableAssignments.find(a => a.reservation_id === res.id);
                              return (
                                <button
                                  key={res.id}
                                  onClick={() => setSelectedRes(res)}
                                  className="w-full flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-brown/5 hover:border-brown/20 transition-all shrink-0 text-left"
                                >
                                  <div className="w-10 h-10 bg-cream rounded flex items-center justify-center font-bold text-base shrink-0 flex-col leading-tight">
                                    <span className="text-[10px] opacity-40">T{asg?.table_name ?? '?'}</span>
                                    <span className="text-xs">{res.arrival_time}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={cn("font-bold text-sm truncate", res.status === 'seated' && "line-through opacity-40")}>
                                      {res.name}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] opacity-60 font-bold">
                                      <span className="flex items-center gap-1 shrink-0"><Users className="w-3 h-3" /> {res.party_size}名</span>
                                      <span className="truncate">
                                        {res.status === 'seated' ? '着席済' : res.status === 'confirmed' ? '確認済' : '確認待ち'}
                                      </span>
                                    </div>
                                  </div>
                                  {res.notes && (
                                    <div className="px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-bold rounded-full border border-red-100 max-w-[80px] truncate shrink-0">
                                      {res.notes}
                                    </div>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="text-xs italic opacity-40 py-2">予約なし</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Drag-to-resize handle — always visible */}
                <div
                  className="shrink-0 h-5 flex items-center gap-2 px-1 cursor-row-resize group border-t border-brown/10 hover:border-brown/30 select-none mt-3"
                  onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
                  onPointerMove={(e) => {
                    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                    setCancelledHeight(h => Math.max(0, Math.min(320, h - e.movementY)));
                  }}
                >
                  <GripHorizontal className="w-3 h-3 opacity-20 group-hover:opacity-50 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 group-hover:opacity-60">
                    キャンセル（本日）
                  </span>
                  {cancelledForDate.length > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                      {cancelledForDate.length}
                    </span>
                  )}
                </div>

                {/* Cancelled content — height controlled by drag */}
                <div className="shrink-0 overflow-hidden" style={{ height: cancelledHeight }}>
                  {cancelledForDate.length === 0 ? (
                    <p className="text-xs italic opacity-40 pt-2 pb-3">本日のキャンセルはありません</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto scrollbar-none pt-1 pb-3">
                      {cancelledForDate.map(res => {
                        const late = isLateCancel(res);
                        const cancelTime = res.cancelled_at
                          ? format(new Date(res.cancelled_at), 'M/d HH:mm')
                          : null;
                        return (
                          <button
                            key={res.id}
                            onClick={() => { setChargeRes(res); setChargeError(null); }}
                            className="shrink-0 w-52 bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col gap-1.5 text-left hover:border-red-300 hover:shadow-sm transition-all active:scale-95"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-sm truncate">{res.name}</p>
                              <span className="shrink-0 text-[10px] bg-white text-red-600 font-bold px-1.5 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" />{res.party_size}名
                              </span>
                            </div>
                            <p className="text-[10px] font-mono opacity-60">{res.arrival_time} · {res.cycle === 1 ? '1部' : '2部'}</p>
                            <p className="text-[10px] opacity-60">キャンセル日時: {cancelTime ?? '—'}</p>
                            {res.cancelled_at && (
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full self-start",
                                late ? "bg-red-200 text-red-700" : "bg-gray-100 text-gray-500"
                              )}>
                                {late ? '24時間以内' : '早期キャンセル'}
                              </span>
                            )}
                            {res.charged_at ? (
                              <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full self-start">
                                ✓ 請求済み ¥{(res.charge_amount_yen ?? 0).toLocaleString()}
                              </span>
                            ) : res.square_card_id ? (
                              <span className="text-[10px] font-bold text-blue-600 opacity-70 self-start">カードあり →</span>
                            ) : (
                              <span className="text-[10px] opacity-40 self-start">カードなし</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="bg-white border-t border-brown/5 px-8 py-2 flex items-center justify-between text-xs font-mono tracking-widest shrink-0">
        <div className="flex gap-8 font-bold">
          <span>合計人数: {totalGuests}名</span>
          <span>1部: {cycle1Guests}名</span>
          <span>2部: {cycle2Guests}名</span>
        </div>
        <div className="opacity-40">
          Karabina Operations Center v1.1
        </div>
      </footer>
    </motion.div>
  );
}

function TableBlock({
  tableName,
  reservations,
  assignments,
  onResClick,
  onEmptyClick,
  onLockToggle,
  className,
  cycleIsCombined,
}: {
  tableName: string;
  reservations: Reservation[];
  assignments: TableAssignment[];
  onResClick: (res: Reservation) => void;
  onEmptyClick: (cycle: 1 | 2, tableName?: string) => void;
  onLockToggle: (resId: string) => void;
  className: string;
  cycleIsCombined?: { 1: boolean; 2: boolean };
}) {
  const getResForCycle = (cycle: 1 | 2) => {
    for (const asg of assignments) {
      if (!asg.reservation_id) continue;
      if (!assignmentMatchesBlock(asg.table_name, tableName)) continue;
      const res = reservations.find(r => r.id === asg.reservation_id);
      if (res?.cycle === cycle) return { res, asg };
    }
    return null;
  };

  const getResForHalf = (half: '1A' | '1B', cycle: 1 | 2) => {
    for (const asg of assignments) {
      if (!asg.reservation_id) continue;
      if (asg.table_name !== half) continue;
      const res = reservations.find(r => r.id === asg.reservation_id);
      if (res?.cycle === cycle) return { res, asg };
    }
    return null;
  };

  const getResForPart = (partName: string, cycle: 1 | 2) => {
    for (const asg of assignments) {
      if (!asg.reservation_id) continue;
      if (asg.table_name !== partName) continue;
      const res = reservations.find(r => r.id === asg.reservation_id);
      if (res?.cycle === cycle) return { res, asg };
    }
    return null;
  };

  const isCycleSplit = (cycle: 1 | 2) =>
    tableName === '1' &&
    assignments.some(asg => {
      if (!asg.reservation_id) return false;
      if (asg.table_name !== '1A' && asg.table_name !== '1B') return false;
      const res = reservations.find(r => r.id === asg.reservation_id);
      return res?.cycle === cycle;
    });

  const parts = tableName.split('+');
  const isCombinedBlock = parts.length > 1;
  const cycle1UsesCombined = isCombinedBlock ? (cycleIsCombined?.[1] ?? true) : true;
  const cycle2UsesCombined = isCombinedBlock ? (cycleIsCombined?.[2] ?? true) : true;

  const cycle1Split = isCycleSplit(1);
  const cycle2Split = isCycleSplit(2);

  const first  = (cycle1Split || !cycle1UsesCombined) ? null : getResForCycle(1);
  const second = (cycle2Split || !cycle2UsesCombined) ? null : getResForCycle(2);

  const hasStaffReview =
    first?.asg.requires_staff_review ||
    second?.asg.requires_staff_review ||
    (['1A', '1B'] as const).some(h =>
      [1, 2].some(c => getResForHalf(h, c as 1 | 2)?.asg.requires_staff_review)
    );

  const LockIcon = ({ res }: { res: Reservation }) => (
    <div
      onClick={(e) => { e.stopPropagation(); onLockToggle(res.id); }}
      className="absolute bottom-1 left-1 z-10 cursor-pointer"
      title={res.locked ? 'ロック解除' : 'テーブルをロック'}
    >
      {res.locked
        ? <Lock className="w-4 h-4 text-amber-500 drop-shadow-sm" />
        : <LockOpen className="w-4 h-4 text-brown/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      }
    </div>
  );

  const renderConstituentSplit = (splitParts: string[], cycle: 1 | 2, hasBorderBottom: boolean) => (
    <div className={cn("flex-1 flex relative min-h-0", hasBorderBottom && "border-b-2 border-black/30")}>
      {splitParts.map((part, i) => {
        const entry = getResForPart(part, cycle);
        const isLast = i === splitParts.length - 1;
        return (
          <button
            key={part}
            onClick={() => entry ? onResClick(entry.res) : onEmptyClick(cycle, part)}
            className={cn(
              "group flex-1 flex flex-col items-center justify-center relative min-h-0 transition-all text-brown py-0.5",
              !isLast && "border-r-2 border-black/30",
              entry?.res.status === 'seated' ? "bg-black/10" : "hover:bg-white/10"
            )}
          >
            <div className="text-[8px] font-bold opacity-40 leading-none mb-0.5">{part}</div>
            {entry ? (
              <div className={cn("text-center overflow-hidden transition-all w-full px-0.5", entry.res.status === 'seated' && "opacity-50")}>
                <div className="font-bold text-[9px] opacity-60 leading-none mb-0.5">{entry.res.arrival_time}</div>
                <div className={cn("font-bold text-[10px] truncate max-w-full", entry.res.status === 'seated' && "line-through")}>
                  {entry.res.name}
                </div>
                <div className="flex items-center justify-center gap-0.5 text-[9px] opacity-90 font-bold">
                  <Users className="w-2.5 h-2.5" /> {entry.res.party_size}
                  {entry.res.status === 'seated' && <span className="w-1.5 h-1.5 rounded-full bg-green-600 ml-0.5" />}
                  {entry.asg.requires_staff_review && <AlertCircle className="w-2.5 h-2.5 text-orange-500" />}
                </div>
                <LockIcon res={entry.res} />
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-20 group-hover:opacity-60 transition-opacity">
                <Plus className="w-3 h-3" />
              </div>
            )}
          </button>
        );
      })}
      <div className={cn("absolute right-0 text-[8px] opacity-30 font-bold uppercase p-1", hasBorderBottom ? "top-0" : "bottom-0")}>
        {cycle}部
      </div>
    </div>
  );

  const renderHalf = (half: '1A' | '1B', cycle: 1 | 2, isLast: boolean) => {
    const entry = getResForHalf(half, cycle);
    return (
      <button
        key={half}
        onClick={() => entry ? onResClick(entry.res) : onEmptyClick(cycle, half)}
        className={cn(
          "group flex-1 flex flex-col items-center justify-center relative min-h-0 transition-all text-brown py-0.5",
          !isLast && "border-r-2 border-black/30",
          entry?.res.status === 'seated' ? "bg-black/10" : "hover:bg-white/10"
        )}
      >
        <div className="text-[8px] font-bold opacity-40 leading-none mb-0.5">{half}</div>
        {entry ? (
          <div className={cn("text-center overflow-hidden transition-all w-full px-0.5", entry.res.status === 'seated' && "opacity-50")}>
            <div className="font-bold text-[9px] opacity-60 leading-none mb-0.5">{entry.res.arrival_time}</div>
            <div className={cn("font-bold text-[10px] truncate max-w-full", entry.res.status === 'seated' && "line-through")}>
              {entry.res.name}
            </div>
            <div className="flex items-center justify-center gap-0.5 text-[9px] opacity-90 font-bold">
              <Users className="w-2.5 h-2.5" /> {entry.res.party_size}
              {entry.res.status === 'seated' && <span className="w-1.5 h-1.5 rounded-full bg-green-600 ml-0.5" />}
              {entry.asg.requires_staff_review && <AlertCircle className="w-2.5 h-2.5 text-orange-500" />}
            </div>
            <LockIcon res={entry.res} />
          </div>
        ) : (
          <div className="flex flex-col items-center opacity-20 group-hover:opacity-60 transition-opacity">
            <Plus className="w-3 h-3" />
          </div>
        )}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={cn(
        "rounded-xl shadow-lg border-2 p-2 lg:p-3 flex flex-col relative overflow-hidden transition-colors",
        hasStaffReview ? "border-orange-400 bg-[#4fc3f7]" : "border-brown/10 bg-[#4fc3f7]",
        className
      )}
    >
      {hasStaffReview && (
        <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
          <span className="flex items-center gap-0.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
            <AlertCircle className="w-2.5 h-2.5" />
            要確認
          </span>
        </div>
      )}
      <div className="text-lg lg:text-xl font-bold mb-1 opacity-80 flex justify-between items-center text-brown pointer-events-none">
        <span>{tableName}</span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!cycle1UsesCombined ? renderConstituentSplit(parts, 1, true) : cycle1Split ? (
          <div className="flex-1 border-b-2 border-black/30 flex relative min-h-0">
            {renderHalf('1A', 1, false)}
            {renderHalf('1B', 1, true)}
            <div className="absolute top-0 right-0 text-[8px] opacity-30 font-bold uppercase p-1">1部</div>
          </div>
        ) : (
          <button
            onClick={() => first ? onResClick(first.res) : onEmptyClick(1)}
            className={cn(
              "group flex-1 border-b-2 border-black/30 flex items-center justify-center relative min-h-0 w-full transition-all text-brown",
              first?.res.status === 'seated' ? "bg-black/10" : "hover:bg-white/10"
            )}
          >
            {first ? (
              <div className={cn("text-center overflow-hidden transition-all", first.res.status === 'seated' && "opacity-50")}>
                <div className="font-bold text-[10px] opacity-60 leading-none mb-0.5">{first.res.arrival_time}</div>
                <div className={cn("font-bold text-xs lg:text-sm truncate max-w-full px-1", first.res.status === 'seated' && "line-through")}>
                  {first.res.name}
                </div>
                <div className="flex items-center justify-center gap-1 text-[10px] opacity-90 font-bold">
                  <Users className="w-3 h-3" /> {first.res.party_size}
                  {first.res.status === 'seated' && <span className="w-2 h-2 rounded-full bg-green-600 ml-1" />}
                  {first.asg.requires_staff_review && <AlertCircle className="w-3 h-3 text-orange-500" />}
                </div>
                <LockIcon res={first.res} />
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-20 group-hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4 mb-0.5" />
                <div className="text-[10px] font-bold italic">予約追加</div>
              </div>
            )}
            <div className="absolute top-0 right-0 text-[8px] opacity-30 font-bold uppercase p-1">1部</div>
          </button>
        )}

        {!cycle2UsesCombined ? renderConstituentSplit(parts, 2, false) : cycle2Split ? (
          <div className="flex-1 flex relative min-h-0">
            {renderHalf('1A', 2, false)}
            {renderHalf('1B', 2, true)}
            <div className="absolute bottom-0 right-0 text-[8px] opacity-30 font-bold uppercase p-1">2部</div>
          </div>
        ) : (
          <button
            onClick={() => second ? onResClick(second.res) : onEmptyClick(2)}
            className={cn(
              "group flex-1 flex items-center justify-center relative min-h-0 w-full transition-all text-brown",
              second?.res.status === 'seated' ? "bg-black/10" : "hover:bg-white/10"
            )}
          >
            {second ? (
              <div className={cn("text-center pt-1 overflow-hidden transition-all", second.res.status === 'seated' && "opacity-50")}>
                <div className="font-bold text-[10px] opacity-60 leading-none mb-0.5">{second.res.arrival_time}</div>
                <div className={cn("font-bold text-xs lg:text-sm truncate max-w-full px-1", second.res.status === 'seated' && "line-through")}>
                  {second.res.name}
                </div>
                <div className="flex items-center justify-center gap-1 text-[10px] opacity-90 font-bold">
                  <Users className="w-3 h-3" /> {second.res.party_size}
                  {second.asg.requires_staff_review && <AlertCircle className="w-3 h-3 text-red-700" />}
                  {second.res.status === 'seated' && <span className="w-2 h-2 rounded-full bg-green-600 ml-1" />}
                </div>
                <LockIcon res={second.res} />
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-20 group-hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4 mb-0.5" />
                <div className="text-[10px] font-bold italic">予約追加</div>
              </div>
            )}
            <div className="absolute bottom-0 right-0 text-[8px] opacity-30 font-bold uppercase p-1">2部</div>
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
