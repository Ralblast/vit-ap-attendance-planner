import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { ChevronRight, Clock } from 'lucide-react';

import { calculateAttendanceAnalytics } from '../utils/attendanceAnalytics.js';
import { daysUntil, getNextCheckpoint } from '../utils/projectionHorizons.js';
import { MIN_ATTENDANCE } from '../data/constants.js';

const formatHorizonDate = date => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatHorizonCountdown = days => {
  if (days === null || days === undefined) return '';
  if (days < 0) return 'passed';
  if (days === 0) return 'today';
  if (days === 1) return 'in 1 day';
  return `in ${days} days`;
};

const formatLastUpdated = lastUpdated => {
  if (!lastUpdated) return null;
  const then = new Date(lastUpdated);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / day);
  if (diffDays <= 0) return 'updated today';
  if (diffDays === 1) return 'updated 1 day ago';
  if (diffDays < 30) return `updated ${diffDays} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Renders the verdict header + per-course projection rows for the next
// upcoming exam-eligibility checkpoint. Pure presentation: all math is
// delegated to calculateAttendanceAnalytics so it stays consistent with
// the per-course planner view.
const ExamHorizonPanel = ({ courses = [], snapshotsByCourse = {}, semesterData, onOpenCourse }) => {
  const checkpoint = useMemo(() => getNextCheckpoint(semesterData), [semesterData]);
  const days = checkpoint ? daysUntil(checkpoint.date) : null;
  const isFinalOutcome = checkpoint?.isPast;

  const rows = useMemo(() => {
    if (!checkpoint) return [];
    // Override the semester end with the checkpoint date so projection +
    // remaining-classes counts reflect "by this exam" rather than "by end
    // of semester". skippedDates are kept as-is — they're real planned
    // skips the student committed to.
    const semesterAtCheckpoint = {
      ...semesterData,
      lastInstructionalDay: checkpoint.date,
    };
    return (Array.isArray(courses) ? courses : []).map(course => {
      const analytics = calculateAttendanceAnalytics({
        course,
        semester: semesterAtCheckpoint,
        snapshots: snapshotsByCourse[course.id] || [],
      });
      const isOnTrack = analytics.projectedAttendance >= MIN_ATTENDANCE;
      return { course, analytics, isOnTrack };
    });
  }, [checkpoint, courses, semesterData, snapshotsByCourse]);

  if (!checkpoint || rows.length === 0) {
    return null;
  }

  const onTrackCount = rows.filter(row => row.isOnTrack).length;
  const atRiskRows = rows.filter(row => !row.isOnTrack);
  const summary = isFinalOutcome
    ? `Semester finished. ${onTrackCount} of ${rows.length} courses ended above ${MIN_ATTENDANCE}%.`
    : `${onTrackCount} of ${rows.length} courses on track for ${checkpoint.label}.`;

  return (
    <Motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="border border-border-default bg-surface p-6 shadow-[0_1px_0_var(--border-faint)]"
      aria-label="Next exam checkpoint"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-faint pb-4">
        <div>
          <p className="eyebrow-label">
            {isFinalOutcome ? 'Final outcome' : 'Next checkpoint'}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-text-primary sm:text-3xl">
            {checkpoint.label}
            {!isFinalOutcome ? (
              <span className="ml-3 text-base font-normal text-text-muted">
                {formatHorizonCountdown(days)} · {formatHorizonDate(checkpoint.date)}
              </span>
            ) : (
              <span className="ml-3 text-base font-normal text-text-muted">
                {formatHorizonDate(checkpoint.date)}
              </span>
            )}
          </h2>
        </div>
        <p className="text-sm text-text-secondary">{summary}</p>
      </div>

      <ul className="mt-4 divide-y divide-border-faint">
        {rows.map(({ course, analytics, isOnTrack }) => {
          const lastUpdated = formatLastUpdated(course.lastUpdated);
          const plannedSkipCount = Array.isArray(course.skippedDates)
            ? course.skippedDates.length
            : 0;
          const verdictTone = isOnTrack ? 'text-success' : 'text-danger';
          const verdictText = isOnTrack ? '✅ on track' : '⚠ below 75%';
          return (
            <li key={course.id}>
              <button
                type="button"
                onClick={() => onOpenCourse?.(course)}
                className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-elevated"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary">
                    {course.courseName || course.slotLabel}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
                    <span className="font-mono">{course.slotLabel}</span>
                    {plannedSkipCount > 0 ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {plannedSkipCount} planned skip{plannedSkipCount === 1 ? '' : 's'}
                        </span>
                      </>
                    ) : null}
                    {lastUpdated ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} /> {lastUpdated}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-sm text-text-secondary">
                    <span className="text-text-muted">{analytics.currentAttendance.toFixed(1)}%</span>
                    <span className="mx-1.5 text-text-muted">→</span>
                    <span className={`font-semibold ${verdictTone}`}>
                      {analytics.projectedAttendance.toFixed(1)}%
                    </span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    now → at {checkpoint.label}
                  </p>
                </div>

                <div className={`shrink-0 text-xs font-medium ${verdictTone}`}>
                  {verdictText}
                </div>

                <ChevronRight
                  size={14}
                  className="shrink-0 text-text-muted"
                  aria-hidden="true"
                />
              </button>

              <div className="block pb-2 text-right font-mono text-[11px] text-text-secondary sm:hidden">
                <span className="text-text-muted">{analytics.currentAttendance.toFixed(1)}%</span>
                <span className="mx-1.5 text-text-muted">→</span>
                <span className={`font-semibold ${verdictTone}`}>
                  {analytics.projectedAttendance.toFixed(1)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {atRiskRows.length > 0 && !isFinalOutcome ? (
        <div className="mt-4 border-t border-border-faint pt-3 text-xs text-text-secondary">
          {atRiskRows.map(({ course, analytics }) => {
            const recovery = Math.max(0, analytics.recoveryClassesNeeded || 0);
            if (recovery === 0) return null;
            return (
              <p key={course.id} className="mt-1">
                <span className="font-medium text-text-primary">
                  {course.courseName || course.slotLabel}
                </span>
                {' — attend the next '}
                <span className="font-mono">{recovery}</span>
                {recovery === 1 ? ' class' : ' classes'} to clear {checkpoint.label}.
              </p>
            );
          })}
        </div>
      ) : null}
    </Motion.section>
  );
};

export default ExamHorizonPanel;
