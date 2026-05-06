import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';

import AttendanceHeatmap from './AttendanceHeatmap.jsx';
import StatusGlyph from './StatusGlyph.jsx';
import {
  buildDashboardSummary,
  calculateAttendanceAnalytics,
} from '../utils/attendanceAnalytics.js';
import { buildProjectionHorizons } from '../utils/projectionHorizons.js';
import { MIN_ATTENDANCE } from '../data/constants.js';

const getCourseSnapshots = (snapshots, courseId) =>
  (Array.isArray(snapshots) ? snapshots : []).filter(snapshot => snapshot.courseId === courseId);

const getSemesterProgress = semesterData => {
  const calendar = semesterData?.academicCalendar || [];
  const commencement = calendar.find(
    event => typeof event.name === 'string' && /commencement/i.test(event.name)
  );
  const fallbackStart = calendar.find(event => event.type === 'academic' && event.date);
  const startEvent = commencement || fallbackStart;
  const startDate = startEvent?.date ? new Date(`${startEvent.date}T00:00:00`) : null;
  const endDate = semesterData?.lastInstructionalDay;
  if (!startDate || !endDate) return 0;
  const total = endDate - startDate;
  const elapsed = new Date() - startDate;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
};

const Sparkline = ({ snapshots }) => {
  const validSnapshots = (snapshots || []).filter(snapshot =>
    Number(snapshot.attendancePercentage) > 0
  );
  if (validSnapshots.length < 2) {
    return (
      <div className="flex h-6 w-24 items-center justify-center rounded-sm bg-border-faint px-1 text-center text-[9px] uppercase tracking-wider text-text-muted opacity-50">
        Need 2+ snapshots
      </div>
    );
  }
  const width = 96;
  const height = 24;
  const padding = 2;
  const values = validSnapshots.map(snapshot => Number(snapshot.attendancePercentage));
  const min = Math.max(0, Math.min(...values) - 5);
  const max = Math.min(100, Math.max(...values) + 5);
  const range = max - min === 0 ? 1 : max - min;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
  const isImproving = values[values.length - 1] >= values[0];
  const strokeColor = isImproving ? 'var(--green)' : 'var(--red)';
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        style={{ stroke: strokeColor }}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Compute projected attendance at each checkpoint by overriding the
// semester end date with the checkpoint date, then reading projected %
// out of the engine. Past checkpoints render as muted "(passed)" cells.
const buildCheckpointTable = ({ courses, semesterData, snapshotsByCourse }) => {
  const horizons = buildProjectionHorizons(semesterData);
  if (horizons.length === 0 || courses.length === 0) {
    return { horizons: [], rows: [] };
  }
  const rows = courses.map(course => {
    const cells = horizons.map(horizon => {
      const semesterAtCheckpoint = {
        ...semesterData,
        lastInstructionalDay: horizon.date,
      };
      const analytics = calculateAttendanceAnalytics({
        course,
        semester: semesterAtCheckpoint,
        snapshots: snapshotsByCourse[course.id] || [],
      });
      return {
        horizonKey: horizon.key,
        projected: analytics.projectedAttendance,
        onTrack: analytics.projectedAttendance >= MIN_ATTENDANCE,
        isPast: horizon.isPast,
      };
    });
    return { course, cells };
  });
  return { horizons, rows };
};

// Skip budget per course: how many absences the threshold permits across
// the full semester, how many have been used, how many remain.
const buildSkipBudget = ({ course, analytics }) => {
  const taken = Number(course.classesTaken) || 0;
  const remaining = analytics.remainingClasses;
  const total = taken + remaining;
  const allowed = Math.floor(total * (1 - MIN_ATTENDANCE / 100));
  const used = Math.max(0, taken - (Number(course.classesAttended) || 0));
  const remainingSkips = allowed - used - (analytics.plannedSkipCount || 0);
  return {
    allowed,
    used,
    plannedAhead: analytics.plannedSkipCount || 0,
    remainingSkips,
    overBudget: remainingSkips < 0,
  };
};

// Risk drift timeline: derive the risk label at each snapshot's percentage
// using the same threshold logic the formula label uses. Renders one dot
// per snapshot in chronological order so the student sees the colour arc.
const labelColorForPct = pct => {
  if (!Number.isFinite(pct)) return 'var(--border-faint)';
  if (pct >= MIN_ATTENDANCE) return 'var(--green)';
  if (pct >= MIN_ATTENDANCE - 5) return 'var(--amber)';
  return 'var(--red)';
};

export default function InsightsScreen({ courses, semesterData, snapshots }) {
  const snapshotsByCourse = useMemo(
    () =>
      Object.fromEntries(
        (courses || []).map(course => [course.id, getCourseSnapshots(snapshots, course.id)])
      ),
    [courses, snapshots]
  );

  const summary = useMemo(
    () =>
      buildDashboardSummary({
        courses,
        semester: semesterData,
        snapshotsByCourse,
      }),
    [courses, semesterData, snapshotsByCourse]
  );

  const trajectory = useMemo(() => {
    const improving = summary.courseAnalytics.filter(
      item => item.analytics.trend.direction === 'improving'
    ).length;
    const declining = summary.courseAnalytics.filter(
      item => item.analytics.trend.direction === 'declining'
    ).length;
    if (improving > declining) return 'Trending Upward';
    if (declining > improving) return 'Trending Downward';
    return 'Stable';
  }, [summary.courseAnalytics]);

  const trajectoryClass =
    trajectory === 'Trending Upward'
      ? 'text-success'
      : trajectory === 'Trending Downward'
        ? 'text-danger'
        : 'text-text-primary';

  const progress = getSemesterProgress(semesterData);
  const highestRisk = summary.highestRiskCourse;

  const checkpointTable = useMemo(
    () => buildCheckpointTable({ courses: courses || [], semesterData, snapshotsByCourse }),
    [courses, semesterData, snapshotsByCourse]
  );

  return (
    <div className="space-y-10">
      {/* Section 1 — Overview */}
      <section className="grid gap-6 border-b border-border-faint pb-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="eyebrow-label">Insights</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-text-primary sm:text-3xl lg:text-4xl">
            Attendance risk, recovery pressure, and semester progress in one view.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border-faint pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="eyebrow-label">Average</p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {summary.averageAttendance.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="eyebrow-label">Semester</p>
            <p className="mt-1 font-display text-3xl font-semibold">{progress}%</p>
          </div>
          <div>
            <p className="eyebrow-label">Warning</p>
            <p className="mt-1 font-display text-3xl font-semibold text-warning">
              {summary.warningCourses}
            </p>
          </div>
          <div>
            <p className="eyebrow-label">Critical</p>
            <p className="mt-1 font-display text-3xl font-semibold text-danger">
              {summary.criticalCourses}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 border-b border-border-faint pb-8 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="eyebrow-label">Highest Risk</p>
          <p className="mt-2 truncate text-xl font-semibold text-text-primary sm:text-2xl">
            {highestRisk?.course?.courseName || highestRisk?.course?.slotLabel || 'No course data'}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            {highestRisk
              ? highestRisk.analytics.recommendation
              : 'Add a course and attendance values to start risk forecasting.'}
          </p>
          <div className="mt-4 h-1.5 max-w-md bg-subtle">
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full bg-accent"
            />
          </div>
          <p className="mt-1 text-[11px] text-text-muted">{progress}% of semester elapsed</p>
        </div>
        <div className="hidden flex-col gap-2 text-right md:flex">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">
            Global trajectory
          </p>
          <p className={`text-xl font-semibold ${trajectoryClass}`}>{trajectory}</p>
        </div>
      </section>

      {/* Section 2 — Checkpoint Projections */}
      {checkpointTable.horizons.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="eyebrow-label">Checkpoint Projections</p>
            <h3 className="mt-1 text-2xl font-semibold">Where you'll land at each milestone</h3>
            <p className="mt-1 text-sm text-text-muted">
              Each cell projects attendance at that exam checkpoint, given current totals
              and your planned skips.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-faint">
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    Course
                  </th>
                  {checkpointTable.horizons.map(h => (
                    <th
                      key={h.key}
                      className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted"
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checkpointTable.rows.map(({ course, cells }) => (
                  <tr key={course.id} className="border-b border-border-faint">
                    <td className="px-3 py-2.5 text-text-primary">
                      <span className="font-medium">{course.courseName || course.slotLabel}</span>
                      <span className="ml-2 font-mono text-[11px] text-text-muted">
                        {course.slotLabel}
                      </span>
                    </td>
                    {cells.map(cell => (
                      <td
                        key={cell.horizonKey}
                        className="px-3 py-2.5 text-right font-mono"
                      >
                        {cell.isPast ? (
                          <span className="text-[11px] text-text-muted">(passed)</span>
                        ) : (
                          <span
                            className={`inline-flex items-baseline gap-1 ${
                              cell.onTrack ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {cell.projected.toFixed(1)}%
                            <StatusGlyph
                              tone={cell.onTrack ? 'success' : 'warning'}
                              size={11}
                            />
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Section 3 — Skip Budget */}
      {summary.courseAnalytics.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="eyebrow-label">Skip Budget</p>
            <h3 className="mt-1 text-2xl font-semibold">What you can still afford</h3>
            <p className="mt-1 text-sm text-text-muted">
              The {MIN_ATTENDANCE}% threshold permits a fixed number of absences per course.
              Used = past misses, remaining = how many more you can take.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.courseAnalytics.map(({ course, analytics }) => {
              const budget = buildSkipBudget({ course, analytics });
              const usedPct = budget.allowed > 0
                ? Math.min(100, (budget.used / budget.allowed) * 100)
                : 0;
              const tone = budget.overBudget
                ? 'var(--red)'
                : budget.remainingSkips <= 3
                  ? 'var(--amber)'
                  : 'var(--green)';
              return (
                <div
                  key={course.id}
                  className="border border-border-faint bg-surface p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {course.courseName || course.slotLabel}
                    </p>
                    <p className="font-mono text-[11px] text-text-muted">
                      {budget.used}/{budget.allowed} used
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden bg-subtle">
                    <div
                      className="h-full"
                      style={{ width: `${usedPct}%`, backgroundColor: tone }}
                    />
                  </div>
                  <p className="mt-2 text-[11px]">
                    {budget.overBudget ? (
                      <span className="text-danger">
                        Over budget by {Math.abs(budget.remainingSkips)}
                      </span>
                    ) : (
                      <span className="text-text-secondary">
                        <span className="font-mono">{budget.remainingSkips}</span> skip
                        {budget.remainingSkips === 1 ? '' : 's'} remaining
                        {budget.plannedAhead > 0 ? (
                          <span className="text-text-muted">
                            {' '}
                            (after {budget.plannedAhead} planned)
                          </span>
                        ) : null}
                      </span>
                    )}
                  </p>
                  {analytics.recoveryClassesNeeded > 0 ? (
                    <p className="mt-1 text-[11px] text-text-muted">
                      {analytics.isRecoveryImpossible
                        ? 'Recovery not possible in remaining schedule.'
                        : `Skip next class → attend ${
                            analytics.recoveryClassesNeeded + 1
                          } in a row to recover.`}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Section 4 — Forecast */}
      {summary.courseAnalytics.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="eyebrow-label">Forecast</p>
            <h3 className="mt-1 text-2xl font-semibold">Predicted final attendance</h3>
            <p className="mt-1 text-sm text-text-muted">
              Linear regression over snapshot timeseries plus an EWMA-smoothed current
              reading, with a 95% confidence interval from residual standard deviation.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {summary.courseAnalytics.map(({ course, analytics }) => {
              const f = analytics.forecast;
              const direction = analytics.trend.direction;
              const directionTone =
                direction === 'improving'
                  ? 'text-success'
                  : direction === 'declining'
                    ? 'text-danger'
                    : 'text-text-secondary';
              return (
                <div
                  key={course.id}
                  className="flex items-center justify-between gap-4 border border-border-faint bg-surface p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {course.courseName || course.slotLabel}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Now <span className="font-mono">{analytics.currentAttendance}%</span>
                      {f?.ready ? (
                        <>
                          {' '}
                          → forecast{' '}
                          <span className="font-mono text-text-primary">
                            {f.predicted}%
                          </span>{' '}
                          <span className="text-text-muted">
                            (CI {f.low}–{f.high}%)
                          </span>
                        </>
                      ) : (
                        <span className="text-text-muted">
                          {' '}
                          · forecast {f?.sampleSize || 0}/4 snapshots
                        </span>
                      )}
                    </p>
                    <p className={`mt-1 text-[11px] ${directionTone}`}>
                      {direction === 'improving'
                        ? '▲ Trending up'
                        : direction === 'declining'
                          ? '▼ Trending down'
                          : '— Stable'}
                    </p>
                  </div>
                  <Sparkline snapshots={snapshotsByCourse[course.id]} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Section 5 — Historical Pattern */}
      {summary.courseAnalytics.length > 0 ? (
        <section className="space-y-6">
          <div>
            <p className="eyebrow-label">Historical Pattern</p>
            <h3 className="mt-1 text-2xl font-semibold">How your situation has unfolded</h3>
          </div>

          {/* Sub 1 — Risk band per snapshot */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">
                Risk band per snapshot
              </p>
              <p className="text-[11px] text-text-muted">
                Each dot is one saved reading — green ≥ 75%, amber 70–74%, red below.
              </p>
            </div>
            <div className="space-y-2 border border-border-faint bg-surface p-4">
              {summary.courseAnalytics.map(({ course }) => {
                const courseSnaps = snapshotsByCourse[course.id] || [];
                return (
                  <div key={course.id} className="flex items-center gap-3">
                    <p className="w-48 shrink-0 truncate text-[11px] text-text-secondary">
                      {course.courseName || course.slotLabel}
                    </p>
                    <div className="flex flex-1 items-center gap-1 overflow-x-auto">
                      {courseSnaps.length === 0 ? (
                        <span className="text-[10px] text-text-muted">
                          No snapshots yet
                        </span>
                      ) : (
                        courseSnaps.map((snap, idx) => (
                          <span
                            key={`${course.id}-${idx}`}
                            title={`${new Date(snap.createdAt).toLocaleDateString()} · ${
                              Number(snap.attendancePercentage).toFixed(1)
                            }%`}
                            className="inline-block h-2.5 w-2.5 shrink-0"
                            style={{
                              backgroundColor: labelColorForPct(
                                Number(snap.attendancePercentage)
                              ),
                              borderRadius: 999,
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub 2 — Weekly attendance heatmap */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">
                Weekly attendance
              </p>
              <p className="text-[11px] text-text-muted">
                End-of-week % per course. Dashed cells = no snapshot logged that week.
              </p>
            </div>
            <AttendanceHeatmap
              courses={courses || []}
              snapshots={snapshots || []}
              semesterData={semesterData}
            />
          </div>
        </section>
      ) : null}

      {/* Section 6 — The Engine (thesis justification) */}
      <section className="space-y-3 border-t border-border-faint pt-8">
        <div>
          <p className="eyebrow-label">The Engine</p>
          <h3 className="mt-1 text-2xl font-semibold">Under the hood</h3>
          <p className="mt-1 text-sm text-text-muted">
            What the slot-aware risk engine and statistical forecaster do for every
            verdict you see.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="border border-border-faint bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">
              Risk classification
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              CART decision tree (gini, depth 4) over five features: current %,
              projected %, skip buffer, recovery pressure, trend bucket. Trained on
              hand-labelled edge cases; runs alongside a weighted formula score and
              a defensive worst-label-wins ensemble.
            </p>
          </div>
          <div className="border border-border-faint bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">
              Forecast
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Linear regression over (days, attendance %) snapshot points,
              extrapolated to the last instructional day. EWMA (α = 0.4) smooths the
              current reading. 95% confidence band derived from residual standard
              deviation (z = 1.96).
            </p>
          </div>
          <div className="border border-border-faint bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">
              Slot enumeration
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Every projection counts only real class days for your slot —
              honouring holidays, exam blocks, and your planned skips. Recovery
              probe iterates up to 300 hypothetical attended classes before flagging
              a course as impossible to recover.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
