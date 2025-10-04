import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, BarChart3, CalendarDays, Target, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import InfoCard from './InfoCard.jsx';
import CalendarPlanner from './CalendarPlanner.jsx';
import AttendanceGauge from './AttendanceGauge.jsx';
import { MIN_ATTENDANCE, LAST_INSTRUCTIONAL_DAY } from '../data/constants.js';
import { useTheme } from '../contexts/ThemeContext.jsx';

const PlannerView = ({ selectedSlot, handleStartOver, plannerData }) => {
  const { theme } = useTheme();
  const {
    classesTaken, setClassesTaken,
    classesAttended, setClassesAttended,
    skippedDates, setSkippedDates,
    showResetNotification,
    eventsMap,
    remainingClassDates,
    calculationData,
    showProjection,
    handleDateToggle,
  } = plannerData;

  // --- REFS FOR SCROLLING ---
  const statusRef = useRef(null);
  const projectionRef = useRef(null); // New ref for the projection section

  // Effect 1: Scrolls to the input section when the view first loads
  useEffect(() => {
    if (statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // --- NEW ---
  // Effect 2: Scrolls to the projection section ONLY when it first appears
  useEffect(() => {
    if (showProjection && projectionRef.current) {
      // A small delay ensures the section is fully rendered before scrolling
      setTimeout(() => {
        projectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100); 
    }
  }, [showProjection]); // This runs whenever `showProjection` changes


  return (
    <motion.div 
      key="planner" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }} 
      className="space-y-8"
    >
      {/* Section 1: Current Status & Inputs */}
      <div ref={statusRef}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Current Status for <span className="text-indigo-400">{selectedSlot.slot}</span>
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Enter your attendance details exactly as they appear on the VTOP portal.
            </p>
          </div>
          <button 
            onClick={handleStartOver} 
            className={`flex items-center gap-2 text-sm transition-colors ${
              theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <RefreshCcw size={14}/> Start Over
          </button>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="taken" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Classes (from VTOP)
            </label>
            <input 
              type="number" 
              id="taken" 
              min="0"
              max="999"
              value={classesTaken} 
              onChange={e => setClassesTaken(e.target.value)}
              className={`w-full p-2 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'}`} 
              placeholder="e.g., 42" 
            />
          </div>
          <div>
              <label htmlFor="attended" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Classes Attended (from VTOP)
              </label>
              <input 
                type="number" 
                id="attended" 
                min="0"
                max="999"
                value={classesAttended} 
                onChange={e => setClassesAttended(e.target.value)}
                className={`w-full p-2 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'}`} 
                placeholder="e.g., 36" 
              />
            </div>
        </div>
        
        {!calculationData.isValid && (
          <p className="text-red-400 text-sm mt-2">
            Error: "Attended" cannot be greater than "Total Classes".
          </p>
        )}
      </div>

      {/* Section 2: Info Cards */}
      <AnimatePresence>
        {showProjection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <InfoCard 
              icon={<BarChart3 size={24}/>} 
              title="Current %" 
              value={`${calculationData.currentAtt.toFixed(1)}%`} 
              subtext={`${parseInt(classesAttended || 0)} / ${parseInt(classesTaken || 0)}`} 
              color={calculationData.currentAtt >= MIN_ATTENDANCE ? 'text-green-400' : 'text-red-400'}
            />
            <InfoCard 
              icon={<CalendarDays size={24}/>} 
              title="Remaining Classes" 
              value={calculationData.remainingClasses} 
              subtext={`Until ${LAST_INSTRUCTIONAL_DAY.toLocaleDateString('en-GB')}`} 
              color="text-blue-400"
            />
            <InfoCard 
              icon={<Target size={24}/>} 
              title="Skips You Can Afford" 
              value={calculationData.remainingSkips} 
              subtext={`to stay ≥ ${MIN_ATTENDANCE}%`} 
              color={calculationData.remainingSkips >= 0 ? 'text-yellow-400' : 'text-red-400'}
            />
          </motion.div>
        )}
      </AnimatePresence>
            
      {/* Section 3: Future Projection */}
      <div ref={projectionRef}> {/* Attach the new ref here */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Future Projection
          </h2>
          <AnimatePresence>
            {showResetNotification && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 10 }} 
              className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}
            >
              <Info size={14} /> Plan re-calculated.
            </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <CalendarPlanner 
            classDates={remainingClassDates} 
            skippedDates={skippedDates} 
            onDateToggle={handleDateToggle} 
            onClear={() => setSkippedDates([])} 
            eventsMap={eventsMap} 
          />

          <AnimatePresence>
            {showProjection && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`p-6 rounded-xl border space-y-4 flex flex-col items-center ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/60 border-gray-200'}`}
              >
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Projected Final Attendance
                </h3>
                <AttendanceGauge percentage={calculationData.projectedAtt} />
                {calculationData.projectedAtt >= MIN_ATTENDANCE ? (
                  <div className={`flex items-center gap-3 p-3 rounded-lg w-full ${theme === 'dark' ? 'bg-green-500/10 text-green-300' : 'bg-green-100 text-green-700'}`}>
                    <CheckCircle/> 
                    <p className="text-sm">
                      This plan keeps you safely above the {MIN_ATTENDANCE}% threshold.
                    </p>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 p-3 rounded-lg w-full ${theme === 'dark' ? 'bg-red-500/10 text-red-300' : 'bg-red-100 text-red-700'}`}>
                    <AlertTriangle/> 
                    <p className="text-sm">
                      Warning! This will drop you below the required {MIN_ATTENDANCE}%.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default PlannerView;