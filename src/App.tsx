import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';

const LandingPage    = lazy(() => import('./pages/LandingPage'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage'));
const FullMenuPage   = lazy(() => import('./pages/FullMenuPage'));
const BookingPage    = lazy(() => import('./pages/BookingPage'));
const CancelPage     = lazy(() => import('./pages/CancelPage'));
const StoryPage      = lazy(() => import('./pages/StoryPage'));

export default function App() {
  const location = useLocation();

  return (
    <LanguageProvider>
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <Suspense fallback={null}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/menu" element={<FullMenuPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/staff/login" element={<StaffLoginPage />} />
              <Route path="/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
              <Route path="/cancel/:token" element={<CancelPage />} />
              <Route path="/story" element={<StoryPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </LanguageProvider>
  );
}
