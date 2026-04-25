import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';

import { buildDashboardSummary } from '../utils/attendanceAnalytics.js';

const getRiskClassName = label => {
  if (label === 'Critical') {
    return 'text-danger';
  }

  if (label === 'Warning') {
    return 'text-warning';
  }

  return 'text-success';
};

const getSemesterProgress = semesterData => {
  const startEvent = semesterData?.academicCalendar?.find(event => event.type === 'academic');
  const startDate = startEvent?.date ? new Date(`${startEvent.date}T00:00:00`) : null;
  const endDate = semesterData?.lastInstructionalDay;

  if (!startDate || !endDate) {
    return 0;
  }

  const total = endDate - startDate;
  const elapsed = new Date() - startDate;

  if (total <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
};

export default function DashboardScreen({
  courses,
  onAddCourse,
  onOpenCourse,
  onDeleteCourse,
  semesterData,
  snapshotsByCourse,
}) {
  const summary = useMemo(
    () =>
      buildDashboardSummary({
        courses,
        semester: semesterData,
        snapshotsByCourse,
      }),
    [courses, semesterData, snapshotsByCourse]
  );
  const progress = getSemesterProgress(semesterData);
  const highestRisk = summary.highestRiskCourse;
  const hasCourses = summary.totalCourses > 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-border-faint pb-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="eyebrow-label">Command Dashboard</p>
          <h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-text-primary">
            Attendance risk, recovery pressure, and semester progress in one view.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-l border-border-faint pl-6">
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

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5 border-r border-border-faint pr-6">
          <div>
            <p className="eyebrow-label">Highest Risk</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {highestRisk?.course?.courseName || highestRisk?.course?.slotLabel || 'No course data'}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              {highestRisk
                ? highestRisk.analytics.recommendation
                : 'Add a course and attendance values to start risk forecasting.'}
            </p>
          </div>

          <div className="h-2 bg-subtle">
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full bg-accent"
            />
          </div>

          <button type="button" onClick={onAddCourse} className="primary-button">
            <Plus size={16} />
            Add Course
          </button>
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow-label">Course Risk Table</p>
              <h3 className="mt-1 text-xl font-semibold">Tracked courses</h3>
            </div>
            <p className="text-sm text-text-muted">{summary.totalCourses} total</p>
          </div>

          {!hasCourses ? (
            <div className="border-y border-border-faint py-10">
              <p className="text-lg font-medium text-text-primary">No saved courses yet.</p>
              <p className="mt-1 text-sm text-text-muted">
                Add your first slot to start forecasting attendance risk.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-faint border-y border-border-faint">
              {summary.courseAnalytics.map(({ course, analytics }) => (
                <article
                  key={course.id}
                  className="grid gap-4 py-4 md:grid-cols-[1fr_0.8fr_0.8fr_auto] md:items-center"
                >
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course)}
                    className="text-left"
                  >
                    <p className="font-display text-lg font-semibold text-text-primary">
                      {course.courseName || course.slotLabel}
                    </p>
                    <p className="mt-1 font-mono text-xs text-text-muted">{course.slotLabel}</p>
                  </button>

                  <div>
                    <p className="eyebrow-label">Projection</p>
                    <p className="mt-1 text-lg font-semibold">
                      {analytics.projectedAttendance.toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <p className="eyebrow-label">Risk</p>
                    <p className={`mt-1 text-lg font-semibold ${getRiskClassName(analytics.riskLabel)}`}>
                      {analytics.riskLabel} · {analytics.riskScore}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenCourse(course)}
                      className="ghost-button px-3 py-1.5"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCourse(course.id)}
                      className="text-text-muted transition-colors hover:text-danger"
                      title="Delete course"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
