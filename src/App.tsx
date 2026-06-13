import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import LandingPage from './pages/LandingPage';
import StaffDashboard from './pages/StaffDashboard';
import StaffLoginPage from './pages/StaffLoginPage';
import FullMenuPage from './pages/FullMenuPage';
import BookingPage from './pages/BookingPage';
import CancelPage from './pages/CancelPage';
import StoryPage from './pages/StoryPage';
import ProtectedRoute from './components/ProtectedRoute';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  const location = useLocation();

  return (
    <LanguageProvider>
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/menu" element={<FullMenuPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/staff/login" element={<StaffLoginPage />} />
            <Route path="/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
            <Route path="/cancel/:token" element={<CancelPage />} />
            <Route path="/story" element={<StoryPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </LanguageProvider>
  );
}
