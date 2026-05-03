import React, { useMemo, useState } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Attendance % buckets used to colour each cell. Picked to align with the
// 75% minimum-attendance threshold the rest of the app uses: anything above
// is comfortable, 70-79 is the warning band, 60-69 is critical, < 60 is a
// fail. Same buckets are surfaced in the legend.
const BUCKETS = [
  { label: '≥ 80%', min: 80, max: 101, fill: 'var(--green)', dim: 'var(--green-dim)' },
  { label: '70–79%', min: 70, max: 80, fill: 'var(--amber)', dim: 'var(--amber-dim)' },
  { label: '60–69%', min: 60, max: 70, fill: '#f59e0b', dim: 'rgba(245, 158, 11, 0.18)' },
  { label: '< 60%', min: 0, max: 60, fill: 'var(--red)', dim: 'var(--red-dim)' },
];

const bucketFor = pct => {
  if (!Number.isFinite(pct)) return null;
  return BUCKETS.find(bucket => pct >= bucket.min && pct < bucket.max) || BUCKETS[BUCKETS.length - 1];
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

// Reduce each course's chronological snapshots to one reading per ISO week:
// the latest snapshot whose week-start matches that column. Snapshots can
// be irregular (one per week is typical, but the schema permits multiple),
// so we pick the most recent reading inside each week as the "end-of-week"
// value — matches what a student would see if they opened the dashboard
// at the end of that week.
const buildMatrix = ({ courses, snapshots, semesterData }) => {
  const start = semesterStartFromCalendar(semesterData?.academicCalendar);
  const end =
    semesterData?.lastInstructionalDay instanceof Date
      ? semesterData.lastInstructionalDay
      : semesterData?.lastInstructionalDay
        ? new Date(semesterData.lastInstructionalDay)
        : null;

  if (!start || !end || !Array.isArray(courses) || courses.length === 0) {
    return null;
  }

  const firstColumn = startOfWeek(start);
  const lastColumn = startOfWeek(end);
  const totalWeeks = Math.max(1, Math.round((lastColumn - firstColumn) / WEEK_MS) + 1);

  const monthLabels = [];
  for (let week = 0; week < totalWeeks; week += 1) {
    const date = new Date(firstColumn);
    date.setDate(date.getDate() + week * 7);
    if (week === 0 || date.getDate() <= 7) {
      monthLabels.push(date.toLocaleString('en-US', { month: 'short' }));
    } else {
      monthLabels.push('');
    }
  }

  const snapshotsByCourse = new Map();
  (Array.isArray(snapshots) ? snapshots : []).forEach(snapshot => {
    const courseId = snapshot?.courseId;
    if (!courseId) return;
    const list = snapshotsByCourse.get(courseId) || [];
    list.push(snapshot);
    snapshotsByCourse.set(courseId, list);
  });

  const rows = courses.map(course => {
    const courseSnapshots = (snapshotsByCourse.get(course.id) || [])
      .map(snapshot => ({
        time: new Date(snapshot.createdAt).getTime(),
        pct: Number(snapshot.attendancePercentage),
      }))
      .filter(entry => Number.isFinite(entry.time) && Number.isFinite(entry.pct))
      .sort((a, b) => a.time - b.time);

    const weeklyValues = new Array(totalWeeks).fill(null);
    courseSnapshots.forEach(entry => {
      const weekIndex = Math.floor((entry.time - firstColumn.getTime()) / WEEK_MS);
      if (weekIndex < 0 || weekIndex >= totalWeeks) return;
      // Keep the latest reading inside the week (snapshots are sorted, so
      // a later iteration naturally overwrites an earlier same-week one).
      weeklyValues[weekIndex] = entry.pct;
    });

    // Forward-fill: between snapshots the attendance % doesn't change, so
    // an empty cell after the first reading should inherit the previous
    // value rather than read as "no data". Cells before the first reading
    // stay null (course wasn't being tracked yet).
    let lastSeen = null;
    const filledValues = weeklyValues.map(value => {
      if (value !== null) {
        lastSeen = value;
        return value;
      }
      return lastSeen;
    });

    const finalPct = filledValues[filledValues.length - 1];

    return {
      course,
      values: filledValues,
      finalPct,
    };
  });

  return { rows, monthLabels, totalWeeks };
};

const AttendanceHeatmap = ({ courses = [], snapshots = [], semesterData }) => {
  const [hover, setHover] = useState(null);

  const matrix = useMemo(
    () => buildMatrix({ courses, snapshots, semesterData }),
    [courses, snapshots, semesterData]
  );

  if (!matrix) {
    return (
      <p className="text-sm text-text-muted">
        Heatmap will appear once the semester calendar and at least one course are available.
      </p>
    );
  }

  const cellSize = 14;
  const cellGap = 3;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col">
          <div
            className="flex items-end"
            style={{ gap: `${cellGap}px`, paddingLeft: 200 }}
          >
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

          <div className="mt-1 flex flex-col" style={{ gap: `${cellGap}px` }}>
            {matrix.rows.map(row => {
              const finalBucket = bucketFor(row.finalPct);
              return (
                <div
                  key={row.course.id}
                  className="flex items-center"
                  style={{ gap: `${cellGap}px` }}
                >
                  <div
                    className="flex shrink-0 items-center pr-2"
                    style={{ width: 200 }}
                  >
                    <span className="truncate text-[11px] font-medium text-text-secondary">
                      {row.course.courseName || row.course.slotLabel}
                    </span>
                  </div>

                  {row.values.map((value, weekIndex) => {
                    const bucket = bucketFor(value);
                    const isEmpty = value === null;
                    const isHover =
                      hover &&
                      hover.courseId === row.course.id &&
                      hover.weekIndex === weekIndex;
                    return (
                      <button
                        key={weekIndex}
                        type="button"
                        onMouseEnter={() =>
                          setHover({ courseId: row.course.id, weekIndex, value })
                        }
                        onMouseLeave={() => setHover(null)}
                        onFocus={() =>
                          setHover({ courseId: row.course.id, weekIndex, value })
                        }
                        onBlur={() => setHover(null)}
                        aria-label={
                          isEmpty
                            ? `${row.course.courseName} week ${weekIndex + 1}: no reading`
                            : `${row.course.courseName} week ${weekIndex + 1}: ${value.toFixed(1)}%`
                        }
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: isEmpty
                            ? 'transparent'
                            : bucket?.fill || 'var(--bg-elevated)',
                          borderRadius: 2,
                          border: isEmpty
                            ? '1px solid var(--border-faint)'
                            : `1px solid ${bucket?.fill || 'var(--border-default)'}`,
                          opacity: isHover ? 0.85 : 1,
                          cursor: 'pointer',
                          transition: 'opacity 0.1s',
                        }}
                      />
                    );
                  })}

                  <span
                    className="ml-2 shrink-0 font-mono text-[11px] text-text-secondary"
                    style={{ minWidth: 44, textAlign: 'right' }}
                  >
                    {Number.isFinite(row.finalPct) ? `${row.finalPct.toFixed(1)}%` : '—'}
                  </span>
                  <span
                    className="ml-1 inline-block h-2 w-2 shrink-0"
                    style={{
                      backgroundColor: finalBucket?.fill || 'transparent',
                      borderRadius: '50%',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-faint pt-3 text-[11px] text-text-muted">
        <span className="font-mono uppercase tracking-wider text-text-muted">Attendance</span>
        {BUCKETS.map(bucket => (
          <div key={bucket.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ backgroundColor: bucket.fill, borderRadius: 2 }}
            />
            {bucket.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-faint)',
              borderRadius: 2,
            }}
          />
          No reading
        </div>
        {hover && Number.isFinite(hover.value) ? (
          <span className="ml-auto font-mono text-text-secondary">
            Week {hover.weekIndex + 1} · {hover.value.toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default AttendanceHeatmap;
