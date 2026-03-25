import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Info,
  RefreshCcw,
  Target,
} from 'lucide-react';
import InfoCard from './InfoCard.jsx';
import CalendarPlanner from './CalendarPlanner.jsx';
import AttendanceGauge from './AttendanceGauge.jsx';
import { MIN_ATTENDANCE } from '../data/constants.js';

const PlannerView = ({ selectedSlot, handleStartOver, plannerData, lastInstructionalDay }) => {
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

  const statusRef = useRef(null);
  const projectionRef = useRef(null);

  useEffect(() => {
    if (statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    if (showProjection && projectionRef.current) {
      setTimeout(() => {
        projectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showProjection]);

  const projectionSafe = calculationData.projectedAtt >= MIN_ATTENDANCE;
  const remainingSkipsTone =
    calculationData.remainingSkips >= 0 ? 'text-warning' : 'text-danger';

  return (
    <Motion.div
      key="planner"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      className="space-y-8"
    >
      <div ref={statusRef} className="app-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="mono-slot">{selectedSlot.slot}</p>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
              Current Status
            </h2>
            <p className="text-sm text-text-muted">
              Enter your attendance details exactly as they appear on the VTOP portal.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartOver}
            className="inline-flex items-center gap-2 self-start text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <RefreshCcw size={14} />
            Start Over
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="taken" className="text-sm font-medium text-text-secondary">
              Total Classes (from VTOP)
            </label>
            <input
              type="number"
              id="taken"
              min="0"
              max="999"
              value={classesTaken}
              onChange={e => setClassesTaken(e.target.value)}
              className="field-input"
              placeholder="e.g. 42"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="attended" className="text-sm font-medium text-text-secondary">
              Classes Attended (from VTOP)
            </label>
            <input
              type="number"
              id="attended"
              min="0"
              max="999"
              value={classesAttended}
              onChange={e => setClassesAttended(e.target.value)}
              className="field-input"
              placeholder="e.g. 36"
            />
          </div>
        </div>

        {!calculationData.isValid ? (
          <div className="mt-4 rounded-lg border border-danger bg-danger-dim px-4 py-3 text-sm text-danger">
            "Attended" cannot be greater than "Total Classes".
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {showProjection ? (
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <InfoCard
              icon={<BarChart3 size={16} />}
              title="Current Attendance"
              value={`${calculationData.currentAtt.toFixed(1)}%`}
              subtext={`${parseInt(classesAttended || 0, 10)} / ${parseInt(classesTaken || 0, 10)} classes`}
              color={calculationData.currentAtt >= MIN_ATTENDANCE ? 'text-success' : 'text-danger'}
            />
            <InfoCard
              icon={<CalendarDays size={16} />}
              title="Remaining Classes"
              value={calculationData.remainingClasses}
              subtext={`Until ${lastInstructionalDay.toLocaleDateString('en-GB')}`}
            />
            <InfoCard
              icon={<Target size={16} />}
              title="Skips You Can Afford"
              value={calculationData.remainingSkips}
              subtext={`To stay >= ${MIN_ATTENDANCE}%`}
              color={remainingSkipsTone}
            />
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <div ref={projectionRef} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
              Future Projection
            </h2>
          </div>
          <AnimatePresence>
            {showResetNotification ? (
              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="inline-flex items-center gap-2 rounded-lg border border-warning bg-warning-dim px-3 py-2 text-sm text-warning"
              >
                <Info size={14} />
                Plan recalculated.
              </Motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <CalendarPlanner
            classDates={remainingClassDates}
            skippedDates={skippedDates}
            onDateToggle={handleDateToggle}
            onClear={() => setSkippedDates([])}
            eventsMap={eventsMap}
          />

          <AnimatePresence>
            {showProjection ? (
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="app-card flex flex-col items-center space-y-5 p-5 sm:p-6"
              >
                <h3 className="text-lg font-semibold text-text-primary">
                  Projected Final Attendance
                </h3>
                <AttendanceGauge percentage={calculationData.projectedAtt} />
                {projectionSafe ? (
                  <div className="flex w-full items-start gap-3 rounded-lg border border-success bg-success-dim px-4 py-3 text-success">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      This plan keeps you safely above the {MIN_ATTENDANCE}% threshold.
                    </p>
                  </div>
                ) : (
                  <div className="flex w-full items-start gap-3 rounded-lg border border-danger bg-danger-dim px-4 py-3 text-danger">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      Warning! This will drop you below the required {MIN_ATTENDANCE}%.
                    </p>
                  </div>
                )}
              </Motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </Motion.div>
  );
};

export default PlannerView;
