import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Phone, Users, Calendar, Clock, MessageSquare, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import SquarePaymentForm, { SquarePaymentFormHandle } from '../components/booking/SquarePaymentForm';
import DatePicker from '../components/DatePicker';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { buildTableGraph, physicalTables } from '../lib/tableGraph';
import { assignCycle } from '../lib/assignTables';
import type { Reservation, TableGraph, TableAssignment } from '../lib/types';

const SQUARE_APP_ID = (import.meta as any).env.VITE_SQUARE_APPLICATION_ID ?? '';
const SQUARE_LOCATION_ID = (import.meta as any).env.VITE_SQUARE_LOCATION_ID ?? '';
const DEV_MODE = false;

type Step = 'details' | 'summary' | 'success';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MAX_BOOKING_DATE = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const DEFAULT_SLOT_AVAILABILITY = { '18:00': true, '20:00': true, '20:30': true, '21:00': true };
const CYCLE_1_TIMES = ['18:00'] as const;
const CYCLE_2_TIMES = ['20:00', '20:30', '21:00'] as const;
const ALL_SLOTS: Array<{ time: string; cycle: 1 | 2 }> = [
  ...CYCLE_1_TIMES.map(time => ({ time, cycle: 1 as const })),
  ...CYCLE_2_TIMES.map(time => ({ time, cycle: 2 as const })),
];

