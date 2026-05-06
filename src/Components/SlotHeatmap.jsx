import React, { useMemo, useState } from 'react';

import { formatDate } from '../utils/dateUtils.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BLOCKING_TYPES = new Set(['holiday', 'exam', 'other']);

// Distinct hues so the event states are unambiguous at 14px.
// Today is rendered as an overlay ring on top of whatever the cell already
// is, so it can coexist with planned-skip / past / future / exam / holiday.
//
// `past` here means a past class day where we don't have per-day signal —
// the renderer tints it between accent (attended) and red (missed) based
// on the course's ambiguity probability. `missed` is a confirmed miss
// from the student's precise-skip picker.
// Five visually distinct hues so the legend reads cleanly at 14px:
//   green  → past attended            (positive, student-side)
//   red    → missed (logged)          (alarm, student-side)
//   amber  → planned skip             (caution, student-side intent)
//   purple → holiday                  (neutral institutional event)
//   blue   → exam / break             (institutional event)
// Plus grey for cancelled (didn't happen) and outline for future/off-class.
const STATUS_STYLES = {
  past: { bg: 'var(--accent)', border: 'var(--accent)' },
  missed: { bg: 'var(--red)', border: 'var(--red)' },
  cancelled: { bg: 'var(--text-muted)', border: 'var(--text-muted)' },
  future: { bg: 'transparent', border: 'var(--accent-dim)' },
  'planned-skip': { bg: 'var(--amber)', border: 'var(--amber)' },
  holiday: { bg: 'var(--purple)', border: 'var(--purple)' },
  exam: { bg: 'var(--blue)', border: 'var(--blue)' },
  'off-class': { bg: 'transparent', border: 'var(--border-faint)' },
  empty: { bg: 'transparent', border: 'transparent' },
};

