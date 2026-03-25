import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';

import { MIN_ATTENDANCE } from '../data/constants.js';
import { formatDate } from '../utils/dateUtils.js';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const getAttendanceColor = percentage => {
  if (percentage >= MIN_ATTENDANCE) {
    return 'text-success';
  }

  if (percentage >= 65) {
    return 'text-warning';
  }

  return 'text-danger';
};

const buildEventSet = academicCalendar => {
  const blockedDates = new Set();

  (academicCalendar || []).forEach(event => {
    if (event.type !== 'holiday' && event.type !== 'exam') {
      return;
    }

    if (event.date) {
      blockedDates.add(formatDate(new Date(`${event.date}T00:00:00`)));
      return;
    }

    if (event.startDate && event.endDate) {
      const currentDate = new Date(`${event.startDate}T00:00:00`);
      const endDate = new Date(`${event.endDate}T00:00:00`);

      while (currentDate <= endDate) {
        blockedDates.add(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  });

  return blockedDates;
};

const estimateRemainingClasses = (slotDays, lastInstructionalDay, blockedDates) => {
  if (!Array.isArray(slotDays) || slotDays.length === 0 || !lastInstructionalDay) {
    return 0;
  }

  const currentDate = new Date();
  let remainingClasses = 0;

  while (currentDate <= lastInstructionalDay) {
    const formattedDate = formatDate(currentDate);

    if (slotDays.includes(currentDate.getDay()) && !blockedDates.has(formattedDate)) {
      remainingClasses += 1;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return remainingClasses;
};

const calculateAttendancePercentage = course => {
  const classesTaken = Number(course?.classesTaken) || 0;
  const classesAttended = Number(course?.classesAttended) || 0;

  if (classesTaken <= 0) {
    return 0;
  }

  return (classesAttended / classesTaken) * 100;
};

const estimateRemainingSkips = (course, semesterData, blockedDates) => {
  const classesTaken = Number(course?.classesTaken) || 0;
  const classesAttended = Number(course?.classesAttended) || 0;
  const skippedDates = Array.isArray(course?.skippedDates) ? course.skippedDates.length : 0;
  const remainingClasses = estimateRemainingClasses(
    course?.slotDays,
    semesterData?.lastInstructionalDay,
    blockedDates
  );
  const totalClasses = classesTaken + remainingClasses;
  const skippedClasses = classesTaken - classesAttended;

  if (totalClasses <= 0) {
    return 0;
  }

  const totalAllowedSkips = Math.floor(totalClasses * (1 - MIN_ATTENDANCE / 100));

  return totalAllowedSkips - skippedClasses - skippedDates;
};

const renderPercentage = percentage => `${percentage.toFixed(1)}%`;

export default function DashboardScreen({
  courses,
  onAddCourse,
  onOpenCourse,
  onDeleteCourse,
  semesterData,
}) {
  const blockedDates = useMemo(
    () => buildEventSet(semesterData?.academicCalendar),
    [semesterData?.academicCalendar]
  );
  const hasCourses = Array.isArray(courses) && courses.length > 0;
  const summary = useMemo(() => {
    const courseSummaries = (Array.isArray(courses) ? courses : []).map(course => ({
      attendance: calculateAttendancePercentage(course),
      classesTaken: Number(course?.classesTaken) || 0,
    }));
    const trackedCourses = courseSummaries.filter(course => course.classesTaken > 0);
    const avgAttendance = trackedCourses.length
      ? Number(
          (
            trackedCourses.reduce((total, course) => total + course.attendance, 0) /
            trackedCourses.length
          ).toFixed(1)
        )
      : null;
    const safeCourses = courseSummaries.filter(course => course.attendance >= MIN_ATTENDANCE);
    const atRiskCourses = courseSummaries.filter(
      course => course.attendance > 0 && course.attendance < MIN_ATTENDANCE
    );
    const notStarted = courseSummaries.filter(course => course.classesTaken === 0);

    return {
      totalCourses: courseSummaries.length,
      avgAttendance,
      safeCourses,
      atRiskCourses,
      notStarted,
      overallStatus:
        atRiskCourses.length > 0
          ? 'at-risk'
          : avgAttendance !== null && avgAttendance >= MIN_ATTENDANCE
            ? 'safe'
            : 'neutral',
    };
  }, [courses]);
  const avgAttendanceColor =
    summary.avgAttendance === null
      ? 'text-[var(--text-muted)]'
      : summary.avgAttendance >= MIN_ATTENDANCE
        ? 'text-[var(--green)]'
        : summary.avgAttendance >= 65
          ? 'text-[var(--amber)]'
          : 'text-[var(--red)]';
  const statusConfig =
    summary.overallStatus === 'at-risk'
      ? {
          dot: 'bg-[var(--amber)]',
          message: `${summary.atRiskCourses.length} course${summary.atRiskCourses.length === 1 ? '' : 's'} below ${MIN_ATTENDANCE}% \u2014 open the planner to check your skip budget`,
          tone: 'text-[var(--amber)]',
        }
      : summary.overallStatus === 'safe'
        ? {
            dot: 'bg-[var(--green)]',
            message: `All tracked courses are above ${MIN_ATTENDANCE}% \u2014 you're on track`,
            tone: 'text-[var(--green)]',
          }
        : {
            dot: 'bg-[var(--text-muted)]',
            message: `${summary.notStarted.length} course${summary.notStarted.length === 1 ? '' : 's'} not started yet \u2014 attendance will update once classes are logged`,
            tone: 'text-[var(--text-muted)]',
          };
  const summaryStats = [
    {
      label: 'Total Courses',
      value: summary.totalCourses,
      valueClassName: 'text-[var(--text-primary)]',
    },
    {
      label: 'Avg Attendance',
      value: summary.avgAttendance === null ? '--' : `${summary.avgAttendance.toFixed(1)}%`,
      valueClassName: avgAttendanceColor,
    },
    { label: 'Safe', value: summary.safeCourses.length, valueClassName: 'text-[var(--green)]' },
    {
      label: 'At Risk',
      value: summary.atRiskCourses.length,
      valueClassName:
        summary.atRiskCourses.length > 0 ? 'text-[var(--red)]' : 'text-[var(--text-muted)]',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
            My Courses
          </h2>
          <p className="text-sm text-text-muted">Select a course to open the planner</p>
        </div>

        <button
          type="button"
          onClick={onAddCourse}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent bg-transparent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-[var(--accent-glow)]"
        >
          <Plus size={16} />
          Add Course
        </button>
      </div>

      {!hasCourses ? (
        <div className="app-card p-8 text-center">
          <h3 className="text-lg font-semibold text-text-primary">No saved courses yet</h3>
          <p className="mt-2 text-sm text-text-muted">
            Add your first slot to start syncing attendance and skip plans across sessions.
          </p>
          <Motion.button
            type="button"
            onClick={onAddCourse}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            className="primary-button mt-5"
          >
            <Plus size={16} />
            Add Course
          </Motion.button>
        </div>
      ) : (
        <>
          <Motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-5"
          >
            <div className="grid grid-cols-2 md:grid-cols-4">
              {summaryStats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`${index === 0 || index === 2 ? 'border-r border-[var(--border-faint)] pr-4 md:pr-6' : 'pl-4 md:pl-6'} ${index > 1 ? 'mt-4 border-t border-[var(--border-faint)] pt-4 md:mt-0 md:border-t-0 md:pt-0' : ''} ${index === 1 ? 'md:border-r md:border-[var(--border-faint)] md:pr-6' : ''}`}
                >
                  <p className="text-xs font-normal uppercase tracking-wider text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <p className={`mt-2 text-2xl font-semibold tracking-[-0.02em] ${stat.valueClassName}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-[var(--border-faint)] pt-3">
              <p className={`inline-flex items-center gap-2 text-xs ${statusConfig.tone}`}>
                <span className={`h-1 w-1 rounded-full ${statusConfig.dot}`} />
                {statusConfig.message}
              </p>
            </div>
          </Motion.section>

          <Motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {courses.map(course => {
              const attendancePercentage = calculateAttendancePercentage(course);
              const remainingSkips = estimateRemainingSkips(course, semesterData, blockedDates);
              const classCount =
                Number(course?.classesTaken || 0) +
                estimateRemainingClasses(
                  course?.slotDays,
                  semesterData?.lastInstructionalDay,
                  blockedDates
                );

              return (
                <Motion.article
                  key={course.id}
                  variants={cardVariants}
                  whileHover={{ scale: 1.005 }}
                  className="app-card app-card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="mono-slot">{course.slotLabel}</p>

                    <button
                      type="button"
                      onClick={() => onDeleteCourse(course.id)}
                      className="text-text-muted transition-colors hover:text-danger"
                      title="Delete course"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-border-faint bg-subtle px-4 py-3">
                    <div className="pr-3">
                      <p className="eyebrow-label">Attendance</p>
                      <p className={`mt-1 text-xl font-semibold tracking-[-0.01em] ${getAttendanceColor(attendancePercentage)}`}>
                        {renderPercentage(attendancePercentage)}
                      </p>
                    </div>
                    <div className="border-l border-border-faint px-3">
                      <p className="eyebrow-label">Remaining Skips</p>
                      <p className="mt-1 text-xl font-semibold tracking-[-0.01em] text-text-primary">
                        {remainingSkips}
                      </p>
                    </div>
                    <div className="border-l border-border-faint pl-3">
                      <p className="eyebrow-label">Classes</p>
                      <p className="mt-1 text-xl font-semibold tracking-[-0.01em] text-text-primary">
                        {classCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-text-muted">
                      {`${course.classesAttended || 0} attended / ${course.classesTaken || 0} total`}
                    </p>

                    <Motion.button
                      type="button"
                      onClick={() => onOpenCourse(course)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="primary-button px-4 py-1.5"
                    >
                      Open Planner
                    </Motion.button>
                  </div>
                </Motion.article>
              );
            })}
          </Motion.div>
        </>
      )}
    </div>
  );
}
