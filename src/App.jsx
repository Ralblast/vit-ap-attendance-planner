import React, { useState } from 'react';
import { Aperture, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import LiveClock from './Components/LiveClock';
import ThemeToggle from './Components/ThemeToggle';
import CourseSelector from './Components/CourseSelector';
import PlannerView from './Components/PlannerView';
import AppFooter from './Components/AppFooter';
import { useAttendancePlanner } from './hooks/useAttendancePlanner';
import { useTheme } from './contexts/ThemeContext';

export default function App() {
  const { theme } = useTheme(); // Get theme from context
  const [selectedSlot, setSelectedSlot] = useState(null);

  const plannerData = useAttendancePlanner(selectedSlot);

  const mainBg =
    theme === 'dark'
      ? { background: 'radial-gradient(circle, rgba(31,41,55,1) 0%, rgba(17,24,39,1) 100%)' }
      : { background: 'radial-gradient(circle, rgba(243,244,246,1) 0%, rgba(229,231,235,1) 100%)' };

  return (
    <div
      className={`min-h-screen font-sans flex flex-col ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}
      style={mainBg}
    >
      <header className={`flex justify-between items-center p-4 border-b ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white/50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Aperture className="text-indigo-400" size={32} />
          <div>
            <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>VIT-AP</h1>
            <p className="text-xs text-indigo-400">Attendance Planner</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row overflow-y-hidden">
        <CourseSelector 
          onSlotSelect={setSelectedSlot} 
          initialSlot={selectedSlot} 
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col">
          <div className="flex-grow">
            <AnimatePresence mode="wait">
              {!selectedSlot ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                  className="flex h-full items-center justify-center text-center"
                >
                  <div>
                    <BookOpen size={48} className={`mx-auto ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Welcome!</h2>
                    <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Select your course details from the sidebar to begin.</p>
                  </div>
                </motion.div>
              ) : (
                <PlannerView
                  key={selectedSlot.slot}
                  selectedSlot={selectedSlot}
                  handleStartOver={() => setSelectedSlot(null)}
                  plannerData={plannerData}
                />
              )}
            </AnimatePresence>
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}