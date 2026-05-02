import { DecisionTreeClassifier } from 'ml-cart';
import { linearRegression, linearRegressionLine } from 'simple-statistics';

import { MIN_ATTENDANCE } from '../data/constants.js';
import { formatDate } from './dateUtils.js';

const RISK_LABELS = ['Safe', 'Warning', 'Critical'];
const DAY_MS = 24 * 60 * 60 * 1000;
const BLOCKING_EVENT_TYPES = new Set(['holiday', 'exam', 'other']);
const MAX_RECOVERY_PROBES = 300;
const FORECAST_MIN_SAMPLES = 4;
const FORECAST_EWMA_ALPHA = 0.4;
const FORECAST_FALLBACK_HORIZON_DAYS = 30;
const FORECAST_CONFIDENCE_Z = 1.96;

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const toNumber = value => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const parseDate = value => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildBlockedDateSet = academicCalendar => {
  const blockedDates = new Set();

  (academicCalendar || []).forEach(event => {
    if (!BLOCKING_EVENT_TYPES.has(event.type)) {
      return;
    }

    if (event.date) {
      const date = parseDate(event.date);
      if (date) {
        blockedDates.add(formatDate(date));
      }
      return;
    }

    const startDate = parseDate(event.startDate);
    const endDate = parseDate(event.endDate);

    if (!startDate || !endDate) {
      return;
    }

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      blockedDates.add(formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return blockedDates;
};

export const getRemainingClassDates = (
  slotDays,
  academicCalendar,
  lastInstructionalDay,
  fromDate = new Date()
) => {
  const finalDay = parseDate(lastInstructionalDay);

  if (!Array.isArray(slotDays) || slotDays.length === 0 || !finalDay) {
    return [];
  }

  const blockedDates = buildBlockedDateSet(academicCalendar);
  // Clone so the loop's setDate/setHours never mutate the caller's Date.
  // AttendanceHeatmap reuses its `start` Date for inSemester checks AND
  // passes it here per course — without this clone the first call shifts
  // `start` past the end of the semester and every later check breaks.
  const currentDate = new Date((parseDate(fromDate) || new Date()).getTime());
  const classDates = [];

  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= finalDay) {
    const dateKey = formatDate(currentDate);

    if (slotDays.includes(currentDate.getDay()) && !blockedDates.has(dateKey)) {
      classDates.push(dateKey);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return classDates;
};

const buildTrend = snapshots => {
  const points = (Array.isArray(snapshots) ? snapshots : [])
    .map((snapshot, index) => [index, toNumber(snapshot.attendancePercentage)])
    .filter(([, value]) => value > 0);

  if (points.length < 2) {
    return { slope: 0, direction: 'stable', predictedNext: points[0]?.[1] || 0 };
  }

  const regression = linearRegression(points);
  const line = linearRegressionLine(regression);
  const slope = Number(regression.m) || 0;

  return {
    slope,
    direction: slope > 0.35 ? 'improving' : slope < -0.35 ? 'declining' : 'stable',
    predictedNext: clamp(line(points.length)),
  };
};

// Forecast attendance using a linear regression on the (days, percentage)
// timeseries plus an EWMA-smoothed "current" reading. Confidence band is
// derived from the residual standard deviation. Returns { ready: false }
// when there are too few snapshots to fit a meaningful trend.
export const forecastAttendance = (snapshots, { lastInstructionalDay, fromDate } = {}) => {
  const ordered = (Array.isArray(snapshots) ? snapshots : [])
    .map(snapshot => ({
      time: parseDate(snapshot.createdAt),
      value: toNumber(snapshot.attendancePercentage),
    }))
    .filter(entry => entry.time && entry.value > 0)
    .sort((a, b) => a.time - b.time);

  if (ordered.length < FORECAST_MIN_SAMPLES) {
    return { ready: false, sampleSize: ordered.length };
  }

  const startMs = ordered[0].time.getTime();
  const points = ordered.map(entry => [
    (entry.time.getTime() - startMs) / DAY_MS,
    entry.value,
  ]);

  const regression = linearRegression(points);
  const line = linearRegressionLine(regression);
  const slopePerDay = Number(regression.m) || 0;

  let smoothed = points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    smoothed = FORECAST_EWMA_ALPHA * points[index][1] + (1 - FORECAST_EWMA_ALPHA) * smoothed;
  }

  const residuals = points.map(([x, y]) => y - line(x));
  const variance = residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length;
  const stdError = Math.sqrt(variance);

  const targetDate = parseDate(lastInstructionalDay);
  const referenceDate = parseDate(fromDate) || new Date();
  const lastX = points[points.length - 1][0];
  const horizonX = targetDate
    ? Math.max(lastX, (targetDate.getTime() - startMs) / DAY_MS)
    : (referenceDate.getTime() - startMs) / DAY_MS + FORECAST_FALLBACK_HORIZON_DAYS;

  const predicted = clamp(line(horizonX));
  const margin = FORECAST_CONFIDENCE_Z * stdError;

  return {
    ready: true,
    sampleSize: ordered.length,
    smoothedCurrent: Number(clamp(smoothed).toFixed(1)),
    predicted: Number(predicted.toFixed(1)),
    low: Number(clamp(predicted - margin).toFixed(1)),
    high: Number(clamp(predicted + margin).toFixed(1)),
    slopePerDay: Number(slopePerDay.toFixed(3)),
    stdError: Number(stdError.toFixed(2)),
  };
};

let classifier = null;

const getClassifier = () => {
  if (classifier) {
    return classifier;
  }

  const trainingSet = [
    [88, 88, 6, 0, 0],
    [82, 80, 3, 0, 0],
    [76, 77, 1, 0, 0],
    [74, 76, 0, 1, 0],
    [72, 74, -1, 2, 0],
    [69, 73, -2, 3, -1],
    [64, 70, -3, 4, -1],
    [58, 66, -4, 6, -1],
    [78, 73, -1, 2, -1],
    [84, 72, -2, 4, -1],
  ];
  const labels = [0, 0, 0, 1, 1, 1, 2, 2, 1, 1];

  classifier = new DecisionTreeClassifier({
    gainFunction: 'gini',
    maxDepth: 4,
    minNumSamples: 2,
  });
  classifier.train(trainingSet, labels);

  return classifier;
};

const getMlLabel = features => {
  try {
    const prediction = getClassifier().predict([features]);
    return RISK_LABELS[prediction[0]] || 'Warning';
  } catch {
    return 'Warning';
  }
};

const getRecoveryClassesNeeded = (classesTaken, classesAttended, threshold) => {
  if (classesTaken <= 0) {
    return 0;
  }

  let requiredClasses = 0;
  let projectedTaken = classesTaken;
  let projectedAttended = classesAttended;

  while (projectedTaken > 0 && (projectedAttended / projectedTaken) * 100 < threshold) {
    requiredClasses += 1;
    projectedTaken += 1;
    projectedAttended += 1;

    if (requiredClasses > MAX_RECOVERY_PROBES) {
      break;
    }
  }

  return requiredClasses;
};

const getRecommendation = analytics => {
  if (analytics.riskLabel === 'Critical') {
    return `Attend the next ${Math.max(analytics.recoveryClassesNeeded, 1)} class${analytics.recoveryClassesNeeded === 1 ? '' : 'es'} before planning any skip.`;
  }

  if (analytics.riskLabel === 'Warning') {
    return analytics.remainingSkips >= 0
      ? 'Keep planned skips limited and recheck after the next attendance update.'
      : 'Cancel planned skips and attend upcoming classes to rebuild the buffer.';
  }

  return analytics.remainingSkips > 0
    ? `You have a safe buffer of ${analytics.remainingSkips} skip${analytics.remainingSkips === 1 ? '' : 's'} based on the current plan.`
    : 'You are safe, but there is no extra skip buffer right now.';
};

export const calculateAttendanceAnalytics = ({
  course = {},
  semester = {},
  snapshots = [],
  fromDate = new Date(),
} = {}) => {
  const classesTaken = Math.max(0, toNumber(course.classesTaken));
  const classesAttended = clamp(toNumber(course.classesAttended), 0, classesTaken);
  const plannedSkips = Array.isArray(course.plannedSkips)
    ? course.plannedSkips
    : Array.isArray(course.skippedDates)
      ? course.skippedDates
      : [];
  const threshold = toNumber(semester.minAttendance) || MIN_ATTENDANCE;
  const remainingClassDates = getRemainingClassDates(
    course.slotDays,
    semester.academicCalendar,
    semester.lastInstructionalDay,
    fromDate
  );
  const remainingClasses = remainingClassDates.length;
  const totalClasses = classesTaken + remainingClasses;
  const skippedSoFar = Math.max(0, classesTaken - classesAttended);
  const plannedSkipCount = plannedSkips.length;
  const currentAttendance = classesTaken > 0 ? (classesAttended / classesTaken) * 100 : 0;
  const projectedAttended = classesAttended + Math.max(0, remainingClasses - plannedSkipCount);
  const projectedAttendance = totalClasses > 0 ? (projectedAttended / totalClasses) * 100 : 0;
  const totalAllowedSkips = Math.floor(totalClasses * (1 - threshold / 100));
  const remainingSkips = totalClasses > 0
    ? totalAllowedSkips - skippedSoFar - plannedSkipCount
    : 0;
  const recoveryClassesNeeded = getRecoveryClassesNeeded(classesTaken, classesAttended, threshold);
  const lastInstructionalDay = parseDate(semester.lastInstructionalDay);
  const daysLeft = lastInstructionalDay
    ? Math.max(0, Math.ceil((lastInstructionalDay - (parseDate(fromDate) || new Date())) / DAY_MS))
    : 0;
  const trend = buildTrend(snapshots);
  const forecast = forecastAttendance(snapshots, {
    lastInstructionalDay: semester.lastInstructionalDay,
    fromDate,
  });
  const trendBucket = trend.slope > 0.35 ? 1 : trend.slope < -0.35 ? -1 : 0;
  const classifierLabel = getMlLabel([
    currentAttendance,
    projectedAttendance,
    remainingSkips,
    recoveryClassesNeeded,
    trendBucket,
  ]);
  const riskScore = clamp(
    100 - projectedAttendance +
      (classesTaken > 0 ? Math.max(0, threshold - currentAttendance) * 1.2 : 0) +
      Math.max(0, -remainingSkips) * 8 +
      recoveryClassesNeeded * 3 +
      plannedSkipCount * 1.5 +
      (trend.direction === 'declining' ? 8 : trend.direction === 'improving' ? -5 : 0)
  );
  const formulaLabel =
    projectedAttendance < threshold - 4 || currentAttendance < threshold - 8 || riskScore >= 70
      ? 'Critical'
      : projectedAttendance < threshold || currentAttendance < threshold || riskScore >= 40
        ? 'Warning'
        : 'Safe';
  const riskLabel =
    RISK_LABELS.indexOf(classifierLabel) > RISK_LABELS.indexOf(formulaLabel)
      ? classifierLabel
      : formulaLabel;

  const analytics = {
    currentAttendance: Number(currentAttendance.toFixed(1)),
    projectedAttendance: Number(projectedAttendance.toFixed(1)),
    remainingClasses,
    remainingSkips,
    recoveryClassesNeeded,
    isRecoveryImpossible: recoveryClassesNeeded > remainingClasses,
    riskScore: Math.round(riskScore),
    riskLabel,
    classifierLabel,
    trend,
    forecast,
    daysLeft,
    plannedSkipCount,
    remainingClassDates,
  };

  return {
    ...analytics,
    recommendation: getRecommendation(analytics),
  };
};

export const buildDashboardSummary = ({ courses = [], semester = {}, snapshotsByCourse = {} } = {}) => {
  const courseAnalytics = (Array.isArray(courses) ? courses : []).map(course => ({
    course,
    analytics: calculateAttendanceAnalytics({
      course,
      semester,
      snapshots: snapshotsByCourse[course.id] || [],
    }),
  }));
  const trackedCourses = courseAnalytics.filter(item => toNumber(item.course.classesTaken) > 0);
  const averageAttendance = trackedCourses.length
    ? trackedCourses.reduce((total, item) => total + item.analytics.currentAttendance, 0) /
      trackedCourses.length
    : 0;
  const safeCourses = courseAnalytics.filter(item => item.analytics.riskLabel === 'Safe');
  const warningCourses = courseAnalytics.filter(item => item.analytics.riskLabel === 'Warning');
  const criticalCourses = courseAnalytics.filter(item => item.analytics.riskLabel === 'Critical');
  const highestRiskCourse = [...courseAnalytics].sort(
    (a, b) => b.analytics.riskScore - a.analytics.riskScore
  )[0] || null;

  return {
    totalCourses: courseAnalytics.length,
    safeCourses: safeCourses.length,
    warningCourses: warningCourses.length,
    criticalCourses: criticalCourses.length,
    averageAttendance: Number(averageAttendance.toFixed(1)),
    highestRiskCourse,
    courseAnalytics,
  };
};
