import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateAttendanceAnalytics,
  forecastAttendance,
  getRemainingClassDates,
} from '../src/utils/attendanceAnalytics.js';
import { buildAttendanceEmailText } from '../api/lib/email.js';

const semester = {
  minAttendance: 75,
  lastInstructionalDay: '2026-05-02',
  academicCalendar: [
    { date: '2026-04-14', type: 'holiday', name: 'Holiday' },
    { startDate: '2026-04-24', endDate: '2026-04-30', type: 'exam', name: 'Exam Block' },
  ],
};

describe('getRemainingClassDates', () => {
  it('skips holidays and exam ranges', () => {
    const dates = getRemainingClassDates([2, 4], semester.academicCalendar, '2026-05-02', '2026-04-13');
    assert.ok(dates.length > 0);
    assert.ok(!dates.includes('2026-04-14'));
    assert.ok(!dates.includes('2026-04-28'));
  });

  it('returns empty for invalid input', () => {
    assert.deepEqual(getRemainingClassDates([], [], '2026-05-02'), []);
    assert.deepEqual(getRemainingClassDates([1, 2], [], null), []);
  });
});

describe('calculateAttendanceAnalytics', () => {
  it('flags critical when projection is below threshold', () => {
    const analytics = calculateAttendanceAnalytics({
      course: { slotDays: [2, 4], classesTaken: 30, classesAttended: 18, skippedDates: [] },
      semester,
      fromDate: '2026-04-13',
    });
    assert.equal(analytics.riskLabel, 'Critical');
    assert.ok(analytics.recoveryClassesNeeded > 0);
  });

  it('reports a positive skip buffer when comfortably above threshold', () => {
    const analytics = calculateAttendanceAnalytics({
      course: { slotDays: [2, 4], classesTaken: 30, classesAttended: 29, skippedDates: [] },
      semester,
      fromDate: '2026-04-13',
    });
    assert.equal(analytics.riskLabel, 'Safe');
    assert.ok(analytics.remainingSkips >= 0);
  });

  it('handles a course with zero data without throwing', () => {
    const analytics = calculateAttendanceAnalytics({
      course: { slotDays: [2, 4] },
      semester,
      fromDate: '2026-04-13',
    });
    assert.equal(analytics.currentAttendance, 0);
    assert.equal(analytics.recoveryClassesNeeded, 0);
  });
});

describe('forecastAttendance', () => {
  it('returns ready=false for sparse snapshots', () => {
    const result = forecastAttendance([
      { createdAt: '2026-03-01', attendancePercentage: 80 },
      { createdAt: '2026-03-08', attendancePercentage: 78 },
    ]);
    assert.equal(result.ready, false);
    assert.equal(result.sampleSize, 2);
  });

  it('produces a confidence band when enough snapshots exist', () => {
    const snapshots = [
      { createdAt: '2026-03-01', attendancePercentage: 82 },
      { createdAt: '2026-03-08', attendancePercentage: 80 },
      { createdAt: '2026-03-15', attendancePercentage: 78 },
      { createdAt: '2026-03-22', attendancePercentage: 76 },
      { createdAt: '2026-03-29', attendancePercentage: 75 },
    ];
    const result = forecastAttendance(snapshots, { lastInstructionalDay: '2026-05-02' });
    assert.equal(result.ready, true);
    assert.ok(result.predicted >= 0 && result.predicted <= 100);
    assert.ok(result.low <= result.predicted);
    assert.ok(result.high >= result.predicted);
    assert.ok(result.slopePerDay < 0, 'declining series should have negative slope');
  });
});

describe('buildAttendanceEmailText', () => {
  it('sanitizes newline injection in course names', () => {
    const text = buildAttendanceEmailText({
      summary: { averageAttendance: 80, safeCourses: 1, warningCourses: 0, criticalCourses: 0 },
      courses: [
        {
          course: { courseName: 'Bad\nname\rinjection' },
          analytics: { riskLabel: 'Safe', riskScore: 10, recommendation: 'ok' },
        },
      ],
    });
    assert.ok(!text.includes('\nname'));
    assert.ok(!text.includes('\rinjection'));
  });
});
