import React, { useMemo, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Save } from 'lucide-react';

import CalendarPlanner from './CalendarPlanner.jsx';
import SlotHeatmap from './SlotHeatmap.jsx';
import { calculateAttendanceAnalytics } from '../utils/attendanceAnalytics.js';
import { formatDate } from '../utils/dateUtils.js';

const riskTone = {
  Safe: 'text-success',
  Warning: 'text-warning',
  Critical: 'text-danger',
};

const dateToKey = date => formatDate(date);

const parseEventDate = event => {
  const value = event?.startDate || event?.date;
  if (!value) {
    return null;
  }

  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEnvDate = value => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayBefore = date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() - 1);
  return nextDate;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const findExamCutoff = (events, matcher) => {
  const matchingDates = (events || [])
    .filter(event => matcher(String(event.name || '').toLowerCase()))
    .map(parseEventDate)
    .filter(Boolean)
    .sort((a, b) => a - b);

  return matchingDates[0] ? dayBefore(matchingDates[0]) : null;
};

const buildProjectionHorizons = semesterData => {
  const lastInstructionalDay =
    semesterData?.lastInstructionalDay instanceof Date
      ? semesterData.lastInstructionalDay
      : semesterData?.lastInstructionalDay
        ? new Date(semesterData.lastInstructionalDay)
        : null;
  const events = semesterData?.academicCalendar || [];
  const horizons = [
    {
      key: 'cat1',
      label: 'Till CAT-1',
      date:
        parseEnvDate(import.meta.env.VITE_CAT1_START_DATE) ||
        findExamCutoff(events, name => name.includes('cat-1') || name.includes('cat 1')),
    },
    {
      key: 'cat2',
      label: 'Till CAT-2',
      date:
        parseEnvDate(import.meta.env.VITE_CAT2_START_DATE) ||
        findExamCutoff(events, name => name.includes('cat-2') || name.includes('cat 2')),
    },
    {
      key: 'fat',
      label: 'Till FAT',
      date:
        parseEnvDate(import.meta.env.VITE_FAT_START_DATE) ||
        findExamCutoff(events, name => name.includes('fat')) ||
        lastInstructionalDay,
    },
  ];

  const today = startOfToday();

  return horizons
    .filter(horizon => horizon.date)
    .map(horizon => ({
      ...horizon,
      isPast: horizon.key !== 'fat' && horizon.date < today,
    }));
};

