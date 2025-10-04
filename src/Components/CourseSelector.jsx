import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';

// Helper function
const createCourseData = (slotString, slotDaysMapping) => {
  const parts = slotString.split('+');
  const combinedDays = new Set();
  parts.forEach(part => {
    const primaryPart = part.split('/')[0];
    if (slotDaysMapping[primaryPart]) {
      slotDaysMapping[primaryPart].forEach(day => combinedDays.add(day));
    }
  });
  return { slot: slotString, days: Array.from(combinedDays).sort() };
};

export default function CourseSelector({ onSlotSelect, initialSlot, slotsByYear }) {
  const { theme } = useTheme();
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCredit, setSelectedCredit] = useState('');
  const [courseList, setCourseList] = useState([]);
  
  // This ref helps us know if a change was internal (like changing credit)
  const isInternalNavigation = useRef(false);

  // --- THE FINAL FIX ---
  useEffect(() => {
    // If the component thinks a change was made internally, do nothing and reset the flag.
    if (isInternalNavigation.current) {
      isInternalNavigation.current = false;
      return;
    }

    // This code now ONLY runs for external changes, like the "Start Over" button.
    if (!initialSlot) {
      setSelectedCredit(''); // It correctly clears the credit...
      // ...but it does NOT touch the selectedYear.
    }
  }, [initialSlot]);

  useEffect(() => {
    if (selectedYear && selectedCredit && slotsByYear) {
      const yearData = slotsByYear[selectedYear];
      if (yearData) {
        const slots = yearData.slots[selectedCredit] || [];
        const slotDaysMapping = yearData.slotDays;
        setCourseList(slots.map(slot => createCourseData(slot, slotDaysMapping)));
      }
    } else {
      setCourseList([]);
    }
  }, [selectedYear, selectedCredit, slotsByYear]);

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setSelectedCredit('');
    onSlotSelect(null);
  };
  
  const handleCreditSelect = (credit) => {
    // We tell the component that the next change is an internal one
    isInternalNavigation.current = true; 
    setSelectedCredit(credit);
    onSlotSelect(null);
  };

  return (
    <aside
      className={`w-full md:w-80 p-4 sm:p-6 flex-shrink-0 border-r ${
        theme === 'dark' 
        ? 'bg-black/20 border-gray-800' 
        : 'bg-white border-slate-200' 
      } overflow-y-auto`}
    >
      <div className="space-y-4">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Course Selection
        </h2>

        {!selectedYear ? (
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/40' : 'bg-slate-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={20} className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Select Your Year</h3>
            </div>
            <div className="grid gap-2">
              {[
                { key: '4th_year', label: '4th Year', batch: '2022' },
                { key: '3rd_year', label: '3rd Year', batch: '2023' },
                { key: '2nd_year', label: '2nd Year', batch: '2024' }
              ].map(year => (
                <button
                  key={year.key}
                  onClick={() => handleYearSelect(year.key)}
                  className={`py-3 px-4 rounded-lg text-left transition-all border ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 hover:bg-indigo-600/80 text-white border-transparent'
                      : 'bg-white hover:bg-indigo-50 hover:border-indigo-300 text-gray-700 border-slate-200'
                  }`}
                >
                  <div className="font-medium">{year.label}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{year.batch} Batch</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/40' : 'bg-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedYear.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {selectedYear === '4th_year' ? '2022' : selectedYear === '3rd_year' ? '2023' : '2024'} Batch
                  </span>
                </div>
                <button onClick={() => handleYearSelect('')} className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  Change
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/40' : 'bg-slate-100'}`}>
              <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Select Credits</h3>
              <div className="grid gap-2">
                {['4_credits', '3_credits', '2_credits'].map(creditType => (
                  <button
                    key={creditType}
                    onClick={() => handleCreditSelect(creditType)}
                    className={`py-3 px-4 rounded-lg text-left transition-all border ${
                      selectedCredit === creditType
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-700/80 text-gray-300 border-transparent' : 'bg-white hover:bg-indigo-50 text-gray-700 border-slate-200'
                    }`}
                  >
                    {creditType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {courseList.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Slot Combination</label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto pr-2">
                    {courseList.map((course, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSlotSelect(course)}
                        className={`px-2 py-3 text-center rounded-lg transition-all border-2 text-xs ${
                          initialSlot?.slot === course.slot
                            ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-semibold'
                            : theme === 'dark' ? 'bg-gray-800 border-transparent text-gray-400 hover:border-gray-600' : 'bg-white border-slate-200 text-gray-900 hover:border-slate-400'
                        }`}
                      >
                        <span className="font-semibold">{course.slot}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </aside>
  );
}