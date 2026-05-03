// Shared logic for figuring out the next exam-eligibility checkpoint
// (CAT-1 / CAT-2 / FAT). Dates come from .env first, then fall back to
// matching event names in the public/semester-data.json academic calendar.
// Both PlannerView and the Dashboard's Exam Horizon panel consume this so
// the headline checkpoint date is identical everywhere it's shown.

const parseEventDate = event => {
  const value = event?.startDate || event?.date;
  if (!value) return null;
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEnvDate = value => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayBefore = date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() - 1);
  return nextDate;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const findExamCutoff = (events, matcher) => {
  const matchingDates = (events || [])
    .filter(event => matcher(String(event.name || '').toLowerCase()))
    .map(parseEventDate)
    .filter(Boolean)
    .sort((a, b) => a - b);

  return matchingDates[0] ? dayBefore(matchingDates[0]) : null;
};

export const buildProjectionHorizons = semesterData => {
  const lastInstructionalDay =
    semesterData?.lastInstructionalDay instanceof Date
      ? semesterData.lastInstructionalDay
      : semesterData?.lastInstructionalDay
        ? new Date(semesterData.lastInstructionalDay)
        : null;
  const events = semesterData?.academicCalendar || [];
  const horizons = [
    {
      key: 'cat1',
      label: 'CAT-1',
      date:
        parseEnvDate(import.meta.env.VITE_CAT1_START_DATE) ||
        findExamCutoff(events, name => name.includes('cat-1') || name.includes('cat 1')),
    },
    {
      key: 'cat2',
      label: 'CAT-2',
      date:
        parseEnvDate(import.meta.env.VITE_CAT2_START_DATE) ||
        findExamCutoff(events, name => name.includes('cat-2') || name.includes('cat 2')),
    },
    {
      key: 'fat',
      label: 'FAT',
      date:
        parseEnvDate(import.meta.env.VITE_FAT_START_DATE) ||
        findExamCutoff(events, name => name.includes('fat')) ||
        lastInstructionalDay,
    },
  ];

  const today = startOfToday();

  return horizons
    .filter(horizon => horizon.date)
    .map(horizon => ({
      ...horizon,
      isPast: horizon.key !== 'fat' && horizon.date < today,
    }));
};

// Returns the next upcoming horizon, or the FAT horizon as a fallback if
// every checkpoint is already in the past. Returns null if no horizons
// exist at all (no env var set, no calendar events match).
export const getNextCheckpoint = semesterData => {
  const horizons = buildProjectionHorizons(semesterData);
  if (horizons.length === 0) return null;
  const upcoming = horizons.find(horizon => !horizon.isPast);
  return upcoming || horizons[horizons.length - 1];
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days remaining between today and the checkpoint. Negative when the
// checkpoint has passed, zero when it lands on today.
export const daysUntil = date => {
  if (!date) return null;
  const today = startOfToday();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / DAY_MS);
};
