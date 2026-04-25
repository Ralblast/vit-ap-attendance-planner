import React, { useMemo } from 'react';

import { buildDashboardSummary } from '../utils/attendanceAnalytics.js';

const getCourseSnapshots = (snapshots, courseId) =>
  (Array.isArray(snapshots) ? snapshots : []).filter(snapshot => snapshot.courseId === courseId);

const Sparkline = ({ snapshots }) => {
  const validSnapshots = (snapshots || []).filter(s => s.currentAttendance > 0 || s.attendancePercentage > 0);
  if (validSnapshots.length < 2) {
    return <div className="h-6 w-24 bg-border-faint rounded-sm opacity-50 flex items-center justify-center text-[9px] text-text-muted uppercase tracking-wider text-center leading-tight px-1">Need 2+<br/>Snapshots</div>;
  }
  
  const width = 96;
  const height = 24;
  const padding = 2;
  
  const values = validSnapshots.map(s => Number(s.attendancePercentage || s.currentAttendance || 0));
  const min = Math.max(0, Math.min(...values) - 5);
  const max = Math.min(100, Math.max(...values) + 5);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const isImproving = lastVal >= firstVal;
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
    const allSkips = (courses || []).flatMap(c => Array.isArray(c.skippedDates) ? c.skippedDates : []);
    const skipDays = allSkips.reduce((acc, dateStr) => {
       const day = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
       if (day !== 'Invalid Date') acc[day] = (acc[day] || 0) + 1;
       return acc;
    }, {});
    
    const mostSkippedDay = Object.keys(skipDays).length > 0 
      ? Object.keys(skipDays).sort((a,b) => skipDays[b] - skipDays[a])[0] 
      : 'None';

    const totalSkipsUsed = (courses || []).reduce((acc, c) => acc + Math.max(0, Number(c.classesTaken || 0) - Number(c.classesAttended || 0)), 0);
    
    const improving = summary.courseAnalytics.filter(item => item.analytics.trend.direction === 'improving').length;
    const declining = summary.courseAnalytics.filter(item => item.analytics.trend.direction === 'declining').length;
    let trajectory = 'Stable';
    if (improving > declining) trajectory = 'Trending Upward';
    if (declining > improving) trajectory = 'Trending Downward';

    return { mostSkippedDay, totalSkipsUsed, trajectory };
  }, [courses, summary.courseAnalytics]);

  return (
    <div className="space-y-8">
      <section className="border-b border-border-faint pb-8">
        <p className="eyebrow-label">Insights</p>
        <h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em]">
          Your behavioral patterns and historical attendance velocity.
        </h2>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-5 lg:border-r lg:border-border-faint lg:pr-8">
          <div>
            <p className="eyebrow-label">Behavioral Analysis</p>
            <p className="mt-2 text-sm text-text-secondary">
              We analyze your skip history and historical velocity to identify patterns.
            </p>
          </div>
          <div className="divide-y divide-border-faint border-y border-border-faint">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-muted">Global Trajectory</span>
              <strong className={behavior.trajectory === 'Trending Upward' ? 'text-success' : behavior.trajectory === 'Trending Downward' ? 'text-danger' : 'text-text-primary'}>
                {behavior.trajectory}
              </strong>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text-muted">Most skipped day</span>
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
              <p className="text-sm text-text-muted">Add courses and save snapshots to view velocity charts.</p>
            ) : (
              summary.courseAnalytics.map(({ course, analytics }) => (
                <div key={course.id} className="flex items-center justify-between gap-4 rounded border border-border-faint p-4 transition-colors hover:border-border-strong hover:bg-subtle">
                  <div>
                    <h4 className="font-semibold text-text-primary">{course.courseName || course.slotLabel}</h4>
                    <p className="mt-1 text-xs text-text-muted">Current: {analytics.currentAttendance}%</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="opacity-90">
                      <Sparkline snapshots={snapshotsByCourse[course.id]} />
                    </div>
                    <div className="text-right min-w-[70px]">
                      <p className={`text-xl font-bold ${analytics.riskLabel === 'Critical' ? 'text-danger' : analytics.riskLabel === 'Warning' ? 'text-warning' : 'text-success'}`}>
                        {analytics.riskScore}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk Score</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

