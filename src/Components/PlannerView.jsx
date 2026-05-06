import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, RotateCcw, Save } from 'lucide-react';

import CalendarPlanner from './CalendarPlanner.jsx';
import SavedCheck from './SavedCheck.jsx';
import SlotHeatmap from './SlotHeatmap.jsx';
import StatusGlyph from './StatusGlyph.jsx';
import { calculateAttendanceAnalytics } from '../utils/attendanceAnalytics.js';
import { formatDate } from '../utils/dateUtils.js';
import { buildProjectionHorizons, getNextCheckpoint } from '../utils/projectionHorizons.js';
import { MIN_ATTENDANCE } from '../data/constants.js';

const riskTone = {
  Safe: 'text-success',
  Warning: 'text-warning',
  Critical: 'text-danger',
};

const riskGlyphTone = {
  Safe: 'success',
  Warning: 'warning',
  Critical: 'danger',
};

const dateToKey = date => formatDate(date);

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

// Briefly displays a "Saved" check next to the planned-skip pill whenever
// the underlying skippedDates array changes. The actual write happens
// asynchronously in App's useUserSync; this just tells the student their
// edit was acknowledged so they don't second-guess and click again.
const SavedPulse = ({ trigger }) => {
  const [visible, setVisible] = useState(false);
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return undefined;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-success transition-opacity"
      role="status"
      aria-live="polite"
    >
      <SavedCheck size={11} />
      Saved
    </span>
  );
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

