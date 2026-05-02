import React, { useMemo } from 'react';

import { formatDate } from '../utils/dateUtils.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BLOCKING_TYPES = new Set(['holiday', 'exam', 'other']);

// Distinct hues so the three event states are unambiguous at 14px.
// Today is rendered as an overlay ring on top of whatever the cell already
// is, so it can coexist with planned-skip / past / future / exam / holiday.
const STATUS_STYLES = {
  past: { bg: 'var(--accent)', border: 'var(--accent)' },
  future: { bg: 'transparent', border: 'var(--accent-dim)' },
  'planned-skip': { bg: 'var(--amber)', border: 'var(--amber)' },
  holiday: { bg: 'var(--red)', border: 'var(--red)' },
  exam: { bg: 'var(--blue)', border: 'var(--blue)' },
  'off-class': { bg: 'transparent', border: 'var(--border-faint)' },
  empty: { bg: 'transparent', border: 'transparent' },
};

const STATUS_LABELS = {
  past: 'Past class',
  future: 'Upcoming class',
  'planned-skip': 'Planned skip',
  holiday: 'Holiday',
  exam: 'Exam / break',
  'off-class': 'No class',
};

const semesterStartFromCalendar = academicCalendar => {
  const events = Array.isArray(academicCalendar) ? academicCalendar : [];
  const commencement = events.find(
    event => typeof event.name === 'string' && /commencement/i.test(event.name)
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

const buildBlockedMap = academicCalendar => {
  const map = new Map();
  (academicCalendar || []).forEach(event => {
    if (!BLOCKING_TYPES.has(event.type)) {
      return;
    }
    if (event.date) {
      map.set(event.date, event);
      return;
    }
    if (event.startDate && event.endDate) {
      const start = new Date(`${event.startDate}T00:00:00`);
      const end = new Date(`${event.endDate}T00:00:00`);
      const cursor = new Date(start);
      while (cursor <= end) {
        map.set(formatDate(cursor), event);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  });
  return map;
};

const buildMatrix = ({ slotDays, course, semesterData, today }) => {
  const start = semesterStartFromCalendar(semesterData?.academicCalendar);
  const end =
    semesterData?.lastInstructionalDay instanceof Date
      ? semesterData.lastInstructionalDay
      : semesterData?.lastInstructionalDay
        ? new Date(semesterData.lastInstructionalDay)
        : null;

  if (!start || !end || !Array.isArray(slotDays) || slotDays.length === 0) {
    return null;
  }

  const blocked = buildBlockedMap(semesterData.academicCalendar);
  const planned = new Set(course?.skippedDates || []);
  const todayKey = formatDate(today);

  const firstColumn = startOfWeek(start);
  const lastColumn = startOfWeek(end);
  const totalWeeks = Math.max(1, Math.round((lastColumn - firstColumn) / (7 * DAY_MS)) + 1);

  const cells = [];
  let totalClassDays = 0;
  let pastClassDays = 0;
  let futureClassDays = 0;
  let blockedClassDays = 0;

  for (let week = 0; week < totalWeeks; week += 1) {
    const column = [];
    for (let weekday = 0; weekday < 6; weekday += 1) {
      const cellDate = new Date(firstColumn);
      cellDate.setDate(cellDate.getDate() + week * 7 + weekday);
      const cellKey = formatDate(cellDate);
      const inSemester = cellDate >= start && cellDate <= end;
      const isClassDayBySlot = slotDays.includes(cellDate.getDay());
      const blockingEvent = blocked.get(cellKey);

      let status = 'empty';
      let title = cellKey;
      const isToday = cellKey === todayKey;

      if (inSemester) {
        if (isClassDayBySlot && blockingEvent) {
          status = blockingEvent.type === 'exam' || blockingEvent.type === 'other' ? 'exam' : 'holiday';
          title = `${cellKey} — ${blockingEvent.name}`;
          blockedClassDays += 1;
        } else if (isClassDayBySlot) {
          totalClassDays += 1;
          if (planned.has(cellKey)) {
            status = 'planned-skip';
            futureClassDays += 1;
          } else if (cellKey < todayKey) {
            status = 'past';
            pastClassDays += 1;
          } else {
            status = 'future';
            futureClassDays += 1;
          }
          title = `${cellKey} — ${STATUS_LABELS[status]}${isToday ? ' (today)' : ''}`;
        } else if (blockingEvent) {
          status = 'off-class';
          title = `${cellKey} — ${blockingEvent.name}`;
        } else {
          status = 'off-class';
        }
      }

      column.push({ key: cellKey, status, title, isToday });
    }
    cells.push(column);
  }

  const monthLabels = cells.map((_, weekIndex) => {
    const date = new Date(firstColumn);
    date.setDate(date.getDate() + weekIndex * 7);
    if (weekIndex === 0 || date.getDate() <= 7) {
      return date.toLocaleString('en-US', { month: 'short' });
    }
    return '';
  });

  return {
    cells,
    monthLabels,
    totalClassDays,
    pastClassDays,
    futureClassDays,
    blockedClassDays,
  };
};

const formatDayList = slotDays =>
  slotDays
    .slice()
    .sort()
    .map(day => WEEKDAY_LABELS[(day + 6) % 7] || '')
    .filter(Boolean)
    .join(' · ');

const SlotHeatmap = ({
  slotLabel,
  slotDays = [],
  course,
  semesterData,
  compact = false,
  showLegend = true,
}) => {
  // Re-key "today" on every render via the date string. useMemo([]) would
  // freeze it at first mount, leaving a long-lived tab showing "upcoming"
  // cells long after the semester is over. The matrix builder below is
  // memoized off `today`, so we only rebuild when the day actually changes.
  const todayDateString = new Date().toDateString();
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDateString]);

  const matrix = useMemo(
    () => buildMatrix({ slotDays, course, semesterData, today }),
    [course, semesterData, slotDays, today]
  );

  if (!matrix) {
    return (
      <p className="text-xs text-text-muted">
        Schedule preview will appear once the semester calendar loads.
      </p>
    );
  }

  const cellSize = compact ? 11 : 14;
  const cellGap = compact ? 2 : 3;

  const stats = course
    ? `${matrix.totalClassDays} classes · ${matrix.pastClassDays} done · ${matrix.futureClassDays} upcoming`
    : `${matrix.totalClassDays} class days · ${matrix.blockedClassDays} blocked by holiday/exam`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="font-mono text-sm font-medium text-accent">{slotLabel}</p>
          <p className="text-[11px] text-text-muted">{formatDayList(slotDays)}</p>
        </div>
        <p className="text-[11px] text-text-muted">{stats}</p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col">
          <div className="flex items-center" style={{ gap: `${cellGap}px` }}>
            <div style={{ width: compact ? 14 : 18 }} />
            {matrix.monthLabels.map((label, weekIndex) => (
              <div
                key={weekIndex}
                style={{ width: cellSize }}
                className="text-[9px] uppercase tracking-wider text-text-muted"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="mt-1 flex" style={{ gap: `${cellGap}px` }}>
            <div className="flex flex-col justify-around" style={{ gap: `${cellGap}px` }}>
              {WEEKDAY_LABELS.map(label => (
                <span
                  key={label}
                  className="text-[9px] text-text-muted"
                  style={{ height: cellSize, lineHeight: `${cellSize}px`, width: compact ? 14 : 18 }}
                >
                  {label[0]}
                </span>
              ))}
            </div>

            <div className="flex" style={{ gap: `${cellGap}px` }}>
              {matrix.cells.map((column, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col"
                  style={{ gap: `${cellGap}px` }}
                >
                  {column.map(cell => {
                    const style = STATUS_STYLES[cell.status];
                    return (
                      <div
                        key={cell.key}
                        title={cell.title}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: style.bg,
                          border:
                            style.border === 'transparent'
                              ? 'none'
                              : `1px solid ${style.border}`,
                          borderRadius: 2,
                          boxShadow: cell.isToday
                            ? '0 0 0 2px var(--bg-base), 0 0 0 3.5px var(--accent)'
                            : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLegend ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-text-muted">
          {['past', 'future', 'planned-skip', 'holiday', 'exam'].map(key => {
            const style = STATUS_STYLES[key];
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5"
                  style={{
                    backgroundColor: style.bg,
                    border: `1px solid ${style.border}`,
                    borderRadius: 2,
                  }}
                />
                {STATUS_LABELS[key]}
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{
                background: 'var(--bg-elevated)',
                boxShadow: '0 0 0 1.5px var(--accent)',
                borderRadius: 2,
              }}
            />
            Today
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SlotHeatmap;
