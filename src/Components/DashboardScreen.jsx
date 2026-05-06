import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';

import ExamHorizonPanel from './ExamHorizonPanel.jsx';
import SlotHeatmap from './SlotHeatmap.jsx';
import { buildDashboardSummary } from '../utils/attendanceAnalytics.js';

export default function DashboardScreen({
  courses,
  onAddCourse,
  onOpenCourse,
  onDeleteCourse,
  onBulkUpdate,
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
  const hasCourses = summary.totalCourses > 0;

  return (
    <div className="space-y-8">
      {hasCourses ? (
        <ExamHorizonPanel
          courses={courses}
          snapshotsByCourse={snapshotsByCourse}
          semesterData={semesterData}
          onOpenCourse={onOpenCourse}
          onAddCourse={onAddCourse}
          onDeleteCourse={onDeleteCourse}
          onBulkUpdate={onBulkUpdate}
        />
      ) : (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border-faint py-10">
            <div>
              <p className="text-lg font-medium text-text-primary">No saved courses yet.</p>
              <p className="mt-1 text-sm text-text-muted">
                Add your first slot to start forecasting attendance risk.
              </p>
            </div>
            <button type="button" onClick={onAddCourse} className="primary-button">
              <Plus size={16} />
              Add Course
            </button>
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
