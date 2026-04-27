import React, { useMemo, useState } from 'react';

import { formatDate } from '../utils/dateUtils.js';
import { getRemainingClassDates } from '../utils/attendanceAnalytics.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_STYLES = {
  attended: { bg: 'var(--green-dim)', border: 'var(--accent)', label: 'Attended' },
  skipped: { bg: 'var(--red-dim)', border: 'var(--red)', label: 'Missed' },
  planned: { bg: 'var(--amber-dim)', border: 'var(--amber)', label: 'Planned skip' },
  upcoming: { bg: 'var(--bg-elevated)', border: 'var(--border-default)', label: 'Upcoming class' },
  blocked: { bg: 'transparent', border: 'var(--border-faint)', label: 'No class / holiday' },
};

const semesterStartFromCalendar = academicCalendar => {
  const events = Array.isArray(academicCalendar) ? academicCalendar : [];
  const commencement = events.find(event =>
    typeof event.name === 'string' && /commencement/i.test(event.name)
  );
  if (commencement?.date) {
    return new Date(`${commencement.date}T00:00:00`);
  }
  const firstAcademic = events.find(event => event.type === 'academic' && event.date);
  return firstAcademic ? new Date(`${firstAcademic.date}T00:00:00`) : null;
};

const startOfWeek = date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
};

const buildDayMatrix = ({ courses, semesterData, today }) => {
  const start = semesterStartFromCalendar(semesterData?.academicCalendar);
  const end =
    semesterData?.lastInstructionalDay instanceof Date
      ? semesterData.lastInstructionalDay
      : semesterData?.lastInstructionalDay
        ? new Date(semesterData.lastInstructionalDay)
        : null;

  if (!start || !end) {
    return null;
  }

  const firstColumn = startOfWeek(start);
  const lastColumn = startOfWeek(end);
  const totalWeeks = Math.max(1, Math.round((lastColumn - firstColumn) / (7 * DAY_MS)) + 1);

  const allClassDays = new Set();
  const skippedSet = new Set();
  const plannedSet = new Set();

  courses.forEach(course => {
    const slotDays = Array.isArray(course.slotDays) ? course.slotDays : [];
    if (slotDays.length === 0) {
      return;
    }
    const dates = getRemainingClassDates(
      slotDays,
      semesterData?.academicCalendar,
      semesterData?.lastInstructionalDay,
      start
    );
    dates.forEach(date => allClassDays.add(date));

    (course.skippedDates || []).forEach(date => plannedSet.add(date));
  });

  // Heuristic: distribute "missed so far" evenly across past class days.
  // We do not have per-day attendance, only totals — so we shade past class
  // days as "attended" by default and let the planned/missed totals show
  // up via per-course cell counts in the legend.
  const totalsByCourse = courses.map(course => ({
    name: course.courseName || course.slotLabel,
    missed: Math.max(0, Number(course.classesTaken || 0) - Number(course.classesAttended || 0)),
    planned: Array.isArray(course.skippedDates) ? course.skippedDates.length : 0,
  }));

  const todayKey = formatDate(today);
  const cells = [];

  for (let week = 0; week < totalWeeks; week += 1) {
    const column = [];
    for (let day = 0; day < 6; day += 1) {
      const cellDate = new Date(firstColumn);
      cellDate.setDate(cellDate.getDate() + week * 7 + day);
      const cellKey = formatDate(cellDate);
      const inSemester = cellDate >= start && cellDate <= end;
      const hasClass = inSemester && allClassDays.has(cellKey);

      let status = 'blocked';
      if (hasClass) {
        if (plannedSet.has(cellKey)) {
          status = 'planned';
        } else if (cellKey > todayKey) {
          status = 'upcoming';
        } else if (skippedSet.has(cellKey)) {
          status = 'skipped';
        } else {
          status = 'attended';
        }
      }

      column.push({ date: cellDate, key: cellKey, status, hasClass });
    }
    cells.push(column);
  }

  return { cells, totalsByCourse, totalWeeks, firstColumn };
};

const AttendanceHeatmap = ({ courses = [], semesterData }) => {
  const [hoverCell, setHoverCell] = useState(null);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const matrix = useMemo(
    () => buildDayMatrix({ courses, semesterData, today }),
    [courses, semesterData, today]
  );

  if (!matrix) {
    return (
      <p className="text-sm text-text-muted">
        Heatmap will appear once the semester calendar is available.
      </p>
    );
  }

  const monthLabels = matrix.cells.map((_, weekIndex) => {
    const date = new Date(matrix.firstColumn);
    date.setDate(date.getDate() + weekIndex * 7);
    if (date.getDate() <= 7 || weekIndex === 0) {
      return date.toLocaleString('en-US', { month: 'short' });
    }
    return '';
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full flex-col gap-1">
          <div className="flex items-end gap-[3px] pl-8">
            {monthLabels.map((label, weekIndex) => (
              <div
                key={weekIndex}
                className="w-[14px] text-[10px] uppercase tracking-wider text-text-muted"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="flex">
            <div className="mr-2 flex flex-col justify-around py-[2px] text-[10px] text-text-muted">
              {WEEKDAY_LABELS.map(label => (
                <span key={label} className="leading-[14px]">
                  {label[0]}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {matrix.cells.map((column, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {column.map(cell => {
                    const style = STATUS_STYLES[cell.status];
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onMouseEnter={() => setHoverCell(cell)}
                        onMouseLeave={() => setHoverCell(null)}
                        onFocus={() => setHoverCell(cell)}
                        onBlur={() => setHoverCell(null)}
                        aria-label={`${cell.key} ${style.label}`}
                        className="h-[14px] w-[14px] border transition-transform hover:scale-110"
                        style={{ backgroundColor: style.bg, borderColor: style.border }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-text-muted">
        {Object.entries(STATUS_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 border"
              style={{ backgroundColor: style.bg, borderColor: style.border }}
            />
            {style.label}
          </div>
        ))}
        {hoverCell ? (
          <span className="ml-auto font-mono text-text-secondary">
            {hoverCell.key} · {STATUS_STYLES[hoverCell.status].label}
          </span>
        ) : null}
      </div>

      {matrix.totalsByCourse.length > 0 ? (
        <div className="grid gap-2 border-t border-border-faint pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {matrix.totalsByCourse.map(item => (
            <div key={item.name} className="flex items-baseline justify-between text-xs text-text-muted">
              <span className="truncate text-text-secondary">{item.name}</span>
              <span className="ml-3 whitespace-nowrap">
                <span className="text-danger">{item.missed} missed</span>
                <span className="mx-1.5">·</span>
                <span className="text-warning">{item.planned} planned</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AttendanceHeatmap;
