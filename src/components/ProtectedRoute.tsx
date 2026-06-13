import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="h-screen bg-[#f8f5f2] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brown/30 border-t-brown rounded-full animate-spin" />
      </div>
    );
  }

  return authenticated ? <>{children}</> : <Navigate to="/staff/login" replace />;
}
