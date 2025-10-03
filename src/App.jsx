import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Aperture,
  BookOpen,
  Trash2,
  GraduationCap,
  Sun,
  Moon,
  Mail,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import LiveClock from './Components/LiveClock';
import ThemeToggle from './Components/ThemeToggle';
import InfoCard from './Components/InfoCard';
import AttendanceGauge from './Components/AttendanceGauge';
import CalendarPlanner from './Components/CalendarPlanner';
import PlannerView from './Components/PlannerView';
import AppFooter from './Components/AppFooter';

import { academicCalendar } from './data/academicCalendar.js';
import { getSlotsForYear, createSlotData } from './data/slotData.js';
import {
  MIN_ATTENDANCE,
  LAST_INSTRUCTIONAL_DAY
} from './data/constants.js';
import { formatDate } from './utils/dateUtils.js';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCredit, setSelectedCredit] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [classesTaken, setClassesTaken] = useState('');
  const [classesSkipped, setClassesSkipped] = useState('');
  const [skippedDates, setSkippedDates] = useState([]);
  const [showResetNotification, setShowResetNotification] = useState(false);
  const isInitialMount = useRef(true);
  const prevSlotRef = useRef(null);

  useEffect(() => {
    if (selectedYear) {
      setSelectedCredit('');
      setSelectedSlot(null);
      setClassesTaken('');
      setClassesSkipped('');
      setSkippedDates([]);
      prevSlotRef.current = null;
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedCredit) {
      setSelectedSlot(null);
      setClassesTaken('');
      setClassesSkipped('');
      setSkippedDates([]);
      prevSlotRef.current = null;
    }
  }, [selectedCredit]);

  useEffect(() => {
    if (selectedSlot) {
      if (prevSlotRef.current !== selectedSlot.slot) {
        prevSlotRef.current = selectedSlot.slot;
        setClassesTaken('');
        setClassesSkipped('');
        setSkippedDates([]);
      }
    }
  }, [selectedSlot]);

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
     let currentDate = new Date(); // Formerly: new Date(CALCULATION_DATE)
    while (currentDate <= LAST_INSTRUCTIONAL_DAY) {
      if (
        selectedSlot.days.includes(currentDate.getDay()) &&
        !holidayDateSet.has(formatDate(currentDate))
      ) {
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
    if (totalClasses === 0)
      return { isValid: true, currentAtt: 0, remainingClasses: 0, projectedAtt: 0, remainingSkips: 0 };
    const totalAllowedSkips = Math.floor(totalClasses * (1 - MIN_ATTENDANCE / 100));
    const remainingSkips = totalAllowedSkips - skipped - skippedDates.length;
    const projectedAttended = taken - skipped + (remainingClasses - skippedDates.length);
    const projectedAtt = (projectedAttended / totalClasses) * 100;
    return { isValid: true, currentAtt, remainingClasses, projectedAtt, remainingSkips };
  }, [classesTaken, classesSkipped, skippedDates, remainingClassDates]);

  const showProjection = useMemo(
    () =>
      classesTaken &&
      parseInt(classesTaken) > 0 &&
      parseInt(classesSkipped) >= 0 &&
      calculationData.isValid,
    [classesTaken, classesSkipped, calculationData]
  );

  const handleDateToggle = useCallback(dateStr => {
    setSkippedDates(prev => {
      const newDates = new Set(prev);
      newDates.has(dateStr) ? newDates.delete(dateStr) : newDates.add(dateStr);
      return Array.from(newDates);
    });
  }, []);

  const handleStartOver = () => {
    setSelectedYear('');
    setSelectedCredit('');
    setSelectedSlot(null);
    setClassesTaken('');
    setClassesSkipped('');
    setSkippedDates([]);
    prevSlotRef.current = null;
  };

  const mainBg =
    theme === 'dark'
      ? { background: 'radial-gradient(circle, rgba(31,41,55,1) 0%, rgba(17,24,39,1) 100%)' }
      : { background: 'radial-gradient(circle, rgba(243,244,246,1) 0%, rgba(229,231,235,1) 100%)' };

  return (
    <div
      className={`min-h-screen font-sans flex flex-col ${
        theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
      }`}
      style={mainBg}
    >
      <header
        className={`flex justify-between items-center p-4 border-b ${
          theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white/50 border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <Aperture className="text-indigo-400" size={32} />
          <div>
            <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              VIT-AP
            </h1>
            <p className="text-xs text-indigo-400">Attendance Planner</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock theme={theme} />
          <ThemeToggle theme={theme} onToggle={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} />
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row overflow-y-hidden">
        <aside
          className={`w-full md:w-80 p-6 flex-shrink-0 border-r ${
            theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-gray-100 border-gray-300'
          } overflow-y-auto`}
        >
          <div className="space-y-4">
            <h2
              className={`text-sm font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Course Selection
            </h2>

            {!selectedYear ? (
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap
                    size={20}
                    className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
                  />
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Select Your Year
                  </h3>
                </div>
                <div className="grid gap-2">
                  {[
                    { key: '4th_year', label: '4th Year', batch: '2022' },
                    { key: '3rd_year', label: '3rd Year', batch: '2023' },
                    { key: '2nd_year', label: '2nd Year', batch: '2024' }
                  ].map(year => (
                    <button
                      key={year.key}
                      onClick={() => setSelectedYear(year.key)}
                      className={`py-3 px-4 rounded-lg text-left transition-all border-2 ${
                        theme === 'dark'
                          ? year.key === selectedYear
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-gray-600 hover:bg-indigo-600 text-white border-transparent'
                          : year.key === selectedYear
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-700 border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{year.label}</div>
                      <div
                        className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {year.batch} Batch
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap
                        size={16}
                        className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
                      />
                      <span
                        className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        {selectedYear.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} •{' '}
                        {selectedYear === '4th_year'
                          ? '2022'
                          : selectedYear === '3rd_year'
                          ? '2023'
                          : '2024'}{' '}
                        Batch
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedYear('')}
                      className={`text-xs px-2 py-1 rounded ${
                        theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Select Credits
                  </h3>
                  <div className="grid gap-2">
                    {['4_credits', '3_credits', '2_credits'].map(creditType => (
                      <button
                        key={creditType}
                        onClick={() => setSelectedCredit(creditType)}
                        className={`py-3 px-4 rounded-lg text-left transition-all ${
                          selectedCredit === creditType
                            ? 'bg-indigo-600 text-white border border-indigo-600'
                            : theme === 'dark'
                            ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-50 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {creditType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <AnimatePresence>
              {selectedYear && selectedCredit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Slot Combination
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto pr-2">
                    {createSlotData(selectedYear, selectedCredit).map((course, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSlot(course)}
                        className={`px-2 py-3 text-center rounded-lg transition-all border-2 text-xs ${
                          selectedSlot?.slot === course.slot
                            ? 'bg-indigo-500/20 border-indigo-500 text-white'
                            : theme === 'dark'
                            ? 'bg-gray-800 border-transparent text-gray-400 hover:border-gray-600'
                            : 'bg-white border border-gray-300 text-gray-900 hover:border-gray-400'
                        }`}
                      >
                        <span className="font-semibold">{course.slot}</span>
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
