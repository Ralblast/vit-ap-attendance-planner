import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Aperture, BookOpen, BarChart3, CheckCircle, AlertTriangle, Target, Trash2, CalendarDays, RefreshCcw, Info, Sun, Moon, Mail, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import LiveClock from './components/LiveClock';
import ThemeToggle from './components/ThemeToggle.jsx';
import InfoCard from './components/InfoCard.jsx';
import AttendanceGauge from './components/AttendanceGauge.jsx';
import CalendarPlanner from './components/CalendarPlanner.jsx';
import PlannerView from './components/PlannerView.jsx';
import AppFooter from './components/AppFooter.jsx';

import { academicCalendar } from './data/academicCalendar.js';
import { theorySlots } from './data/slotData.js';
import { MIN_ATTENDANCE, CALCULATION_DATE, LAST_INSTRUCTIONAL_DAY } from './data/constants.js';
import { formatDate } from './utils/dateUtils.js';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [credit, setCredit] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [classesTaken, setClassesTaken] = useState('');
  const [classesSkipped, setClassesSkipped] = useState('');
  const [skippedDates, setSkippedDates] = useState([]);
  const [showResetNotification, setShowResetNotification] = useState(false);
  const isInitialMount = useRef(true);

const eventsMap = useMemo(() => {
  const map = new Map();
  academicCalendar.forEach(event => {
    if (event.date) {
      map.set(formatDate(new Date(event.date + 'T00:00:00')), { type: event.type, name: event.name });
    } else if (event.startDate && event.endDate) {
      let current = new Date(event.startDate + 'T00:00:00');
      const end = new Date(event.endDate + 'T00:00:00');
      while (current <= end) {
        map.set(formatDate(current), { type: event.type, name: event.name });
        current.setDate(current.getDate() + 1);
      }
    }
  });
  return map;
}, []);


  const holidayDateSet = useMemo(() => {
    const dates = new Set();
    eventsMap.forEach((event, date) => {
      if (event.type === 'holiday' || event.type === 'exam') {
        dates.add(date);
      }
    });
    return dates;
  }, [eventsMap]);

  const remainingClassDates = useMemo(() => {
    if (!selectedSlot) return [];
    let dates = [];
    let currentDate = new Date(CALCULATION_DATE);
    while (currentDate <= LAST_INSTRUCTIONAL_DAY) {
      if (selectedSlot.days.includes(currentDate.getDay()) && !holidayDateSet.has(formatDate(currentDate))) {
        dates.push(formatDate(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [selectedSlot, holidayDateSet]);

  const calculationData = useMemo(() => {
    const taken = parseInt(classesTaken) || 0;
    const skipped = parseInt(classesSkipped) || 0;
    if (taken < 0 || skipped < 0 || skipped > taken) return { isValid: false };
    const remainingClasses = remainingClassDates.length;
    const totalClasses = taken + remainingClasses;
    const currentAtt = taken > 0 ? ((taken - skipped) / taken) * 100 : 0;
    if (totalClasses === 0) return { isValid: true, currentAtt: 0, remainingClasses: 0, projectedAtt: 0, remainingSkips: 0 };
    const totalAllowedSkips = Math.floor(totalClasses * (1 - MIN_ATTENDANCE / 100));
    const remainingSkips = totalAllowedSkips - skipped - skippedDates.length;
    const projectedAttended = (taken - skipped) + (remainingClasses - skippedDates.length);
    const projectedAtt = totalClasses > 0 ? (projectedAttended / totalClasses) * 100 : 0;
    return { isValid: true, currentAtt, remainingClasses, projectedAtt, remainingSkips };
  }, [classesTaken, classesSkipped, skippedDates, remainingClassDates]);

  const showProjection = useMemo(() => classesTaken && (parseInt(classesTaken) > 0) && (parseInt(classesSkipped) >= 0) && calculationData.isValid, [classesTaken, classesSkipped, calculationData]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSkippedDates([]);
    if (parseInt(classesTaken) > 0) {
      setShowResetNotification(true);
      const timer = setTimeout(() => setShowResetNotification(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [classesTaken]);

  const handleDateToggle = useCallback((dateStr) => {
    setSkippedDates(prev => {
      const newDates = new Set(prev);
      if (newDates.has(dateStr)) newDates.delete(dateStr); else newDates.add(dateStr);
      return Array.from(newDates);
    });
  }, []);

  const handleStartOver = () => {
    setCredit(null);
    setSelectedSlot(null);
    setClassesTaken('');
    setClassesSkipped('');
    setSkippedDates([]);
  };

  const filteredSlots = credit ? theorySlots[`${credit}_credits`] : [];

  const mainBg = theme === 'dark'
    ? { background: 'radial-gradient(circle, rgba(31,41,55,1) 0%, rgba(17,24,39,1) 100%)' }
    : { background: 'radial-gradient(circle, rgba(243, 244, 246, 1) 0%, rgba(229, 231, 235, 1) 100%)' };

  return (
    <div className={`min-h-screen font-sans flex flex-col ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`} style={mainBg}>
      <header className={`flex justify-between items-center p-4 border-b ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white/50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Aperture className="text-indigo-400" size={32} />
          <div>
            <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>VIT-AP</h1>
            <p className="text-xs text-indigo-400">Attendance Planner</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock theme={theme} />
          <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row overflow-y-hidden">
        <aside className={`w-full md:w-80 p-6 flex-shrink-0 border-r ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-white/50 border-gray-200'} overflow-y-auto`}>
          <div className="space-y-4">
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Course Selection</h2>
            <div>
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Credits</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[2, 3, 4].map(c => (
                  <button
                    key={c}
                    onClick={() => { setCredit(c); setSelectedSlot(null); }}
                    className={`py-2 rounded-lg font-semibold transition-all ${
                      credit === c
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <AnimatePresence>
              {credit && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Slot Combination</label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto pr-2">
                    {filteredSlots.map(slot => (
                      <button
                        key={slot.slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-2 py-3 text-center rounded-lg transition-all border-2 text-xs ${
                          selectedSlot?.slot === slot.slot
                            ? 'bg-indigo-500/20 border-indigo-500 text-white'
                            : theme === 'dark'
                              ? 'bg-gray-800 border-transparent text-gray-400 hover:border-gray-600'
                              : 'bg-white border border-gray-300 text-gray-900 hover:border-gray-400'
                        }`}
                      >
                        <span className="font-semibold">{slot.slot}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col">
          <div className="flex-grow">
            <AnimatePresence mode="wait">
              {!selectedSlot ? (
                <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, transition: {duration: 0.2} }} className="flex h-full items-center justify-center text-center">
                  <div><BookOpen size={48} className={`mx-auto ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} mb-4`}/><h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Welcome!</h2><p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Select your course details from the sidebar to begin.</p></div>
                </motion.div>
              ) : (
                <PlannerView
                  key={selectedSlot.slot}
                  theme={theme}
                  selectedSlot={selectedSlot}
                  handleStartOver={handleStartOver}
                  classesTaken={classesTaken}
                  setClassesTaken={setClassesTaken}
                  classesSkipped={classesSkipped}
                  setClassesSkipped={setClassesSkipped}
                  calculationData={calculationData}
                  showProjection={showProjection}
                  showResetNotification={showResetNotification}
                  remainingClassDates={remainingClassDates}
                  skippedDates={skippedDates}
                  handleDateToggle={handleDateToggle}
                  setSkippedDates={setSkippedDates}
                  eventsMap={eventsMap}
                />
              )}
            </AnimatePresence>
          </div>
          <AppFooter theme={theme} />
        </main>
      </div>
    </div>
  );
}