export default function BookingPage() {
  const { tEn, tJp } = useLanguage();
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    partySize: '2',
    date: localToday(),
    cycle: '',
    time: '',
    specialRequests: '',
    policyAgreed: false,
  });

  const [slotAvailability, setSlotAvailability] = useState<Record<string, boolean>>(DEFAULT_SLOT_AVAILABILITY);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [showLargeGroupMessage, setShowLargeGroupMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(DEV_MODE);
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<TableGraph | null>(null);
  const [isDateClosed, setIsDateClosed] = useState(false);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const paymentFormRef = React.useRef<SquarePaymentFormHandle>(null);

  useEffect(() => {
    supabase
      .from('closed_dates')
      .select('date')
      .gte('date', localToday())
      .lte('date', MAX_BOOKING_DATE)
      .then(({ data }) => {
        if (data) setClosedDates(data.map((r: { date: string }) => r.date));
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    setIsDateClosed(false);

    if (!formData.date || !formData.partySize) {
      setSlotAvailability(DEFAULT_SLOT_AVAILABILITY);
      return;
    }

    const checkAvailability = async () => {
      setIsCheckingAvailability(true);
      try {
        const [reservationsRes, tablesRes, combinationsRes, settingsRes, closedDateRes, assignmentsRes] = await Promise.all([
          supabase.from('reservations').select('*').eq('date', formData.date).neq('status', 'cancelled'),
          supabase.from('tables').select('*'),
          supabase.from('table_combinations').select('*'),
          supabase.from('restaurant_settings').select('party_of_one_enabled').single(),
          supabase.from('closed_dates').select('date').eq('date', formData.date).maybeSingle(),
          supabase.from('table_assignments').select('*').eq('date', formData.date),
        ]);

        if (cancelled) return;

        if (closedDateRes.data) {
          setIsDateClosed(true);
          setSlotAvailability({ '18:00': false, '20:00': false, '20:30': false, '21:00': false });
          return;
        }

        const existingReservations: Reservation[] = reservationsRes.data ?? [];
        const allAssignments: TableAssignment[] = assignmentsRes.data ?? [];
        const builtGraph = buildTableGraph(tablesRes.data ?? [], combinationsRes.data ?? []);
        setGraph(builtGraph);
        const partyOfOneEnabled = settingsRes.data?.party_of_one_enabled ?? false;
        const partySize = parseInt(formData.partySize);

        const newAvailability: Record<string, boolean> = {};

        if ((partySize === 1 && !partyOfOneEnabled) || partySize >= 19) {
          for (const slot of ALL_SLOTS) {
            newAvailability[slot.time] = false;
          }
        } else {
          // Run assignCycle once per cycle — arrival_time is irrelevant to assignment.
          const cycleAvailability = new Map<1 | 2, boolean>();
          for (const cycleNum of [1, 2] as const) {
            const cycleRsvs = existingReservations.filter(r => r.cycle === cycleNum);
            const lockedIds = new Set(
              cycleRsvs.filter(r => r.status === 'seated' || r.locked === true).map(r => r.id)
            );
            const unlockedRsvs = cycleRsvs.filter(r => !lockedIds.has(r.id));
            const preOccupied = new Set(
              allAssignments
                .filter(a => a.cycle === cycleNum && lockedIds.has(a.reservation_id!))
                .flatMap(a => physicalTables(a.table_name))
            );
            const testRes: Reservation = {
              id: 'availability-check', created_at: new Date().toISOString(),
              name: '', email: '', phone: '',
              party_size: partySize, date: formData.date, cycle: cycleNum,
              arrival_time: '', status: 'pending', notes: null,
              shared_table: false, shared_table_consent: false, square_card_token: null,
            };
            const baseline = assignCycle(unlockedRsvs, builtGraph, preOccupied);
            const baselineUnassignedIds = new Set(baseline.unassigned.map(r => r.id));
            const withNew = assignCycle([...unlockedRsvs, testRes], builtGraph, preOccupied);
            cycleAvailability.set(cycleNum,
              !withNew.unassigned.some(r => r.id === 'availability-check') &&
              !withNew.unassigned.some(r => r.id !== 'availability-check' && !baselineUnassignedIds.has(r.id))
            );
          }

          for (const slot of ALL_SLOTS) {
            newAvailability[slot.time] = cycleAvailability.get(slot.cycle)!;
          }
        }

        setSlotAvailability(newAvailability);
      } catch (err) {
        console.error('Availability check failed', err);
        if (!cancelled) {
          setSlotAvailability(DEFAULT_SLOT_AVAILABILITY);
        }
      } finally {
        if (!cancelled) setIsCheckingAvailability(false);
      }
    };

    checkAvailability();
    return () => { cancelled = true; };
  }, [formData.date, formData.partySize]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'date' || name === 'partySize') {
      setFormData(prev => ({ ...prev, [name]: value, time: '', cycle: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (name === 'partySize') {
      setShowLargeGroupMessage(parseInt(value) >= 19);
    }
  };

  const handleTimeClick = (time: string, cycle: '1' | '2') => {
    setFormData(prev => ({ ...prev, time, cycle }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.policyAgreed) {
      if (DEV_MODE) {
        setPaymentToken('dev-token-bypass');
      } else if (paymentFormRef.current) {
        const token = await paymentFormRef.current.tokenize();
        if (!token) return;
        setPaymentToken(token);
      }
    }

    setStep('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const doInsert = async (reservationRow: {
    name: string; email: string; phone: string; party_size: number;
    date: string; cycle: 1 | 2; arrival_time: string;
    status: 'pending'; notes: string | null;
    shared_table: boolean; shared_table_consent: boolean;
    square_card_token: string | null; cancellation_token: string;
  }) => {
    const cleanedRow = reservationRow.square_card_token === 'dev-token-bypass'
      ? { ...reservationRow, square_card_token: null }
      : reservationRow;

    let cardOnFile: { square_customer_id: string; square_card_id: string } | null = null;
    if (cleanedRow.square_card_token) {
      try {
        const cardRes = await fetch('/api/square/save-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nonce: cleanedRow.square_card_token,
            name: cleanedRow.name,
            email: cleanedRow.email,
          }),
        });
        if (cardRes.ok) cardOnFile = await cardRes.json();
      } catch { /* non-blocking — booking proceeds even if card save fails */ }
    }

    const rowToInsert = cardOnFile ? { ...cleanedRow, ...cardOnFile } : cleanedRow;

    const { data: resData, error: resError } = await supabase
      .from('reservations')
      .insert([rowToInsert])
      .select('id')
      .single();

    if (resError) throw resError;

    // Fire confirmation email — non-blocking, booking succeeds regardless
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: resData.id, site_url: window.location.origin }),
    }).catch(err => console.error('Confirmation email failed:', err));

    setStep('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmReservation = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const cycleNum = parseInt(formData.cycle) as 1 | 2;
      const partySize = parseInt(formData.partySize);

      // Always re-fetch reservations and settings (need fresh data at confirm time).
      // Reuse graph from the availability check — tables/combos never change per session.
      const [reservationsRes, settingsRes, assignmentsRes] = await Promise.all([
        supabase.from('reservations').select('*').eq('date', formData.date).neq('status', 'cancelled'),
        supabase.from('restaurant_settings').select('party_of_one_enabled').single(),
        supabase.from('table_assignments').select('*').eq('date', formData.date),
      ]);

      if (reservationsRes.error) throw reservationsRes.error;

      let resolvedGraph = graph;
      if (!resolvedGraph) {
        const [tablesRes, combinationsRes] = await Promise.all([
          supabase.from('tables').select('*'),
          supabase.from('table_combinations').select('*'),
        ]);
        if (tablesRes.error) throw tablesRes.error;
        if (combinationsRes.error) throw combinationsRes.error;
        resolvedGraph = buildTableGraph(tablesRes.data ?? [], combinationsRes.data ?? []);
      }

      const existingReservations: Reservation[] = reservationsRes.data ?? [];
      const allAssignments: TableAssignment[] = assignmentsRes.data ?? [];
      const partyOfOneEnabled = settingsRes.data?.party_of_one_enabled ?? false;

      const newReservation: Reservation = {
        id: 'capacity-check',
        created_at: new Date().toISOString(),
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        party_size: partySize,
        date: formData.date,
        cycle: cycleNum,
        arrival_time: formData.time,
        status: 'pending',
        notes: formData.specialRequests || null,
        shared_table: false,
        shared_table_consent: false,
        square_card_token: paymentToken,
      };

      if (formData.date > MAX_BOOKING_DATE) {
        setError('Reservations cannot be made more than 3 months in advance. / 3ヶ月以上先のご予約はお受けできません。');
        return;
      }
      const selectedMonth = new Date(formData.date).getMonth();
      if (selectedMonth >= 3 && selectedMonth <= 10) {
        setError('Karabina is only open December through March. / カラビナは12月〜3月のみ営業しています。');
        return;
      }
      if (partySize === 1 && !partyOfOneEnabled) {
        setError('Single-guest reservations are not currently available online. Please call us to book.');
        return;
      }
      if (partySize >= 19) {
        setError('For parties of 19 or more, please call us directly at 0136-50-2850.');
        return;
      }

      const cycleReservations = existingReservations.filter(r => r.cycle === cycleNum);
      const lockedIds = new Set(
        cycleReservations.filter(r => r.status === 'seated' || r.locked === true).map(r => r.id)
      );
      const unlockedReservations = cycleReservations.filter(r => !lockedIds.has(r.id));
      const preOccupied = new Set(
        allAssignments
          .filter(a => a.cycle === cycleNum && lockedIds.has(a.reservation_id!))
          .flatMap(a => physicalTables(a.table_name))
      );
      const baseline = assignCycle(unlockedReservations, resolvedGraph, preOccupied);
      const baselineUnassignedIds = new Set(baseline.unassigned.map(r => r.id));
      const capacityCheck = assignCycle([...unlockedReservations, newReservation], resolvedGraph, preOccupied);
      const rejected =
        capacityCheck.unassigned.some(r => r.id === 'capacity-check') ||
        capacityCheck.unassigned.some(r => r.id !== 'capacity-check' && !baselineUnassignedIds.has(r.id));

      if (rejected) {
        if (cycleNum === 1) {
          const cycle2Rsvs = existingReservations.filter(r => r.cycle === 2);
          const cycle2LockedIds = new Set(
            cycle2Rsvs.filter(r => r.status === 'seated' || r.locked === true).map(r => r.id)
          );
          const cycle2Unlocked = cycle2Rsvs.filter(r => !cycle2LockedIds.has(r.id));
          const cycle2PreOccupied = new Set(
            allAssignments
              .filter(a => a.cycle === 2 && cycle2LockedIds.has(a.reservation_id!))
              .flatMap(a => physicalTables(a.table_name))
          );
          const c2Baseline = assignCycle(cycle2Unlocked, resolvedGraph, cycle2PreOccupied);
          const c2BaselineIds = new Set(c2Baseline.unassigned.map(r => r.id));
          const cycle2Check = assignCycle([...cycle2Unlocked, { ...newReservation, cycle: 2 }], resolvedGraph, cycle2PreOccupied);
          const c2Accepted =
            !cycle2Check.unassigned.some(r => r.id === 'capacity-check') &&
            !cycle2Check.unassigned.some(r => r.id !== 'capacity-check' && !c2BaselineIds.has(r.id));
          if (c2Accepted) {
            setError('Cycle 1 is fully booked for that date. Cycle 2 still has availability — would you like to switch?');
            return;
          }
        }
        setError('No seating is available for your party size on that date.');
        return;
      }

      await doInsert({
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        party_size: partySize,
        date: formData.date,
        cycle: cycleNum,
        arrival_time: formData.time,
        status: 'pending' as const,
        notes: formData.specialRequests || null,
        shared_table: false,
        shared_table_consent: false,
        square_card_token: paymentToken,
        cancellation_token: crypto.randomUUID(),
      });
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.fullName.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.date !== '' &&
    formData.time !== '' &&
    formData.policyAgreed;

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-brown text-cream flex flex-col">
        <Nav />
        <main className="flex-grow flex items-center justify-center p-6 pt-40 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full bg-brown/50 p-8 md:p-12 rounded-[2rem] shadow-xl text-center space-y-8 border-2 border-cream/10 backdrop-blur-md"
          >
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">
                {tEn('booking.success.title')}
                <span className="block text-xl opacity-60 mt-1 tracking-normal font-medium">{tJp('booking.success.title')}</span>
              </h1>
              <div className="text-lg opacity-80 space-y-0.5">
                <p>{tEn('booking.success.message')}</p>
                <p className="text-base opacity-80">{tJp('booking.success.message')}</p>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-xl text-left space-y-3 border border-cream/10">
              <h3 className="font-bold border-b border-cream/10 pb-2 mb-2 text-xs uppercase tracking-widest opacity-40">
                {tEn('booking.success.summary')} / {tJp('booking.success.summary')}
              </h3>
              <p className="flex justify-between">
                <span className="flex flex-col gap-0">
                  <span>{tEn('booking.success.name')}</span>
                  <span className="text-xs opacity-60">{tJp('booking.success.name')}</span>
                </span>
                <strong>{formData.fullName}</strong>
              </p>
              <p className="flex justify-between">
                <span className="flex flex-col gap-0">
                  <span>{tEn('booking.success.date')}</span>
                  <span className="text-xs opacity-60">{tJp('booking.success.date')}</span>
                </span>
                <strong>{formData.date}</strong>
              </p>
              <p className="flex justify-between">
                <span className="flex flex-col gap-0">
                  <span>{tEn('booking.success.time')}</span>
                  <span className="text-xs opacity-60">{tJp('booking.success.time')}</span>
                </span>
                <strong>{formData.time || formData.cycle}</strong>
              </p>
              <p className="flex justify-between">
                <span className="flex flex-col gap-0">
                  <span>{tEn('booking.success.guests')}</span>
                  <span className="text-xs opacity-60">{tJp('booking.success.guests')}</span>
                </span>
                <strong>{formData.partySize}</strong>
              </p>
            </div>

            <div className="text-sm text-orange font-medium max-w-sm mx-auto space-y-0.5">
              <p>{tEn('booking.success.note')}</p>
              <p className="opacity-80">{tJp('booking.success.note')}</p>
            </div>

            <div className="bg-white/5 border border-cream/10 rounded-xl px-6 py-4 text-sm text-center space-y-1">
              <p className="opacity-80">
                {tEn('booking.success.email_sent')} / {tJp('booking.success.email_sent')} <strong>{formData.email}</strong>
              </p>
              <div className="opacity-50 text-xs space-y-0.5">
                <p>{tEn('booking.success.cancel_via_email')}</p>
                <p>{tJp('booking.success.cancel_via_email')}</p>
              </div>
            </div>

            <Link
              to="/"
              className="inline-block px-10 py-4 bg-cream text-brown rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform"
            >
              <span className="flex flex-col items-center gap-0.5 leading-tight">
                <span>{tEn('booking.success.home')}</span>
                <span className="text-xs opacity-80 font-medium normal-case tracking-normal">{tJp('booking.success.home')}</span>
              </span>
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brown text-cream flex flex-col">
      <Nav />

      <main className="flex-grow p-4 md:p-8 pt-32 lg:pt-40 pb-20 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Form Content */}
          <div className="flex-grow w-full space-y-8">
            <header className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase">
                {tEn('booking.title')}
                <span className="block text-2xl md:text-3xl opacity-60 mt-1 tracking-normal normal-case font-bold">{tJp('booking.title')}</span>
              </h1>
            </header>

            {showLargeGroupMessage ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-orange/10 border-2 border-orange p-8 rounded-2xl text-center space-y-6"
              >
                <div className="w-16 h-16 bg-orange/20 text-orange rounded-full flex items-center justify-center mx-auto">
                  <Phone className="w-8 h-8" />
                </div>
                <div className="text-xl font-medium leading-relaxed space-y-1">
                  <p>{tEn('booking.large_group')}</p>
                  <p className="text-base opacity-80">{tJp('booking.large_group')}</p>
                </div>
                <a
                  href="tel:0136502850"
                  className="inline-block px-8 py-3 bg-orange text-white rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Call 0136-50-2850
                </a>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, partySize: '18' }))}
                  className="block w-full text-xs underline opacity-50 pt-4"
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <span>{tEn('booking.change_party')}</span>
                    <span className="opacity-80">{tJp('booking.change_party')}</span>
                  </span>
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-10">
                {/* 1. Basic Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold flex items-start gap-2">
                      <User className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        <span>{tEn('booking.full_name')} *</span>
                        <span className="opacity-70 normal-case tracking-normal font-medium">{tJp('booking.full_name')}</span>
                      </span>
                    </label>
                    <input
                      required
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder={tEn('booking.placeholder.name')}
                      className="w-full bg-white/5 border border-cream/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange/50 text-cream placeholder:text-cream/30 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold flex items-start gap-2">
                      <Mail className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        <span>{tEn('booking.email')} *</span>
                        <span className="opacity-70 normal-case tracking-normal font-medium">{tJp('booking.email')}</span>
                      </span>
                    </label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="karabina@example.com"
                      className="w-full bg-white/5 border border-cream/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange/50 text-cream placeholder:text-cream/30 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold flex items-start gap-2">
                      <Phone className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        <span>{tEn('booking.phone')} *</span>
                        <span className="opacity-70 normal-case tracking-normal font-medium">{tJp('booking.phone')}</span>
                      </span>
                    </label>
                    <input
                      required
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={tEn('booking.placeholder.phone')}
                      className="w-full bg-white/5 border border-cream/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange/50 text-cream placeholder:text-cream/30 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold flex items-start gap-2">
                      <Users className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        <span>{tEn('booking.party_size')} *</span>
                        <span className="opacity-70 normal-case tracking-normal font-medium">{tJp('booking.party_size')}</span>
                      </span>
                    </label>
                    <select
                      required
                      name="partySize"
                      value={formData.partySize}
                      onChange={handleInputChange}
                      className="w-full bg-brown border border-cream/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange/50 text-cream outline-none transition-all appearance-none"
                    >
                      {[...Array(19)].map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-brown text-cream">
                          {i === 18 ? '19+' : `${i + 1} ${tEn(i === 0 ? 'booking.party.person' : 'booking.party.people')} / ${tJp(i === 0 ? 'booking.party.person' : 'booking.party.people')}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Date & Time */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold flex items-start gap-2">
                      <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        <span>{tEn('booking.date')} *</span>
                        <span className="opacity-70 normal-case tracking-normal font-medium">{tJp('booking.date')}</span>
                      </span>
                    </label>
                    <div className="text-xs text-cream/50 space-y-0.5">
                      <p>{tEn('booking.date_limit')}</p>
                      <p className="opacity-75">{tJp('booking.date_limit')}</p>
                    </div>
                    <DatePicker
                      value={formData.date}
                      onChange={(d) => setFormData(prev => ({ ...prev, date: d, cycle: '', time: '' }))}
                      max={MAX_BOOKING_DATE}
                      closedDates={closedDates}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-widest font-bold flex items-start gap-2">
                      <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        <span>{tEn('booking.cycle')} *</span>
                        <span className="opacity-70 normal-case tracking-normal font-medium">{tJp('booking.cycle')}</span>
                      </span>
                    </label>

                    {isCheckingAvailability && (
                      <p className="text-xs opacity-50 animate-pulse">Checking availability…</p>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Cycle 1 */}
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold opacity-40">{tEn('booking.cycle1')} / {tJp('booking.cycle1')}</p>
                        <div className="flex gap-2">
                          {CYCLE_1_TIMES.map(time => {
                            const available = slotAvailability[time] ?? true;
                            return (
                              <div key={time} className="flex-1 flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  disabled={!available || isCheckingAvailability}
                                  onClick={() => handleTimeClick(time, '1')}
                                  className={cn(
                                    "w-full py-3 rounded-xl border-2 transition-all font-bold",
                                    formData.time === time
                                      ? "bg-cream text-brown border-cream"
                                      : !available
                                        ? "bg-white/5 text-cream/20 border-white/5 cursor-not-allowed"
                                        : "bg-transparent border-cream/10 hover:border-orange/50"
                                  )}
                                >
                                  {time}
                                </button>
                                {!available && !isCheckingAvailability && (
                                  <span className="text-[10px] text-orange/70 font-medium">Not available / 満席</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cycle 2 */}
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold opacity-40">{tEn('booking.cycle2')} / {tJp('booking.cycle2')}</p>
                        <div className="flex gap-2">
                          {CYCLE_2_TIMES.map(time => {
                            const available = slotAvailability[time] ?? true;
                            return (
                              <div key={time} className="flex-1 flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  disabled={!available || isCheckingAvailability}
                                  onClick={() => handleTimeClick(time, '2')}
                                  className={cn(
                                    "w-full py-3 rounded-xl border-2 transition-all font-bold",
                                    formData.time === time
                                      ? "bg-cream text-brown border-cream"
                                      : !available
                                        ? "bg-white/5 text-cream/20 border-white/5 cursor-not-allowed"
                                        : "bg-transparent border-cream/10 hover:border-orange/50"
                                  )}
                                >
                                  {time}
                                </button>
                                {!available && !isCheckingAvailability && (
                                  <span className="text-[10px] text-orange/70 font-medium">Not available / 満席</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {!isCheckingAvailability && isDateClosed && (
                      <div className="text-sm text-orange font-medium mt-1 space-y-0.5">
                        <p>This date is closed. Please select another date.</p>
                        <p className="opacity-80">この日は定休日です。別の日程をお選びください。</p>
                      </div>
                    )}
                    {!isCheckingAvailability && !isDateClosed && Object.values(slotAvailability).every(v => !v) && (
                      <div className="text-sm text-orange font-medium mt-1 space-y-0.5">
                        <p>No availability for {formData.partySize} {parseInt(formData.partySize) === 1 ? 'guest' : 'guests'} on this date. Please try another date.</p>
                        <p className="opacity-80">{formData.partySize}名様のご利用可能な席がございません。別の日程をお選びください。</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Special Requests */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-bold flex items-start gap-2">
                    <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="flex flex-col gap-0.5">
                      <span>{tEn('booking.special_requests')}</span>
                      <span className="opacity-70 normal-case tracking-normal font-medium">{tJp('booking.special_requests')}</span>
                    </span>
                  </label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleInputChange}
                    placeholder={tEn('booking.placeholder.requests')}
                    className="w-full bg-white/5 border border-cream/20 rounded-xl px-4 py-3 h-32 focus:ring-2 focus:ring-orange/50 text-cream placeholder:text-cream/30 outline-none transition-all resize-none"
                  />
                </div>

                {/* 4. Cancellation Policy & Payment */}
                <div className="bg-white/5 border border-cream/10 p-6 md:p-8 rounded-[2rem] space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm uppercase tracking-widest font-bold flex items-start gap-2 border-b border-cream/10 pb-2">
                      <AlertCircle className="w-4 h-4 text-orange mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        <span>{tEn('booking.policy.title')}</span>
                        <span className="text-xs normal-case tracking-normal font-medium opacity-75">{tJp('booking.policy.title')}</span>
                      </span>
                    </h3>
                    <div className="space-y-3">
                      <p className="text-sm italic opacity-80 leading-relaxed font-sans">{tEn('booking.policy.en')}</p>
                      <p className="text-sm italic opacity-80 leading-relaxed">{tJp('booking.policy.jp')}</p>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        required
                        checked={formData.policyAgreed}
                        onChange={(e) => setFormData(prev => ({ ...prev, policyAgreed: e.target.checked }))}
                        className="w-4 h-4 rounded border-cream/30 text-orange focus:ring-orange bg-transparent"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium group-hover:text-orange transition-colors">
                        I understand and agree to the cancellation policy.
                      </span>
                      <span className="text-xs font-medium opacity-80 group-hover:text-orange transition-colors">
                        キャンセルポリシーを理解し、同意します。
                      </span>
                    </div>
                  </label>

                  <div className="pt-4 border-t border-cream/10">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm uppercase font-bold tracking-widest opacity-80">{tEn('booking.cc.title')}</p>
                        <p className="text-xs font-medium opacity-60 normal-case tracking-normal mt-0.5">{tJp('booking.cc.title')}</p>
                      </div>
                      {cardReady && !DEV_MODE && (
                        <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold">
                          <Check className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs opacity-70 mb-6 space-y-0.5">
                      <p>{tEn('booking.cc.desc')}</p>
                      <p className="opacity-75">{tJp('booking.cc.desc')}</p>
                    </div>
                    <div className={cn("min-h-[100px] rounded-xl transition-all duration-300", cardReady && !DEV_MODE ? "ring-2 ring-green-400/30" : "")}>
                      {DEV_MODE ? (
                        <div className="w-full rounded-xl border-2 border-dashed border-cream/20 bg-white/5 px-4 py-6 text-center text-sm text-cream/40">
                          開発モード: カード入力をスキップ
                        </div>
                      ) : (
                        <SquarePaymentForm
                          ref={paymentFormRef}
                          applicationId={SQUARE_APP_ID}
                          locationId={SQUARE_LOCATION_ID}
                          onTokenized={(token) => setPaymentToken(token)}
                          onCardReady={setCardReady}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-[11px] opacity-50">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-green-400 opacity-80" />
                      <span>Secured by <strong>Square</strong> · PCI DSS Compliant</span>
                      <span className="opacity-60">· Squareによるセキュア決済</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={cn(
                      "w-full py-5 rounded-full font-bold uppercase tracking-[0.2em] shadow-xl transition-all duration-300",
                      isFormValid
                        ? "bg-orange text-cream hover:bg-orange/90 hover:scale-[1.02] active:scale-95 shadow-orange/20"
                        : "bg-white/5 text-cream/20 cursor-not-allowed border border-cream/10 shadow-none"
                    )}
                  >
                    <span className="flex flex-col items-center gap-0.5 leading-tight">
                      <span>{tEn('booking.confirm')}</span>
                      <span className="text-xs opacity-80 font-medium normal-case tracking-normal">{tJp('booking.confirm')}</span>
                    </span>
                  </button>
                  <div className="text-center text-[10px] uppercase tracking-widest opacity-40 mt-4 space-y-0.5">
                    <p>{tEn('booking.ssl')}</p>
                    <p className="normal-case tracking-normal">{tJp('booking.ssl')}</p>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Summary Overlay */}
      <AnimatePresence>
        {step === 'summary' && (
          <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 bg-brown/95 backdrop-blur-xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl w-full bg-brown p-6 md:p-12 rounded-[2rem] shadow-2xl border-2 border-cream/20 space-y-6 my-4 sm:my-auto"
            >
              <h2 className="text-3xl font-bold tracking-tight border-b border-cream/10 pb-4 uppercase">
                {tEn('booking.summary.title')}
                <span className="block text-lg opacity-60 mt-1 tracking-normal normal-case font-bold">{tJp('booking.summary.title')}</span>
              </h2>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest text-orange">{tEn('booking.summary.client')} / {tJp('booking.summary.client')}</p>
                  <p className="text-xl font-medium">{formData.fullName}</p>
                  <p className="text-sm opacity-60">{formData.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest text-orange">{tEn('booking.summary.schedule')} / {tJp('booking.summary.schedule')}</p>
                  <p className="text-xl font-medium">{formData.date}</p>
                  <p className="text-xl font-medium">{formData.time}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest text-orange">{tEn('booking.summary.party')} / {tJp('booking.summary.party')}</p>
                  <p className="text-xl font-medium">{formData.partySize} {tEn('booking.summary.guests')} / {tJp('booking.summary.guests')}</p>
                </div>
                {formData.specialRequests && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest text-orange">{tEn('booking.summary.requests')} / {tJp('booking.summary.requests')}</p>
                    <p className="text-sm italic opacity-80">"{formData.specialRequests}"</p>
                  </div>
                )}
              </div>

              <div className="bg-orange/10 p-4 rounded-xl border border-orange/20 mt-4">
                <div className="text-xs text-orange font-medium leading-relaxed space-y-1">
                  <p>
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    <strong>{tEn('booking.summary.warning')}:</strong> {tEn('booking.policy.en')}
                  </p>
                  <p className="opacity-80">{tJp('booking.policy.jp')}</p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                  onClick={confirmReservation}
                  disabled={isSubmitting}
                  className="flex-grow py-5 bg-orange text-cream rounded-full font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-orange/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight">
                    <span>{isSubmitting ? tEn('booking.confirming') : tEn('booking.finalize')}</span>
                    <span className="text-xs opacity-80 font-medium normal-case tracking-normal">{isSubmitting ? tJp('booking.confirming') : tJp('booking.finalize')}</span>
                  </span>
                </button>
                <button
                  onClick={() => setStep('details')}
                  disabled={isSubmitting}
                  className="px-8 py-5 border-2 border-cream/10 rounded-full font-bold uppercase tracking-[0.2em] hover:bg-cream/5 transition-colors"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight">
                    <span>{tEn('booking.back')}</span>
                    <span className="text-xs opacity-80 font-medium normal-case tracking-normal">{tJp('booking.back')}</span>
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
