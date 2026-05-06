import React, { useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, RefreshCcw } from 'lucide-react';

import SavedCheck from './SavedCheck.jsx';
import { getClassDatesBetween } from '../utils/attendanceAnalytics.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDateChip = isoKey => {
  const date = new Date(`${isoKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoKey;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatRelativeFromNow = isoString => {
  if (!isoString) return null;
  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return null;
  const diffDays = Math.floor((Date.now() - then.getTime()) / DAY_MS);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const oldestLastUpdated = courses => {
  let oldest = null;
  (courses || []).forEach(course => {
    const ts = course?.lastUpdated ? new Date(course.lastUpdated).getTime() : null;
    if (Number.isFinite(ts) && (oldest === null || ts < oldest)) {
      oldest = ts;
    }
  });
  return oldest ? new Date(oldest).toISOString() : null;
};

// Build the per-course working state. For each course we compute:
//   - candidateDates: slot class days between lastUpdated and today
//   - autoTaken     : last classesTaken + candidateDates.length
//   - autoAttended  : last classesAttended + candidateDates.length (assume
//                    all attended; student decreases if they missed any)
const buildRows = ({ courses, semesterData }) => {
  const today = new Date();
  return (courses || []).map(course => {
    const lastUpdated = course?.lastUpdated ? new Date(course.lastUpdated) : null;
    const validLast = lastUpdated && !Number.isNaN(lastUpdated.getTime()) ? lastUpdated : null;
    const candidateDates = validLast
      ? getClassDatesBetween(
          course.slotDays,
          semesterData?.academicCalendar,
          validLast,
          today
        )
      : [];
    const lastTaken = Number(course.classesTaken) || 0;
    const lastAttended = Number(course.classesAttended) || 0;
    const newClasses = candidateDates.length;
    const autoTaken = lastTaken + newClasses;
    const autoAttended = lastAttended + newClasses;
    return {
      courseId: course.id,
      courseName: course.courseName || course.slotLabel,
      slotLabel: course.slotLabel,
      lastTaken,
      lastAttended,
      candidateDates,
      newClasses,
      taken: String(autoTaken),
      attended: String(autoAttended),
      pickedCancelled: [], // dates the student marked as cancelled (taken decreased)
      pickedMissed: [], // dates the student marked as missed (attended decreased)
    };
  });
};

const UpdateAttendanceStrip = ({ courses = [], semesterData, onBulkUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rows, setRows] = useState(() => buildRows({ courses, semesterData }));
  const [savingState, setSavingState] = useState('idle'); // idle | saving | saved | error

  const totalNewClasses = useMemo(
    () => rows.reduce((acc, row) => acc + row.newClasses, 0),
    [rows]
  );
  const oldestUpdate = useMemo(() => oldestLastUpdated(courses), [courses]);
  const oldestRelative = formatRelativeFromNow(oldestUpdate);

  const handleExpand = () => {
    if (!isExpanded) {
      setRows(buildRows({ courses, semesterData }));
      setSavingState('idle');
    }
    setIsExpanded(prev => !prev);
  };

  const handleReset = () => {
    setRows(buildRows({ courses, semesterData }));
    setSavingState('idle');
  };

  const updateRow = (courseId, patch) => {
    setRows(previous =>
      previous.map(row => (row.courseId === courseId ? { ...row, ...patch } : row))
    );
    if (savingState === 'saved') setSavingState('idle');
  };

  const toggleMissedDate = (courseId, dateKey) => {
    setRows(previous =>
      previous.map(row => {
        if (row.courseId !== courseId) return row;
        const has = row.pickedMissed.includes(dateKey);
        const nextPicked = has
          ? row.pickedMissed.filter(d => d !== dateKey)
          : [...row.pickedMissed, dateKey];
        return { ...row, pickedMissed: nextPicked };
      })
    );
  };

  const toggleCancelledDate = (courseId, dateKey) => {
    setRows(previous =>
      previous.map(row => {
        if (row.courseId !== courseId) return row;
        const has = row.pickedCancelled.includes(dateKey);
        const nextPicked = has
          ? row.pickedCancelled.filter(d => d !== dateKey)
          : [...row.pickedCancelled, dateKey];
        // If a date was being marked as missed, drop it from missed when
        // it gets newly marked as cancelled — a class can't be both.
        const nextMissed = has
          ? row.pickedMissed
          : row.pickedMissed.filter(d => d !== dateKey);
        return { ...row, pickedCancelled: nextPicked, pickedMissed: nextMissed };
      })
    );
  };

  const skipMissedPicker = courseId => {
    setRows(previous =>
      previous.map(row => (row.courseId === courseId ? { ...row, pickedMissed: [] } : row))
    );
  };

  const skipCancelledPicker = courseId => {
    setRows(previous =>
      previous.map(row => (row.courseId === courseId ? { ...row, pickedCancelled: [] } : row))
    );
  };

  // Per-row validation across three deltas:
  //   newClasses    = candidate slot class days since last update (auto)
  //   newTaken      = how many of those the student says actually happened
  //   newAttended   = how many of those they attended
  // From these we derive:
  //   cancelledDelta = newClasses - newTaken    (taken below auto → cancelled)
  //   missedDelta    = newTaken - newAttended   (attended below taken → missed)
  // Each delta has its own optional picker. Empty picks = "skip this",
  // partial picks = soft error.
  const rowDiagnostics = rows.map(row => {
    const taken = Number(row.taken);
    const attended = Number(row.attended);
    const takenValid = Number.isFinite(taken) && taken >= row.lastTaken;
    const attendedValid =
      Number.isFinite(attended) && attended >= 0 && attended <= taken;
    const newTaken = takenValid ? taken - row.lastTaken : 0;
    const newAttended = attendedValid ? attended - row.lastAttended : 0;
    const cancelledDelta = Math.max(0, row.newClasses - newTaken);
    const missedDelta = Math.max(0, newTaken - newAttended);

    const cancelledPicked = row.pickedCancelled.length;
    const missedPicked = row.pickedMissed.length;
    const needsCancelledPicker =
      cancelledDelta > 0 && row.candidateDates.length > 0;
    const needsMissedPicker = missedDelta > 0 && row.candidateDates.length > 0;

    // Missed-picker candidates exclude already-picked cancelled dates so
    // a single date can never be marked both. The remaining candidate
    // count gates the missed delta — if cancelled-picker is incomplete we
    // can't know which dates are still on the table.
    const missedCandidates = row.candidateDates.filter(
      d => !row.pickedCancelled.includes(d)
    );

    const cancelledMismatch =
      needsCancelledPicker && cancelledPicked > 0 && cancelledPicked !== cancelledDelta;
    const missedMismatch =
      needsMissedPicker && missedPicked > 0 && missedPicked !== missedDelta;

    let formattedError = null;
    if (!takenValid) {
      formattedError = `Total can't be lower than ${row.lastTaken}.`;
    } else if (!attendedValid) {
      formattedError = 'Attended must be between 0 and total.';
    } else if (cancelledMismatch) {
      formattedError = `You said ${cancelledDelta} cancelled but picked ${cancelledPicked}.`;
    } else if (missedMismatch) {
      formattedError = `You said ${missedDelta} missed but picked ${missedPicked}.`;
    }

    return {
      ...row,
      taken,
      attended,
      newTaken,
      newAttended,
      cancelledDelta,
      missedDelta,
      needsCancelledPicker,
      needsMissedPicker,
      missedCandidates,
      error: formattedError,
    };
  });

  const hasErrors = rowDiagnostics.some(r => r.error);
  const hasNewData = rowDiagnostics.some(
    r => r.newTaken > 0 || r.newAttended > 0 || r.taken !== r.lastTaken || r.attended !== r.lastAttended
  );

  const handleSave = async () => {
    if (hasErrors || !hasNewData || savingState === 'saving') return;
    setSavingState('saving');
    try {
      const payload = rowDiagnostics
        .filter(r => r.taken !== r.lastTaken || r.attended !== r.lastAttended)
        .map(r => ({
          courseId: r.courseId,
          classesTaken: r.taken,
          classesAttended: r.attended,
          // Save precise dates only if the picker count matches exactly.
          // Partial picks would imply we know SOME of the misses but the
          // count wouldn't reconcile — instead the student either commits
          // (full picks) or opts out (skip this → empty array → totals only).
          missedDates: r.pickedMissed.length === r.missedDelta ? r.pickedMissed : [],
          cancelledDates:
            r.pickedCancelled.length === r.cancelledDelta ? r.pickedCancelled : [],
        }));
      if (payload.length > 0 && typeof onBulkUpdate === 'function') {
        await onBulkUpdate(payload);
      }
      setSavingState('saved');
      setIsExpanded(false);
      // Refresh rows so the next expansion uses the new lastTaken values.
      setTimeout(() => setRows(buildRows({ courses, semesterData })), 50);
    } catch (err) {
      console.error('Bulk attendance update failed:', err);
      setSavingState('error');
    }
  };

  if (!Array.isArray(courses) || courses.length === 0) {
    return null;
  }

  const summaryLine =
    totalNewClasses === 0
      ? 'No new class days since your last update — totals are current.'
      : `${totalNewClasses} new class day${totalNewClasses === 1 ? '' : 's'} since your last update.`;

  return (
    <div className="border-t border-border-faint">
      <button
        type="button"
        onClick={handleExpand}
        className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-elevated"
        aria-expanded={isExpanded}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">
            Update attendance
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {oldestRelative ? `Last update: ${oldestRelative} · ` : ''}
            {summaryLine}
          </p>
        </div>
        {savingState === 'saved' ? (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <SavedCheck size={11} /> Saved
          </span>
        ) : null}
        <Motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-text-muted"
        >
          <ChevronDown size={16} />
        </Motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border-faint py-3">
              {rowDiagnostics.map(row => {
                return (
                  <div
                    key={row.courseId}
                    className="rounded border border-border-faint bg-elevated p-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {row.courseName}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          <span className="font-mono">{row.slotLabel}</span>
                          <span className="mx-1.5">·</span>
                          last {row.lastTaken}/{row.lastAttended}
                          {row.newClasses > 0 ? (
                            <>
                              <span className="mx-1.5">·</span>
                              <span className="text-accent">+{row.newClasses} class day{row.newClasses === 1 ? '' : 's'}</span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-text-muted">
                          Total
                          <input
                            type="number"
                            inputMode="numeric"
                            min={row.lastTaken}
                            value={row.taken}
                            onChange={e => updateRow(row.courseId, { taken: e.target.value })}
                            className="field-input w-16 px-2 py-1 text-center font-mono text-sm"
                          />
                        </label>
                        <span className="text-text-muted">/</span>
                        <label className="flex items-center gap-1 text-[11px] text-text-muted">
                          Attended
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={row.taken}
                            value={row.attended}
                            onChange={e => updateRow(row.courseId, { attended: e.target.value })}
                            className="field-input w-16 px-2 py-1 text-center font-mono text-sm"
                          />
                        </label>
                      </div>
                    </div>

                    {row.needsCancelledPicker ? (
                      <div className="mt-3 border-t border-border-faint pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] text-text-secondary">
                            <span className="font-medium text-text-primary">
                              {row.cancelledDelta} class{row.cancelledDelta === 1 ? '' : 'es'} cancelled.
                            </span>{' '}
                            <span className="text-text-muted">Optional — tap which one{row.cancelledDelta === 1 ? '' : 's'}, or skip.</span>{' '}
                            <span className="text-text-muted">selected {row.pickedCancelled.length} of {row.cancelledDelta}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => skipCancelledPicker(row.courseId)}
                            className="text-[11px] text-text-muted underline-offset-2 hover:text-accent hover:underline"
                          >
                            skip this →
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.candidateDates.map(dateKey => {
                            const isPicked = row.pickedCancelled.includes(dateKey);
                            return (
                              <button
                                key={dateKey}
                                type="button"
                                aria-pressed={isPicked}
                                onClick={() => toggleCancelledDate(row.courseId, dateKey)}
                                className={`rounded px-2 py-1 text-[11px] font-mono transition-colors ${
                                  isPicked
                                    ? 'bg-text-muted text-white'
                                    : 'border border-border-faint bg-surface text-text-secondary hover:border-border-strong'
                                }`}
                                style={
                                  isPicked
                                    ? { backgroundColor: 'var(--text-muted)', color: 'white' }
                                    : undefined
                                }
                              >
                                {formatDateChip(dateKey)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {row.needsMissedPicker ? (
                      <div className="mt-3 border-t border-border-faint pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] text-text-secondary">
                            <span className="font-medium text-text-primary">
                              {row.missedDelta} class{row.missedDelta === 1 ? '' : 'es'} missed.
                            </span>{' '}
                            <span className="text-text-muted">Optional — tap which one{row.missedDelta === 1 ? '' : 's'}, or skip.</span>{' '}
                            <span className="text-text-muted">selected {row.pickedMissed.length} of {row.missedDelta}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => skipMissedPicker(row.courseId)}
                            className="text-[11px] text-text-muted underline-offset-2 hover:text-accent hover:underline"
                          >
                            skip this →
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.missedCandidates.map(dateKey => {
                            const isPicked = row.pickedMissed.includes(dateKey);
                            return (
                              <button
                                key={dateKey}
                                type="button"
                                aria-pressed={isPicked}
                                onClick={() => toggleMissedDate(row.courseId, dateKey)}
                                className={`rounded px-2 py-1 text-[11px] font-mono transition-colors ${
                                  isPicked
                                    ? 'bg-danger text-white'
                                    : 'border border-border-faint bg-surface text-text-secondary hover:border-border-strong'
                                }`}
                              >
                                {formatDateChip(dateKey)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {row.error ? (
                      <p className="mt-2 text-[11px] text-danger">{row.error}</p>
                    ) : null}
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent"
                >
                  <RefreshCcw size={12} /> Reset to suggested
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="ghost-button px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={hasErrors || !hasNewData || savingState === 'saving'}
                    className="primary-button px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {savingState === 'saving' ? 'Saving…' : 'Save all updates'}
                  </button>
                </div>
              </div>
              {savingState === 'error' ? (
                <p className="text-[11px] text-danger">
                  Couldn't save. Check connection and try again.
                </p>
              ) : null}
            </div>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default UpdateAttendanceStrip;
