import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';

import ExamHorizonPanel from './ExamHorizonPanel.jsx';
import SlotHeatmap from './SlotHeatmap.jsx';
import { buildDashboardSummary } from '../utils/attendanceAnalytics.js';

const getSemesterProgress = semesterData => {
  const calendar = semesterData?.academicCalendar || [];
  const commencement = calendar.find(
    event => typeof event.name === 'string' && /commencement/i.test(event.name)
  );
  const fallbackStart = calendar.find(event => event.type === 'academic' && event.date);
  const startEvent = commencement || fallbackStart;
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
      {hasCourses ? (
        <ExamHorizonPanel
          courses={courses}
          snapshotsByCourse={snapshotsByCourse}
          semesterData={semesterData}
          onOpenCourse={onOpenCourse}
        />
      ) : null}

      <section className="grid gap-6 border-b border-border-faint pb-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="eyebrow-label">Command Dashboard</p>
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

        <div className="flex items-start justify-end gap-2">
          <button type="button" onClick={onAddCourse} className="primary-button">
            <Plus size={16} />
            Add Course
          </button>
        </div>
      </section>

      {hasCourses ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow-label">Tracked Courses</p>
              <h3 className="mt-1 text-xl font-semibold">Open or remove</h3>
            </div>
            <p className="text-sm text-text-muted">{summary.totalCourses} total</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.courseAnalytics.map(({ course, analytics }) => {
              const dotColor =
                analytics.riskLabel === 'Critical'
                  ? 'var(--red)'
                  : analytics.riskLabel === 'Warning'
                    ? 'var(--amber)'
                    : 'var(--green)';
              return (
                <article
                  key={course.id}
                  className="group relative border border-border-faint bg-surface p-4 transition-colors hover:border-border-strong"
                >
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course)}
                    className="block w-full pr-7 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: dotColor }}
                        aria-hidden="true"
                      />
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {course.courseName || course.slotLabel}
                      </p>
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-accent">{course.slotLabel}</p>
                    <p className="mt-3 font-display text-2xl font-semibold text-text-primary">
                      {analytics.currentAttendance.toFixed(1)}
                      <span className="ml-0.5 text-base font-normal text-text-muted">%</span>
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onDeleteCourse(course.id);
                    }}
                    className="absolute right-3 top-3 text-text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Delete ${course.courseName || course.slotLabel}`}
                    title="Delete course"
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <div className="border-y border-border-faint py-10">
            <p className="text-lg font-medium text-text-primary">No saved courses yet.</p>
            <p className="mt-1 text-sm text-text-muted">
              Add your first slot to start forecasting attendance risk.
            </p>
          </div>
        </section>
      )}

      {hasCourses ? (
        <section className="space-y-6 border-t border-border-faint pt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow-label">Semester Calendar</p>
              <h3 className="mt-1 text-2xl font-semibold">Class days for every course</h3>
              <p className="mt-1 text-sm text-text-muted">
                Each square is one weekday in the semester. Holidays and exams
                that block your slot are highlighted.
              </p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {summary.courseAnalytics.map(({ course }, index) => (
              <div
                key={course.id}
                className="border border-border-faint bg-surface p-5"
              >
                <p className="mb-3 text-base font-semibold text-text-primary">
                  {course.courseName || course.slotLabel}
                </p>
                <SlotHeatmap
                  slotLabel={course.slotLabel}
                  slotDays={course.slotDays}
                  course={course}
                  semesterData={semesterData}
                  compact
                  showLegend={index === 0}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
