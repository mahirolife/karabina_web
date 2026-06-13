import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, AlertCircle, Calendar, Clock, Users, X } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { supabase } from '../lib/supabase';

type PageState = 'loading' | 'found' | 'already-cancelled' | 'not-found' | 'cancelled' | 'error';

interface ReservationInfo {
  id: string;
  name: string;
  email: string;
  date: string;
  arrival_time: string;
  party_size: number;
  status: string;
}

export default function CancelPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) { setPageState('not-found'); return; }

    supabase
      .from('reservations')
      .select('id, name, email, date, arrival_time, party_size, status')
      .eq('cancellation_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setPageState('not-found'); return; }
        setReservation(data as ReservationInfo);
        setPageState(data.status === 'cancelled' ? 'already-cancelled' : 'found');
      });
  }, [token]);

  const handleCancel = async () => {
    if (!reservation) return;
    setIsCancelling(true);
    try {
      const { error: resError } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);
      if (resError) throw resError;

      // Delete the assignment so the table slot re-opens
      const { error: asgError } = await supabase
        .from('table_assignments')
        .delete()
        .eq('reservation_id', reservation.id);
      if (asgError) throw asgError;

      setPageState('cancelled');
    } catch {
      setPageState('error');
    } finally {
      setIsCancelling(false);
      setShowConfirm(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-brown text-cream flex flex-col">
      <Nav />
      <main className="flex-grow flex items-center justify-center p-6 pt-40 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-brown/50 p-8 md:p-12 rounded-[2rem] shadow-xl border-2 border-cream/10 backdrop-blur-md space-y-8"
        >
          {children}
        </motion.div>
      </main>
      <Footer />
    </div>
  );

  if (pageState === 'loading') {
    return shell(
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
      </div>
    );
  }

  if (pageState === 'not-found') {
    return shell(
      <>
        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
          <X className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Link not found</h1>
          <p className="opacity-60 text-sm">This cancellation link is invalid or has expired.</p>
          <p className="opacity-40 text-xs">このリンクは無効か期限切れです。</p>
        </div>
        <Link to="/" className="block text-center px-8 py-4 bg-cream text-brown rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform text-sm">
          Back to Home
        </Link>
      </>
    );
  }

  if (pageState === 'already-cancelled') {
    return shell(
      <>
        <div className="w-16 h-16 bg-orange/10 text-orange rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Already cancelled</h1>
          <p className="opacity-60 text-sm">This reservation has already been cancelled.</p>
          <p className="opacity-40 text-xs">この予約はすでにキャンセルされています。</p>
        </div>
        <Link to="/" className="block text-center px-8 py-4 bg-cream text-brown rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform text-sm">
          Back to Home
        </Link>
      </>
    );
  }

  if (pageState === 'cancelled') {
    return shell(
      <>
        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Reservation cancelled</h1>
          <p className="opacity-60 text-sm">Your reservation has been successfully cancelled.</p>
          <p className="opacity-40 text-xs">ご予約をキャンセルしました。</p>
        </div>
        <Link to="/" className="block text-center px-8 py-4 bg-cream text-brown rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform text-sm">
          Back to Home
        </Link>
      </>
    );
  }

  if (pageState === 'error') {
    return shell(
      <>
        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="opacity-60 text-sm">We couldn't cancel your reservation. Please call us at 0136-50-2850.</p>
          <p className="opacity-40 text-xs">キャンセルに失敗しました。お電話にてご連絡ください。</p>
        </div>
        <Link to="/" className="block text-center px-8 py-4 bg-cream text-brown rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform text-sm">
          Back to Home
        </Link>
      </>
    );
  }

  // pageState === 'found'
  return shell(
    <>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest opacity-40">Cancellation Request · キャンセル</p>
        <h1 className="text-2xl font-bold">Cancel your reservation?</h1>
        <p className="text-sm opacity-60">予約をキャンセルしますか？</p>
      </div>

      <div className="bg-white/5 border border-cream/10 rounded-2xl p-6 space-y-4">
        <p className="text-xs uppercase tracking-widest opacity-40 border-b border-cream/10 pb-3">Reservation details</p>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 opacity-40 shrink-0" />
          <span className="opacity-80">{reservation!.date}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Clock className="w-4 h-4 opacity-40 shrink-0" />
          <span className="opacity-80">{reservation!.arrival_time}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Users className="w-4 h-4 opacity-40 shrink-0" />
          <span className="opacity-80">{reservation!.party_size} {reservation!.party_size === 1 ? 'guest' : 'guests'}</span>
        </div>
      </div>

      <div className="bg-orange/10 border border-orange/20 rounded-xl p-4">
        <p className="text-xs text-orange leading-relaxed">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          Cancellations within 24 hours of your reservation will incur a fee of ¥3,000 per person. Guests not arriving within 30 minutes of their reservation time will also be charged.
          <br /><span className="opacity-70">前日24時間以内のキャンセルはお一人様¥3,000のキャンセル料が発生します。また、予約時間から30分以内にご来店がない場合も同様に請求されます。</span>
        </p>
      </div>

      {!showConfirm ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-4 bg-red-500/80 text-white rounded-full font-bold uppercase tracking-widest hover:bg-red-500 hover:scale-[1.02] transition-all text-sm"
          >
            Cancel reservation
          </button>
          <Link to="/" className="block text-center py-4 border-2 border-cream/10 rounded-full font-bold uppercase tracking-widest hover:bg-cream/5 transition-colors text-sm">
            Keep my reservation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-center opacity-60">Are you sure? This cannot be undone. / この操作は取り消せません。</p>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-4 bg-red-500 text-white rounded-full font-bold uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 text-sm"
          >
            {isCancelling ? 'Cancelling...' : 'Yes, cancel it'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="w-full py-4 border-2 border-cream/10 rounded-full font-bold uppercase tracking-widest hover:bg-cream/5 transition-colors text-sm"
          >
            Go back
          </button>
        </div>
      )}
    </>
  );
}
