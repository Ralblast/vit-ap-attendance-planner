import React, { useMemo } from 'react';

import AttendanceHeatmap from './AttendanceHeatmap.jsx';
import { buildDashboardSummary } from '../utils/attendanceAnalytics.js';

const getCourseSnapshots = (snapshots, courseId) =>
  (Array.isArray(snapshots) ? snapshots : []).filter(snapshot => snapshot.courseId === courseId);

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

const ForecastBadge = ({ forecast }) => {
  if (!forecast?.ready) {
    return (
      <span className="text-[10px] uppercase tracking-wider text-text-muted">
        Forecast: {forecast?.sampleSize || 0}/4 snapshots
      </span>
    );
  }

  return (
    <span className="text-[10px] uppercase tracking-wider text-text-muted">
      Forecast {forecast.predicted}% · range {forecast.low}–{forecast.high}%
    </span>
  );
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

  const behavior = useMemo(() => {
    const allSkips = (courses || []).flatMap(course =>
      Array.isArray(course.skippedDates) ? course.skippedDates : []
    );
    const skipDays = allSkips.reduce((acc, dateStr) => {
      const day = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
      if (day !== 'Invalid Date') {
        acc[day] = (acc[day] || 0) + 1;
      }
      return acc;
    }, {});

    const mostSkippedDay =
      Object.keys(skipDays).length > 0
        ? Object.keys(skipDays).sort((a, b) => skipDays[b] - skipDays[a])[0]
        : 'None';

    const totalSkipsUsed = (courses || []).reduce(
      (acc, course) =>
        acc + Math.max(0, Number(course.classesTaken || 0) - Number(course.classesAttended || 0)),
      0
    );

    const improving = summary.courseAnalytics.filter(
      item => item.analytics.trend.direction === 'improving'
    ).length;
    const declining = summary.courseAnalytics.filter(
      item => item.analytics.trend.direction === 'declining'
    ).length;
    let trajectory = 'Stable';
    if (improving > declining) {
      trajectory = 'Trending Upward';
    }
    if (declining > improving) {
      trajectory = 'Trending Downward';
    }

    return { mostSkippedDay, totalSkipsUsed, trajectory };
  }, [courses, summary.courseAnalytics]);

  const trajectoryClass =
    behavior.trajectory === 'Trending Upward'
      ? 'text-success'
      : behavior.trajectory === 'Trending Downward'
        ? 'text-danger'
        : 'text-text-primary';

  return (
    <div className="space-y-8">
      <section className="border-b border-border-faint pb-8">
        <p className="eyebrow-label">Insights</p>
        <h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em]">
          Behavioral patterns, semester heatmap, and forecasted attendance.
        </h2>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-5 lg:border-r lg:border-border-faint lg:pr-8">
          <div>
            <p className="eyebrow-label">Behavioral Analysis</p>
            <p className="mt-2 text-sm text-text-secondary">
              Skip history and snapshot velocity highlight where attention drifts.
            </p>
          </div>
          <div className="divide-y divide-border-faint border-y border-border-faint">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-muted">Global trajectory</span>
              <strong className={trajectoryClass}>{behavior.trajectory}</strong>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-muted">Most-skipped day</span>
              <strong>{behavior.mostSkippedDay}</strong>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-muted">Total skips burned</span>
              <strong>{behavior.totalSkipsUsed}</strong>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="eyebrow-label">Historical Velocity</p>
            <h3 className="mt-1 text-2xl font-semibold">Trend over time</h3>
          </div>
          <div className="space-y-4 border-y border-border-faint py-5">
            {summary.courseAnalytics.length === 0 ? (
              <p className="text-sm text-text-muted">
                Add courses and save snapshots to view velocity charts.
              </p>
            ) : (
              summary.courseAnalytics.map(({ course, analytics }) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between gap-4 rounded border border-border-faint p-4 transition-colors hover:border-border-strong hover:bg-subtle"
                >
                  <div className="min-w-0">
                    <h4 className="truncate font-semibold text-text-primary">
                      {course.courseName || course.slotLabel}
                    </h4>
                    <p className="mt-1 text-xs text-text-muted">
                      Current: {analytics.currentAttendance}% · Projected: {analytics.projectedAttendance}%
                    </p>
                    <p className="mt-1">
                      <ForecastBadge forecast={analytics.forecast} />
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="opacity-90">
                      <Sparkline snapshots={snapshotsByCourse[course.id]} />
                    </div>
                    <div className="min-w-[70px] text-right">
                      <p
                        className={`text-xl font-bold ${
                          analytics.riskLabel === 'Critical'
                            ? 'text-danger'
                            : analytics.riskLabel === 'Warning'
                              ? 'text-warning'
                              : 'text-success'
                        }`}
                      >
                        {analytics.riskScore}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-text-muted">
                        Risk score
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border-faint pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow-label">Semester Heatmap</p>
            <h3 className="mt-1 text-2xl font-semibold">Class days at a glance</h3>
            <p className="mt-1 text-sm text-text-muted">
              Each square is one weekday across the semester. Planned skips and class days are
              highlighted across all your tracked courses.
            </p>
          </div>
        </div>
        <AttendanceHeatmap courses={courses || []} semesterData={semesterData} />
      </section>
    </div>
  );
}