// "Why this verdict?" expandable panel — surfaces the engine's reasoning
// in plain language: CART decision-tree features, formula score breakdown
// component-by-component, and the worst-label-wins ensemble decision.
// Both guest and signed-in students see this; CART runs on current
// features without needing snapshot history.
const WhyVerdictPanel = ({ analytics }) => {
  const breakdown = analytics.riskBreakdown || {};
  const features = analytics.classifierFeatures || [];
  const ensembleAgrees = analytics.classifierLabel === analytics.formulaLabel;

  const components = [
    {
      key: 'projection',
      label: 'Projection penalty',
      value: breakdown.projectionPenalty,
      detail: `100 − projected (${analytics.projectedAttendance}%)`,
    },
    {
      key: 'deficit',
      label: 'Threshold deficit',
      value: breakdown.thresholdDeficitPenalty,
      detail: `(75 − current) × 1.2 if below threshold`,
    },
    {
      key: 'buffer',
      label: 'Skip buffer penalty',
      value: breakdown.skipBufferPenalty,
      detail: `8 × max(0, −skips left)`,
    },
    {
      key: 'recovery',
      label: 'Recovery pressure',
      value: breakdown.recoveryPenalty,
      detail: `3 × classes needed to recover (${analytics.recoveryClassesNeeded})`,
    },
    {
      key: 'planned',
      label: 'Planned skip penalty',
      value: breakdown.plannedSkipPenalty,
      detail: `1.5 × planned skip count (${analytics.plannedSkipCount})`,
    },
    {
      key: 'trend',
      label: 'Trend adjustment',
      value: breakdown.trendAdjustment,
      detail:
        analytics.trend.direction === 'declining'
          ? '+8 (declining)'
          : analytics.trend.direction === 'improving'
            ? '−5 (improving)'
            : '0 (stable)',
    },
  ];

  const featureLabels = [
    'Current %',
    'Projected %',
    'Skip buffer',
    'Recovery needed',
    'Trend bucket',
  ];

  return (
    <div className="rounded border border-border-default bg-surface p-4 text-sm">
      <p className="eyebrow-label">Risk Engine Breakdown</p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            CART decision tree → <span className={riskTone[analytics.classifierLabel]}>{analytics.classifierLabel}</span>
          </p>
          <ul className="mt-2 space-y-1 text-xs text-text-secondary">
            {features.map((value, idx) => (
              <li key={featureLabels[idx]} className="flex items-baseline justify-between gap-2">
                <span className="text-text-muted">{featureLabels[idx]}</span>
                <span className="font-mono">{value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Composite formula → <span className={riskTone[analytics.formulaLabel]}>{analytics.formulaLabel}</span>{' '}
            <span className="text-text-muted">({analytics.riskScore}/100)</span>
          </p>
          <ul className="mt-2 space-y-1 text-xs text-text-secondary">
            {components.map(component => (
              <li
                key={component.key}
                className="flex items-baseline justify-between gap-2"
              >
                <span className="text-text-muted" title={component.detail}>
                  {component.label}
                </span>
                <span className="font-mono">
                  {component.value > 0 ? '+' : ''}
                  {component.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 border-t border-border-faint pt-3 text-xs text-text-secondary">
        <span className="text-text-muted">Ensemble (worst-label-wins) → </span>
        <span className={`font-semibold ${riskTone[analytics.riskLabel]}`}>
          {analytics.riskLabel}
        </span>
        <span className="text-text-muted">
          {ensembleAgrees
            ? ' — both methods agree'
            : ' — methods disagreed; the more cautious label was kept'}
        </span>
      </div>
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
  isGuest = false,
  onSignInRequest,
}) => {
  const [whyOpen, setWhyOpen] = useState(false);
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
  const nextCheckpoint = useMemo(() => getNextCheckpoint(semesterData), [semesterData]);

  const baseCourse = useMemo(
    () => ({
      ...(activeCourse || {}),
      slotDays: selectedSlot?.days || activeCourse?.slotDays || [],
      classesTaken,
      classesAttended,
      skippedDates,
    }),
    [activeCourse, classesAttended, classesTaken, selectedSlot, skippedDates]
  );

  // Full-semester analytics anchors the Risk verdict + heatmap remaining
  // classes count. The 75% threshold applies across the whole semester so
  // the verdict has to be FAT-anchored even if the student is currently
  // worried about the next checkpoint.
  const analytics = useMemo(
    () =>
      calculateAttendanceAnalytics({
        course: baseCourse,
        semester: semesterData,
        snapshots,
      }),
    [baseCourse, semesterData, snapshots]
  );

  // Per-checkpoint analytics for the multi-row Projected tile. Each entry
  // overrides lastInstructionalDay with the checkpoint date so projection,
  // remaining classes, and skips-left reflect that window only.
  const projectionsByHorizon = useMemo(() => {
    return horizons.map(horizon => {
      const semesterAtHorizon = {
        ...semesterData,
        lastInstructionalDay: horizon.date,
      };
      const horizonSkippedDates = skippedDates.filter(
        d => d <= dateToKey(horizon.date)
      );
      const a = calculateAttendanceAnalytics({
        course: { ...baseCourse, skippedDates: horizonSkippedDates },
        semester: semesterAtHorizon,
        snapshots,
      });
      return { horizon, analytics: a };
    });
  }, [baseCourse, horizons, semesterData, skippedDates, snapshots]);

  // Skips-left scoped to the next upcoming checkpoint specifically, so
  // the "Skips Left Till X" tile gives a number tied to the nearest exam
  // — not to the full semester.
  const skipsAtNextCheckpoint = useMemo(() => {
    const entry = projectionsByHorizon.find(p => p.horizon.key === nextCheckpoint?.key);
    return entry?.analytics ?? analytics;
  }, [projectionsByHorizon, nextCheckpoint, analytics]);

  const canSaveSnapshot = Boolean(
    activeCourse?.id && Number(classesTaken) > 0 && calculationData.isValid
  );

  const projectedRemainingSkips = Math.max(0, skipsAtNextCheckpoint.remainingSkips);
  const skipsToneClass =
    skipsAtNextCheckpoint.remainingSkips < 0
      ? 'text-danger'
      : skipsAtNextCheckpoint.remainingSkips <= 1
        ? 'text-warning'
        : 'text-success';

  return (
    <Motion.div
      key="planner"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >
      {/* Header + 4 hero tiles */}
      <section className="grid gap-6 border-b border-border-faint pb-8 lg:grid-cols-[0.85fr_1.15fr]">
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
          {isGuest ? (
            <p className="mt-3 text-[11px] text-text-muted">
              Guest preview — values aren't saved between visits.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-border-faint border-y border-border-faint">
          {/* Tile 1 — Current */}
          <div className="px-4 py-5">
            <p className="eyebrow-label">Current</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {analytics.currentAttendance}%
            </p>
            <p className="mt-1 text-[11px] text-text-muted">present status</p>
          </div>

          {/* Tile 2 — Projected at all checkpoints (mini-table) */}
          <div className="px-4 py-5">
            <p className="eyebrow-label">Projected</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {projectionsByHorizon.map(({ horizon, analytics: a }) => {
                const onTrack = a.projectedAttendance >= MIN_ATTENDANCE;
                return (
                  <li
                    key={horizon.key}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                      {horizon.label}
                    </span>
                    {horizon.isPast ? (
                      <span className="text-[11px] text-text-muted">(passed)</span>
                    ) : (
                      <span
                        className={`inline-flex items-baseline gap-1 font-mono text-sm font-semibold ${
                          onTrack ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {a.projectedAttendance.toFixed(1)}%
                        <StatusGlyph tone={onTrack ? 'success' : 'warning'} size={11} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Tile 3 — Risk verdict + Why toggle */}
          <div className="px-4 py-5">
            <p className="eyebrow-label">Risk</p>
            <p
              className={`mt-2 inline-flex items-center gap-2 font-display text-3xl font-semibold ${
                riskTone[analytics.riskLabel]
              }`}
            >
              <StatusGlyph tone={riskGlyphTone[analytics.riskLabel]} size={20} />
              {analytics.riskLabel}
            </p>
            <button
              type="button"
              onClick={() => setWhyOpen(value => !value)}
              aria-expanded={whyOpen}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-accent"
            >
              <Motion.span
                animate={{ rotate: whyOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <ChevronDown size={11} />
              </Motion.span>
              Why this verdict?
            </button>
          </div>

          {/* Tile 4 — Skips left till next checkpoint */}
          <div className="px-4 py-5">
            <p className="eyebrow-label">
              Skips Left{nextCheckpoint ? ` Till ${nextCheckpoint.label}` : ''}
            </p>
            <p className={`mt-2 font-display text-3xl font-semibold ${skipsToneClass}`}>
              {projectedRemainingSkips}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {analytics.plannedSkipCount > 0
                ? `${analytics.plannedSkipCount} planned · stays ≥ ${MIN_ATTENDANCE}%`
                : `stays ≥ ${MIN_ATTENDANCE}%`}
            </p>
          </div>
        </div>
      </section>

      {/* Inline recovery hint — only when relevant */}
      {analytics.recoveryClassesNeeded > 0 ? (
        <section className="-mt-4">
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">
              {analytics.isRecoveryImpossible
                ? 'Recovery not possible within remaining schedule.'
                : `Attend the next ${analytics.recoveryClassesNeeded} class${
                    analytics.recoveryClassesNeeded === 1 ? '' : 'es'
                  } before planning any skip.`}
            </span>
          </p>
        </section>
      ) : null}

      {/* "Why this verdict?" expandable */}
      <AnimatePresence initial={false}>
        {whyOpen ? (
          <Motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <WhyVerdictPanel analytics={analytics} />
          </Motion.section>
        ) : null}
      </AnimatePresence>

      {/* Forecast — single line, OR sign-in nudge for guests */}
      <section className="border-y border-border-faint py-4">
        {isGuest ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Statistical Forecast</p>
              <p className="mt-1 text-sm text-text-secondary">
                Sign in to see your end-of-semester forecast with a 95% confidence
                interval, updated as you log attendance.
              </p>
            </div>
            {onSignInRequest ? (
              <button
                type="button"
                onClick={onSignInRequest}
                className="primary-button"
              >
                Sign in →
              </button>
            ) : null}
          </div>
        ) : analytics.forecast?.ready ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="eyebrow-label">Statistical Forecast</p>
            <p className="font-mono text-sm text-text-primary">
              <span className="font-semibold">{analytics.forecast.predicted}%</span>{' '}
              <span className="text-text-muted">
                (95% CI {analytics.forecast.low}–{analytics.forecast.high}%)
              </span>
            </p>
            <p className="text-[11px] text-text-muted">
              · {analytics.forecast.sampleSize} snapshots
            </p>
            <p
              className={`text-[11px] font-medium ${
                analytics.trend.direction === 'improving'
                  ? 'text-success'
                  : analytics.trend.direction === 'declining'
                    ? 'text-danger'
                    : 'text-text-secondary'
              }`}
            >
              ·{' '}
              {analytics.trend.direction === 'improving'
                ? '▲ trending up'
                : analytics.trend.direction === 'declining'
                  ? '▼ trending down'
                  : '— stable'}
              {analytics.forecast.slopePerDay !== undefined
                ? ` (${analytics.forecast.slopePerDay >= 0 ? '+' : ''}${
                    analytics.forecast.slopePerDay
                  } %/day)`
                : ''}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="eyebrow-label">Statistical Forecast</p>
            <p className="text-sm text-text-secondary">
              Save {4 - (analytics.forecast?.sampleSize || 0)} more attendance
              snapshot{4 - (analytics.forecast?.sampleSize || 0) === 1 ? '' : 's'} to
              unlock the predicted % with confidence interval.
            </p>
          </div>
        )}
      </section>

      {/* Heatmap */}
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

      {/* Attendance Input + Skip Calendar */}
      <section className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-5 lg:border-r lg:border-border-faint lg:pr-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Attendance Input</p>
              <p className="mt-1.5 text-xs text-text-muted">
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-default text-text-muted transition-colors hover:border-border-strong hover:bg-subtle hover:text-text-primary"
              title="Clear fields"
              aria-label="Clear fields"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Classes conducted so far
              </span>
              <input
                type="number"
                min="0"
                max="999"
                value={classesTaken}
                onChange={event => setClassesTaken(event.target.value)}
                className="w-full border border-border-default bg-subtle px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                placeholder="42"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Classes attended
              </span>
              <input
                type="number"
                min="0"
                max="999"
                value={classesAttended}
                onChange={event => setClassesAttended(event.target.value)}
                className="w-full border border-border-default bg-subtle px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                placeholder="36"
              />
            </label>
          </div>

          {!calculationData.isValid ? (
            <div className="border border-danger bg-danger-dim px-3 py-2 text-xs text-danger">
              Attended classes cannot be greater than total classes.
            </div>
          ) : null}

          <div className="border-t border-border-faint pt-3">
            <p className="eyebrow-label">Recommendation</p>
            <p className="mt-1.5 text-xs text-text-secondary">{analytics.recommendation}</p>
          </div>

          {canSaveSnapshot ? (
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
              <Save size={11} />
              Trend snapshots save automatically when attendance changes.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow-label">Skip Calendar</p>
              <h3 className="mt-1 text-2xl font-semibold">Plan future absences</h3>
            </div>
            <div className="flex items-center gap-3">
              <SavedPulse trigger={JSON.stringify(skippedDates)} />
              <PlannedSkipPill skippedDates={skippedDates} />
            </div>
          </div>

          <CalendarPlanner
            classDates={remainingClassDates}
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