const formatPlannedSkipDate = dateString => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const PlannedSkipPill = ({ skippedDates }) => {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => {
    const list = Array.isArray(skippedDates) ? skippedDates : [];
    return list.slice().sort();
  }, [skippedDates]);
  const count = sorted.length;

  if (count === 0) {
    return <p className="text-sm text-text-muted">No planned skips</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded border border-border-faint bg-elevated px-2.5 py-1 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text-primary"
      >
        <span className="font-mono">{count}</span> planned
        <span className="text-[9px] uppercase tracking-wider">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-64 rounded border border-border-strong bg-surface p-3 shadow-lg"
          role="dialog"
        >
          <p className="eyebrow-label mb-2">Planned skip dates</p>
          <ul className="space-y-1">
            {sorted.map(dateString => (
              <li
                key={dateString}
                className="flex items-baseline justify-between gap-2 font-mono text-xs text-text-secondary"
              >
                <span>{formatPlannedSkipDate(dateString)}</span>
                <span className="text-[10px] text-text-muted">{dateString}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const PlannerView = ({
  selectedSlot,
  handleStartOver,
  plannerData,
  semesterData,
  activeCourse,
  snapshots,
  onSaveSnapshot,
}) => {
  const [activeHorizonKey, setActiveHorizonKey] = useState('fat');
  const {
    classesTaken,
    setClassesTaken,
    classesAttended,
    setClassesAttended,
    skippedDates,
    setSkippedDates,
    eventsMap,
    remainingClassDates,
    calculationData,
    handleDateToggle,
  } = plannerData;
  const horizons = useMemo(() => buildProjectionHorizons(semesterData), [semesterData]);
  const activeHorizon =
    horizons.find(horizon => horizon.key === activeHorizonKey && !horizon.isPast) ||
    horizons.find(horizon => !horizon.isPast) ||
    horizons[horizons.length - 1];
  const horizonDateKey = activeHorizon?.date ? dateToKey(activeHorizon.date) : '';
  const horizonClassDates = useMemo(
    () =>
      horizonDateKey
        ? remainingClassDates.filter(date => date <= horizonDateKey)
        : remainingClassDates,
    [horizonDateKey, remainingClassDates]
  );
  const horizonSkippedDates = useMemo(
    () =>
      horizonDateKey
        ? skippedDates.filter(date => date <= horizonDateKey)
        : skippedDates,
    [horizonDateKey, skippedDates]
  );
  const horizonSemester = useMemo(
    () => ({
      ...semesterData,
      lastInstructionalDay: activeHorizon?.date || semesterData?.lastInstructionalDay,
    }),
    [activeHorizon?.date, semesterData]
  );
  const analytics = useMemo(
    () =>
      calculateAttendanceAnalytics({
        course: {
          ...(activeCourse || {}),
          slotDays: selectedSlot?.days || activeCourse?.slotDays || [],
          classesTaken,
          classesAttended,
          skippedDates: horizonSkippedDates,
        },
        semester: horizonSemester,
        snapshots,
      }),
    [
      activeCourse,
      classesAttended,
      classesTaken,
      selectedSlot,
      horizonSemester,
      horizonSkippedDates,
      snapshots,
    ]
  );
  const canSaveSnapshot = Boolean(
    activeCourse?.id && Number(classesTaken) > 0 && calculationData.isValid
  );

  return (
    <Motion.div
      key="planner"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >
      <section className="grid gap-6 border-b border-border-faint pb-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <button
            type="button"
            onClick={handleStartOver}
            className="mb-5 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </button>
          <p className="eyebrow-label">Course Planner</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
            {activeCourse?.courseName || selectedSlot.slot}
          </h2>
          <p className="mt-2 font-mono text-sm text-accent">{selectedSlot.slot}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {horizons.map(horizon => (
              <button
                key={horizon.key}
                type="button"
                disabled={horizon.isPast}
                onClick={() => setActiveHorizonKey(horizon.key)}
                className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                  horizon.isPast
                    ? 'cursor-not-allowed border-border-faint text-text-muted opacity-40'
                    : activeHorizon?.key === horizon.key
                    ? 'border-accent bg-accent text-inverse'
                    : 'border-border-default text-text-muted hover:border-border-strong hover:text-text-primary'
                }`}
                title={horizon.isPast ? `${horizon.label} cutoff has passed` : horizon.label}
              >
                {horizon.label}
              </button>
            ))}
          </div>
          {activeHorizon ? (
            <p className="mt-3 text-xs text-text-muted">
              Projection window ends on {activeHorizon.date.toLocaleDateString('en-GB')}.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-border-faint border-y border-border-faint sm:grid-cols-3">
          <div className="px-4 py-5">
            <p className="eyebrow-label">Current Attendance</p>
            <p className="mt-2 text-2xl font-semibold">{analytics.currentAttendance}%</p>
            <p className="mt-1 text-xs text-text-muted">present status</p>
          </div>
          <div className="px-4 py-5">
            <p className="eyebrow-label">Final Projection</p>
            <p className="mt-2 text-2xl font-semibold">{analytics.projectedAttendance}%</p>
            <p className="mt-1 text-xs text-text-muted">estimated outcome</p>
          </div>
          <div className="px-4 py-5">
            <p className="eyebrow-label">Risk Level</p>
            <p className={`mt-2 text-2xl font-semibold ${riskTone[analytics.riskLabel]}`}>
              {analytics.riskLabel}
            </p>
            <p className="mt-1 text-xs text-text-muted">{analytics.riskScore}/100 score</p>
          </div>
          <div className="px-4 py-5">
            <p className="eyebrow-label">Remaining Classes</p>
            <p className="mt-2 text-2xl font-semibold">{analytics.remainingClasses}</p>
            <p className="mt-1 text-xs text-text-muted">left in semester</p>
          </div>
          <div className="px-4 py-5">
            <p className="eyebrow-label">Safe Skips Left</p>
            <p className={`mt-2 text-2xl font-semibold ${analytics.remainingSkips >= 0 ? 'text-success' : 'text-danger'}`}>
              {Math.max(0, analytics.remainingSkips)}
            </p>
            <p className="mt-1 text-xs text-text-muted">while staying 75%+</p>
          </div>
          <div className="px-4 py-5">
            <p className="eyebrow-label">Recovery Needed</p>
            <p className="mt-2 text-2xl font-semibold">
              {analytics.isRecoveryImpossible ? 'Impossible' : analytics.recoveryClassesNeeded}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {analytics.isRecoveryImpossible ? 'not enough classes left' : 'classes to attend'}
            </p>
          </div>
        </div>
      </section>

      {analytics.forecast?.ready ? (
        <section className="grid gap-4 border-b border-border-faint pb-6 md:grid-cols-3">
          <div>
            <p className="eyebrow-label">Forecast (end of semester)</p>
            <p className="mt-2 text-3xl font-semibold">{analytics.forecast.predicted}%</p>
            <p className="mt-1 text-xs text-text-muted">
              95% range {analytics.forecast.low}–{analytics.forecast.high}% · {analytics.forecast.sampleSize} snapshots
            </p>
          </div>
          <div>
            <p className="eyebrow-label">Smoothed current</p>
            <p className="mt-2 text-3xl font-semibold">{analytics.forecast.smoothedCurrent}%</p>
            <p className="mt-1 text-xs text-text-muted">EWMA of saved snapshots</p>
          </div>
          <div>
            <p className="eyebrow-label">Trajectory</p>
            <p
              className={`mt-2 text-3xl font-semibold ${
                analytics.trend.direction === 'improving'
                  ? 'text-success'
                  : analytics.trend.direction === 'declining'
                    ? 'text-danger'
                    : ''
              }`}
            >
              {analytics.trend.direction}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {analytics.forecast.slopePerDay >= 0 ? '+' : ''}
              {analytics.forecast.slopePerDay} %/day
            </p>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 border-b border-border-faint pb-8">
        <div>
          <p className="eyebrow-label">Semester Calendar</p>
          <h3 className="mt-1 text-2xl font-semibold">Class days for {selectedSlot.slot}</h3>
        </div>
        <SlotHeatmap
          slotLabel={selectedSlot.slot}
          slotDays={selectedSlot.days}
          course={activeCourse}
          semesterData={semesterData}
        />
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6 lg:border-r lg:border-border-faint lg:pr-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow-label">Attendance Input</p>
              <p className="mt-2 text-sm text-text-muted">
                Enter the latest VTOP values. The risk engine recalculates immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClassesTaken('');
                setClassesAttended('');
                setSkippedDates([]);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-default text-text-muted transition-colors hover:border-border-strong hover:bg-subtle hover:text-text-primary"
              title="Clear fields"
              aria-label="Clear fields"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Classes conducted so far
              </span>
              <input
                type="number"
                min="0"
                max="999"
                value={classesTaken}
                onChange={event => setClassesTaken(event.target.value)}
                className="field-input"
                placeholder="42"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Classes attended
              </span>
              <input
                type="number"
                min="0"
                max="999"
                value={classesAttended}
                onChange={event => setClassesAttended(event.target.value)}
                className="field-input"
                placeholder="36"
              />
            </label>
          </div>

          {!calculationData.isValid ? (
            <div className="border border-danger bg-danger-dim px-4 py-3 text-sm text-danger">
              Attended classes cannot be greater than total classes.
            </div>
          ) : null}

          <div className="border-border-faint border-t pt-4">
            <p className="eyebrow-label">Recommendation</p>
            <p className="mt-2 text-sm text-text-secondary">{analytics.recommendation}</p>
          </div>

          {canSaveSnapshot ? (
            <button
              type="button"
              onClick={() => onSaveSnapshot?.(analytics)}
              className="ghost-button w-full justify-center"
            >
              <Save size={15} />
              Save trend snapshot
            </button>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow-label">Skip Calendar</p>
              <h3 className="mt-1 text-2xl font-semibold">Plan future absences</h3>
            </div>
            <PlannedSkipPill skippedDates={skippedDates} />
          </div>

          <CalendarPlanner
            classDates={horizonClassDates}
            skippedDates={skippedDates}
            onDateToggle={handleDateToggle}
            onClear={() => setSkippedDates([])}
            eventsMap={eventsMap}
          />
        </div>
      </section>
    </Motion.div>
  );
};

export default PlannerView;
