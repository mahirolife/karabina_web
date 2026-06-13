import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError('メールアドレスまたはパスワードが違います。');
    } else {
      navigate('/staff', { replace: true });
    }
  };

  return (
    <div className="h-screen bg-[#f8f5f2] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-10"
      >
        <h1 className="text-2xl font-bold tracking-tighter uppercase text-brown mb-1">Karabina</h1>
        <p className="text-xs text-brown/40 font-bold uppercase tracking-widest mb-8">Staff Access</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-brown/40 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#f8f5f2] px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-brown/40 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#f8f5f2] px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown/20"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-red-500 bg-red-50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brown text-cream rounded-xl font-bold text-sm uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50 mt-2"
          >
            {loading ? '...' : 'ログイン'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