const STATUS_LABELS = {
  past: 'Past class',
  missed: 'Missed (logged)',
  cancelled: 'Cancelled',
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

// Non-blocking annotations (academic markers like commencement or lab FAT
// week). These don't change the cell colour or class-counting, but the
// event name is surfaced in the hover tooltip so the student knows what's
// happening on that date.
const buildAnnotationMap = academicCalendar => {
  const map = new Map();
  (academicCalendar || []).forEach(event => {
    if (BLOCKING_TYPES.has(event.type) || event.type !== 'academic') {
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

  // Allow empty slotDays — the master Semester Calendar uses this to
  // render an event-only view ("No slot — events only" picker option).
  // Holidays/exams still light up; nothing is highlighted as a class day.
  if (!start || !end) {
    return null;
  }
  const safeSlotDays = Array.isArray(slotDays) ? slotDays : [];

  const blocked = buildBlockedMap(semesterData.academicCalendar);
  const annotations = buildAnnotationMap(semesterData.academicCalendar);
  const planned = new Set(course?.skippedDates || []);
  const missed = new Set(course?.missedDates || []);
  const cancelled = new Set(course?.cancelledDates || []);
  const todayKey = formatDate(today);

  // Pad the matrix with ~4 weeks of empty cells on each side so the
  // heatmap doesn't run flush against the card edges. The padding cells
  // fall outside the inSemester check below and render as transparent.
  const PADDING_WEEKS = 4;
  const semesterFirstColumn = startOfWeek(start);
  const lastColumn = startOfWeek(end);
  const firstColumn = new Date(semesterFirstColumn);
  firstColumn.setDate(firstColumn.getDate() - PADDING_WEEKS * 7);
  const totalWeeks =
    Math.max(1, Math.round((lastColumn - semesterFirstColumn) / (7 * DAY_MS)) + 1) +
    PADDING_WEEKS * 2;

  const cells = [];
  let totalClassDays = 0;
  let pastClassDays = 0;
  let futureClassDays = 0;
  let blockedClassDays = 0;
  // Count past class days that are NOT planned-skip and NOT confirmed
  // missed — these are the "ambiguous" cells whose colour will be
  // probability-blended below to honestly reflect uncertainty about which
  // specific past classes the student actually missed.
  let ambiguousPastCells = 0;
  let confirmedMissedInPast = 0;

  for (let week = 0; week < totalWeeks; week += 1) {
    const column = [];
    for (let weekday = 0; weekday < 6; weekday += 1) {
      const cellDate = new Date(firstColumn);
      cellDate.setDate(cellDate.getDate() + week * 7 + weekday);
      const cellKey = formatDate(cellDate);
      const inSemester = cellDate >= start && cellDate <= end;
      const isClassDayBySlot = safeSlotDays.includes(cellDate.getDay());
      const blockingEvent = blocked.get(cellKey);

      let status = 'empty';
      let title = cellKey;
      const isToday = cellKey === todayKey;
      const annotationEvent = annotations.get(cellKey);

      if (inSemester) {
        // Holidays/exams light up regardless of slot — events affect the
        // semester whether or not your specific slot meets that day. This
        // also lets the "No slot — events only" view in the Semester
        // Calendar show every event without needing a slot to be picked.
        if (blockingEvent) {
          status = blockingEvent.type === 'exam' || blockingEvent.type === 'other' ? 'exam' : 'holiday';
          title = `${cellKey} — ${blockingEvent.name}`;
          if (isClassDayBySlot) blockedClassDays += 1;
        } else if (isClassDayBySlot && cancelled.has(cellKey)) {
          // Cancelled classes existed in the slot calendar but didn't
          // happen — exclude from total/past/future class counts so
          // attendance math stays honest.
          status = 'cancelled';
          title = `${cellKey} — ${STATUS_LABELS[status]}`;
        } else if (isClassDayBySlot) {
          totalClassDays += 1;
          const isPlanned = planned.has(cellKey);
          const isMissed = missed.has(cellKey);
          const isPast = cellKey < todayKey;
          // Structural mode: when no course context is provided, past
          // class days have no per-day attendance signal. Render them as
          // outlined ("future") cells so we don't fabricate green for
          // days we know nothing about. Keeps the master Semester
          // Calendar honest.
          if (!course) {
            status = 'future';
          } else if (isPast && isMissed) {
            status = 'missed';
            confirmedMissedInPast += 1;
          } else if (isPlanned) {
            status = 'planned-skip';
          } else if (isPast) {
            status = 'past';
            ambiguousPastCells += 1;
          } else {
            status = 'future';
          }
          // Past/future tally is independent of the planned-skip overlay so
          // historical planned skips don't masquerade as upcoming classes.
          if (isPast) {
            pastClassDays += 1;
          } else {
            futureClassDays += 1;
          }
          title = `${cellKey} — ${STATUS_LABELS[status]}${isToday ? ' (today)' : ''}`;
          // Layer the annotation onto the tooltip so the student sees
          // context like "Lab FAT week" even though classes still meet.
          if (annotationEvent) {
            title += ` · ${annotationEvent.name}`;
          }
        } else if (annotationEvent) {
          status = 'off-class';
          title = `${cellKey} — ${annotationEvent.name}`;
        } else {
          status = 'off-class';
        }
      }

      column.push({ key: cellKey, status, title, isToday });
    }
    cells.push(column);
  }

  // Compute the per-course ambiguity probability for past cells whose
  // attended/missed state we don't know precisely. The math:
  //   totalMissedSoFar  = classesTaken - classesAttended
  //   confirmed misses  = confirmedMissedInPast (from missedDates picker)
  //   unknown misses    = max(0, totalMissedSoFar - confirmedMissedInPast)
  //   ambiguity prob.   = unknown misses / ambiguousPastCells   (clamped)
  // Each ambiguous-past cell renders as a blend between accent (attended)
  // and red (missed) at this probability — visually communicating that
  // we know how many were missed but not which ones.
  let ambiguityProbability = 0;
  if (course && ambiguousPastCells > 0) {
    const taken = Number(course.classesTaken) || 0;
    const attended = Number(course.classesAttended) || 0;
    const totalMissed = Math.max(0, taken - attended);
    const unknownMissed = Math.max(0, totalMissed - confirmedMissedInPast);
    ambiguityProbability = Math.min(1, unknownMissed / ambiguousPastCells);
  }

  // Flag the first column of each calendar month so the renderer can
  // insert a small visual gap before it. Makes month boundaries readable
  // without resorting to vertical separator lines.
  const monthLabels = [];
  const monthBreaks = [];
  let lastMonth = null;
  for (let weekIndex = 0; weekIndex < cells.length; weekIndex += 1) {
    const date = new Date(firstColumn);
    date.setDate(date.getDate() + weekIndex * 7);
    const month = date.getMonth();
    const isNewMonth = month !== lastMonth;
    monthBreaks.push(weekIndex > 0 && isNewMonth);
    monthLabels.push(isNewMonth ? date.toLocaleString('en-US', { month: 'short' }) : '');
    lastMonth = month;
  }

  return {
    cells,
    monthLabels,
    monthBreaks,
    totalClassDays,
    pastClassDays,
    futureClassDays,
    blockedClassDays,
    ambiguityProbability,
    confirmedMissedInPast,
    ambiguousPastCells,
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

  // Hovered cell drives a custom in-app tooltip beneath the heatmap.
  // Native `title=""` tooltips hang for ~500ms before showing; React state
  // makes the readout instant.
  const [hoverTitle, setHoverTitle] = useState(null);

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
  // Extra spacing inserted before the first column of every new month so
  // boundaries are visually obvious without drawing separator lines.
  const monthGap = compact ? 6 : 8;

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
        <p
          className="font-mono text-[11px] text-text-secondary"
          aria-live="polite"
        >
          {hoverTitle || stats}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col">
          <div className="flex items-center" style={{ gap: `${cellGap}px` }}>
            <div style={{ width: compact ? 14 : 18 }} />
            {matrix.monthLabels.map((label, weekIndex) => (
              <div
                key={weekIndex}
                style={{
                  width: cellSize,
                  marginLeft: matrix.monthBreaks[weekIndex] ? monthGap : undefined,
                }}
                className="text-[10px] font-medium uppercase tracking-wider text-text-secondary"
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
                  style={{
                    gap: `${cellGap}px`,
                    marginLeft: matrix.monthBreaks[weekIndex] ? monthGap : undefined,
                  }}
                >
                  {column.map(cell => {
                    const style = STATUS_STYLES[cell.status];
                    // Probability-blend: ambiguous past cells overlay a red
                    // wash whose opacity equals the ambiguity probability.
                    // 0 → fully accent (attended). 1 → fully red (missed).
                    // 0.4 → 40% red over accent → visibly faded red.
                    const isAmbiguousPast =
                      cell.status === 'past' && matrix.ambiguityProbability > 0;
                    const ambiguousTitle = isAmbiguousPast
                      ? `${cell.title} · ~${Math.round(matrix.ambiguityProbability * 100)}% chance missed`
                      : cell.title;
                    return (
                      <div
                        key={cell.key}
                        onMouseEnter={() => setHoverTitle(ambiguousTitle)}
                        onMouseLeave={() => setHoverTitle(null)}
                        style={{
                          position: 'relative',
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
                      >
                        {isAmbiguousPast ? (
                          <span
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'var(--red)',
                              opacity: matrix.ambiguityProbability,
                              borderRadius: 1,
                            }}
                          />
                        ) : null}
                      </div>
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
          {['past', 'missed', 'cancelled', 'future', 'planned-skip', 'holiday', 'exam'].map(key => {
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
