import React, { useState } from 'react';
// --- 1. IMPORT: Added the 'Menu' icon for the button ---
import { Aperture, BookOpen, Loader, AlertTriangle, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import LiveClock from './Components/LiveClock';
import ThemeToggle from './Components/ThemeToggle';
import CourseSelector from './Components/CourseSelector';
import PlannerView from './Components/PlannerView';
import AppFooter from './Components/AppFooter';
import { useAttendancePlanner } from './hooks/useAttendancePlanner';
import { useTheme } from './contexts/ThemeContext';
import { useSemesterData } from './hooks/useSemesterData';

// A simple component to show while data is loading
const LoadingScreen = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4">
    <Loader className="animate-spin text-indigo-400" size={48} />
    <p>Loading Academic Calendar...</p>
  </div>
);

// A simple component to show if data fails to load
const ErrorScreen = ({ error }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
    <AlertTriangle className="text-red-400" size={48} />
    <h2 className="text-xl font-bold">Failed to Load Data</h2>
    <p className="max-w-md text-sm text-gray-400">The application could not load the required semester data. Please check your network connection and try refreshing the page.</p>
  </div>
);


export default function App() {
  const { theme } = useTheme();
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // --- 2. NEW STATE: To control the sidebar's visibility ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { data: semesterData, isLoading, error } = useSemesterData();

  const plannerData = useAttendancePlanner(
    selectedSlot,
    semesterData?.academicCalendar,
    semesterData?.lastInstructionalDay
  );

  const darkBg = 'radial-gradient(circle, rgba(31,41,55,1) 0%, rgba(17,24,39,1) 100%)';

  return (
    <div
      className={`min-h-screen font-sans flex flex-col ${
        theme === 'dark' ? 'text-gray-200' : 'bg-slate-100 text-gray-800'
      }`}
      style={theme === 'dark' ? { background: darkBg } : {}}
    >
      <header className={`flex justify-between items-center p-4 border-b ${
        theme === 'dark' 
        ? 'bg-gray-900/50 border-gray-800' 
        : 'bg-white/80 backdrop-blur-sm border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          {/* --- 3. NEW BUTTON: The "three lines" button to toggle the sidebar --- */}
          {!isLoading && !error && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-md transition-colors hidden md:block ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-slate-200'}`}
              title="Toggle Sidebar"
            >
              <Menu size={20} />
            </button>
          )}
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
        {isLoading ? (
          <LoadingScreen />
        ) : error ? (
          <ErrorScreen error={error} />
        ) : (
          <>
            {/* --- 4. UPDATED WRAPPER: This div controls the collapse behavior --- */}
            <div
              className={`flex-shrink-0 transition-all duration-300 ease-in-out hidden md:block ${
                isSidebarOpen ? 'md:w-80' : 'md:w-0'
              } overflow-hidden`}
            >
              <CourseSelector
                onSlotSelect={setSelectedSlot}
                initialSlot={selectedSlot}
                slotsByYear={semesterData.slotsByYear}
              />
            </div>
            
            {/* This is the original sidebar for mobile, which is unaffected */}
            <div className="block md:hidden">
               <CourseSelector
                onSlotSelect={setSelectedSlot}
                initialSlot={selectedSlot}
                slotsByYear={semesterData.slotsByYear}
              />
            </div>

            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col">
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
                      lastInstructionalDay={semesterData.lastInstructionalDay}
                    />
                  )}
                </AnimatePresence>
              </div>
              <AppFooter />
            </main>
          </>
        )}
      </div>
    </div>
  );
}