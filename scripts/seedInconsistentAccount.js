// Inconsistent-student demo seed.
//
// Builds a deliberately messy data picture for the "real student" demo:
// six courses, each with a different updating persona (consistent /
// abandoned / bursty / sparse / declining / reliable). Real cancelled
// classes, a mix of precisely-logged misses and ambiguous gaps, and
// snapshot timeseries that look like an actual person's logging
// behaviour rather than a clean weekly cadence.
//
// Idempotent: re-running resets the user's Firestore doc cleanly.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const loadLocalEnv = () => {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const keyRe = /^([A-Z_][A-Z0-9_]*)=(.*)$/;
  let currentKey = null;
  let currentVal = '';
  const flush = () => {
    if (!currentKey) return;
    let value = currentVal.trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[currentKey]) process.env[currentKey] = value;
    currentKey = null;
    currentVal = '';
  };
  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;
    const match = keyRe.exec(line);
    if (match) {
      flush();
      currentKey = match[1];
      currentVal = match[2];
    } else if (currentKey) {
      currentVal += '\n' + line;
    }
  }
  flush();
};

loadLocalEnv();

// Candidate emails — try the proper one first, fall back to known typo
// variants in case the existing Auth account uses one of those.
const DEMO_EMAIL_CANDIDATES = [
  'reallu654321@gmail.com',
  'reallu654321@gmai.com',
];
const DEMO_EMAIL_PRIMARY = DEMO_EMAIL_CANDIDATES[0];
const DEMO_PASSWORD = '123456';
const DEMO_NAME = 'Aarav';
const SEMESTER_NAME = 'Winter 2025-26';
const MIN_ATTENDANCE = 75;
const ALERT_THRESHOLD = 78;

const SEMESTER_START = new Date('2025-12-09T00:00:00');
const SEMESTER_END = new Date('2026-05-02T00:00:00');

// Slot day numbers from public/semester-data.json (4th-year slotsByYear).
// Day index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
//
// Per-course "persona" governs how the snapshot timeseries + missed
// vs ambiguous balance are generated. Calibrated so the dashboard +
// heatmap together tell six visibly different stories.
const COURSES_INPUT = [
  {
    code: 'CSE1005',
    name: 'Software Engineering - Embedded Theory',
    slotLabel: 'C2+TC2',
    slotDays: [2, 4, 5], // Tue, Thu, Fri
    credit: '3_credits',
    classesAttended: 33,
    classesTaken: 41,
    persona: 'consistent',  // 9 snapshots, 5 of 8 misses logged
    missedLoggedCount: 5,
    cancelledCount: 1,
    snapshotCount: 9,
  },
  {
    code: 'CSE2008',
    name: 'Operating Systems - Embedded Theory',
    slotLabel: 'D2+TD2',
    slotDays: [3, 4, 6], // Wed, Thu, Sat
    credit: '3_credits',
    classesAttended: 28,
    classesTaken: 42,
    persona: 'abandoned', // 4 snapshots only (early sem), then nothing
    missedLoggedCount: 4,
    cancelledCount: 2,
    snapshotCount: 4,
  },
  {
    code: 'CSE2025',
    name: 'AWS Solution Architecture - Theory Only',
    slotLabel: 'F2+TF2',
    slotDays: [2, 3, 5], // Tue, Wed, Fri
    credit: '3_credits',
    classesAttended: 32,
    classesTaken: 40,
    persona: 'bursty',  // 12 snapshots, 2x same week then long gaps
    missedLoggedCount: 1,
    cancelledCount: 0,
    snapshotCount: 12,
  },
  {
    code: 'CSE3002',
    name: 'Artificial Intelligence - Theory Only',
    slotLabel: 'E2+TE2',
    slotDays: [3, 4, 6], // Wed, Thu, Sat
    credit: '3_credits',
    classesAttended: 30,
    classesTaken: 40,
    persona: 'sparse',  // only 3 snapshots all semester
    missedLoggedCount: 0,
    cancelledCount: 1,
    snapshotCount: 3,
  },
  {
    code: 'CSE3008',
    name: 'Introduction to Machine Learning - Embedded Theory',
    slotLabel: 'G2+TG2',
    slotDays: [2, 3, 4], // Tue, Wed, Thu
    credit: '3_credits',
    classesAttended: 27,
    classesTaken: 41,
    persona: 'declining',  // 7 snapshots showing the slide down
    missedLoggedCount: 4,
    cancelledCount: 0,
    snapshotCount: 7,
  },
  {
    code: 'STS3007',
    name: 'Advanced Competitive Coding - I - Theory Only',
    slotLabel: 'B2+TB2',
    slotDays: [2, 3, 5], // Tue, Wed, Fri
    credit: '3_credits',
    classesAttended: 36,
    classesTaken: 40,
    persona: 'reliable',  // 10 snapshots, weekly cadence
    missedLoggedCount: 4,
    cancelledCount: 0,
    snapshotCount: 10,
  },
];

const courseIdFor = code => `inconsistent-${code.toLowerCase()}`;

const formatDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const loadBlockedDateSet = () => {
  const semPath = path.join(projectRoot, 'public', 'semester-data.json');
  if (!fs.existsSync(semPath)) return new Set();
  const sem = JSON.parse(fs.readFileSync(semPath, 'utf8'));
  const blocking = new Set(['holiday', 'exam', 'other']);
  const blocked = new Set();
  (sem.academicCalendar || []).forEach(event => {
    if (!blocking.has(event.type)) return;
    if (event.date) {
      blocked.add(event.date);
      return;
    }
    if (event.startDate && event.endDate) {
      const cur = new Date(`${event.startDate}T00:00:00`);
      const end = new Date(`${event.endDate}T00:00:00`);
      while (cur <= end) {
        blocked.add(formatDateKey(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
  });
  return blocked;
};

const BLOCKED_DATES = loadBlockedDateSet();

// All actual class dates for a slot (excluding holidays/exams).
const getClassDates = slotDays => {
  const dates = [];
  const cursor = new Date(SEMESTER_START);
  while (cursor <= SEMESTER_END) {
    const key = formatDateKey(cursor);
    if (slotDays.includes(cursor.getDay()) && !BLOCKED_DATES.has(key)) {
      dates.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

// Pick `count` dates spread evenly across the candidate list — used for
// missed-logged dates and snapshot anchors. Avoids clumping at one end.
const pickEvenly = (candidates, count) => {
  if (count <= 0) return [];
  if (candidates.length <= count) return candidates.slice();
  const step = candidates.length / count;
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    picks.push(candidates[Math.floor(i * step + step / 2)]);
  }
  return picks;
};

// Pick cancelled-class dates: realistic mid-semester placement. Pulled
// from the middle of the slot's class-date list so they don't cluster
// near holidays.
const pickCancelledDates = (classDates, count) => {
  if (count <= 0 || classDates.length === 0) return [];
  const start = Math.floor(classDates.length * 0.3);
  const end = Math.floor(classDates.length * 0.8);
  const middle = classDates.slice(start, end);
  return pickEvenly(middle, count);
};

// Snapshot-date generators per persona. Each returns an array of ISO
// dates (with afternoon timestamps) capped to today-ish. The dates are
// intentionally NOT class days — students typically check VTOP after
// class, often the next day or weekend.
const buildSnapshotDates = (persona, count) => {
  const start = SEMESTER_START.getTime();
  const end = SEMESTER_END.getTime();
  const span = end - start;
  const dates = [];

  const addDate = offsetDays => {
    const date = new Date(start);
    date.setDate(date.getDate() + offsetDays);
    date.setHours(16, 30, 0, 0); // afternoon-ish, after classes done
    dates.push(date);
  };

  if (persona === 'consistent') {
    // Roughly every 2-3 weeks, slight irregularity
    [10, 21, 35, 52, 70, 92, 115, 135, 145].slice(0, count).forEach(addDate);
  } else if (persona === 'abandoned') {
    // Heavy in first 6 weeks, then radio silence
    [9, 18, 28, 42].slice(0, count).forEach(addDate);
  } else if (persona === 'bursty') {
    // Scattered with same-week clusters and long gaps
    [12, 13, 28, 35, 38, 60, 90, 92, 118, 120, 138, 145].slice(0, count).forEach(addDate);
  } else if (persona === 'sparse') {
    // Three points across the entire semester
    [25, 75, 140].slice(0, count).forEach(addDate);
  } else if (persona === 'declining') {
    // Even cadence but tapering — gaps grow as the semester ends
    [11, 25, 45, 65, 90, 115, 145].slice(0, count).forEach(addDate);
  } else if (persona === 'reliable') {
    // Weekly clockwork
    [7, 14, 28, 42, 56, 70, 84, 105, 126, 145].slice(0, count).forEach(addDate);
  } else {
    // Fallback: even spread
    for (let i = 0; i < count; i += 1) {
      addDate(Math.round((i / Math.max(1, count - 1)) * (span / (24 * 60 * 60 * 1000))));
    }
  }

  return dates;
};

const buildSnapshots = ({ course, classDates, cancelledDates, snapshotDates }) => {
  const cancelledSet = new Set(cancelledDates);
  const finalTaken = course.classesTaken;
  const finalAttended = course.classesAttended;
  const finalPct = (finalAttended / finalTaken) * 100;

  // For each snapshot, compute classesElapsed = real (uncancelled) class
  // days that occurred up to that date. classesAttended eased from a
  // "high early" reading down to the final percentage so the trajectory
  // looks realistic. Final snapshot pinned to exact final values.
  return snapshotDates.map((date, idx) => {
    const dateKey = formatDateKey(date);
    const classesElapsed = classDates.filter(
      d => d <= dateKey && !cancelledSet.has(d)
    ).length;

    const fraction = snapshotDates.length === 1 ? 1 : idx / (snapshotDates.length - 1);
    const startPct = Math.min(95, finalPct + 12);
    // Linear-ish drift with a slight downward curve so the slide reads
    // visually rather than landing flat.
    const easedPct = startPct + (finalPct - startPct) * Math.pow(fraction, 1.25);
    const noise = Math.sin(idx * 1.7 + finalTaken) * 1.4;
    const targetPct = Math.max(50, Math.min(100, easedPct + noise));

    let attended;
    let taken;
    if (idx === snapshotDates.length - 1) {
      attended = finalAttended;
      taken = finalTaken;
    } else {
      taken = Math.max(1, classesElapsed);
      attended = Math.min(taken, Math.max(0, Math.round((targetPct / 100) * taken)));
    }
    const actualPct = taken > 0 ? (attended / taken) * 100 : 0;

    let riskLabel = 'Safe';
    if (actualPct < MIN_ATTENDANCE - 4) riskLabel = 'Critical';
    else if (actualPct < MIN_ATTENDANCE) riskLabel = 'Warning';
    const riskScore = Math.max(0, Math.min(100, Math.round(100 - actualPct)));

    return {
      id: `snapshot-${course.code}-${idx + 1}`,
      courseId: courseIdFor(course.code),
      attendancePercentage: Number(actualPct.toFixed(1)),
      classesTaken: taken,
      classesAttended: attended,
      riskScore,
      riskLabel,
      createdAt: date.toISOString(),
    };
  });
};

const buildUserDoc = () => {
  const now = new Date();
  const courses = [];
  const allSnapshots = [];

  COURSES_INPUT.forEach(c => {
    const classDates = getClassDates(c.slotDays);

    const cancelledDates = pickCancelledDates(classDates, c.cancelledCount);
    const cancelledSet = new Set(cancelledDates);

    // Past-and-not-cancelled class dates are the candidates for "missed
    // and logged" — we pick a subset proportional to missedLoggedCount.
    // Spread evenly so the heatmap reads as scattered misses rather than
    // a single ugly streak.
    const todayKey = formatDateKey(new Date());
    const pastClassDates = classDates.filter(
      d => d <= todayKey && !cancelledSet.has(d)
    );
    const missedDates = pickEvenly(pastClassDates, c.missedLoggedCount);

    const snapshotDates = buildSnapshotDates(c.persona, c.snapshotCount);
    const snapshots = buildSnapshots({
      course: c,
      classDates,
      cancelledDates,
      snapshotDates,
    });

    // Per-course lastUpdated tells the inconsistent story directly:
    // CSE2008's last update is 3 months old, CSE1005's is 9 days old.
    const lastSnapshot = snapshots[snapshots.length - 1];
    const lastUpdated = lastSnapshot ? new Date(lastSnapshot.createdAt) : now;

    courses.push({
      id: courseIdFor(c.code),
      courseName: `${c.code} - ${c.name}`,
      slotLabel: c.slotLabel,
      slotDays: c.slotDays,
      credit: c.credit,
      classesTaken: c.classesTaken,
      classesAttended: c.classesAttended,
      skippedDates: [], // semester is over — no future planned skips
      missedDates,
      cancelledDates,
      lastUpdated: lastUpdated.toISOString(),
    });

    snapshots.forEach(s => allSnapshots.push(s));
  });

  // Sort all snapshots chronologically (cap at 120 honoured by serializer).
  allSnapshots.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const primary = courses[0];
  return {
    name: DEMO_NAME,
    email: DEMO_EMAIL_PRIMARY,
    role: 'student',
    selectedYear: '4th_year',
    selectedCredit: primary.credit,
    selectedSlot: primary.slotLabel,
    slotDays: primary.slotDays,
    courses,
    attendanceSnapshots: allSnapshots.slice(-120),
    alertEnabled: true,
    alertThreshold: ALERT_THRESHOLD,
    weeklySummaryEnabled: true,
    notificationChannels: { telegram: { botToken: '', chatId: '' } },
    lastEmailSentAt: '',
    lastCheckedAt: now.toISOString(),
    adminDraft: {
      semesterName: SEMESTER_NAME,
      minAttendance: MIN_ATTENDANCE,
      lastInstructionalDay: '2026-05-02',
      eventCount: 0,
      slotVersion: 'VIT-AP active mapping',
    },
    theme: 'dark',
    lastUpdated: now.toISOString(),
  };
};

const findExistingUser = async auth => {
  for (const candidate of DEMO_EMAIL_CANDIDATES) {
    try {
      const record = await auth.getUserByEmail(candidate);
      return { record, foundEmail: candidate };
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }
  }
  return { record: null, foundEmail: null };
};

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set in .env');
  const serviceAccount = JSON.parse(raw);

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const auth = admin.auth();
  const db = admin.firestore();

  const { record: existing, foundEmail } = await findExistingUser(auth);
  let userRecord = existing;

  if (existing) {
    console.log(
      `Found existing auth user ${foundEmail} (uid=${existing.uid}). Resetting password to ${DEMO_PASSWORD}.`
    );
    await auth.updateUser(existing.uid, {
      password: DEMO_PASSWORD,
      displayName: DEMO_NAME,
      emailVerified: true,
    });
  } else {
    console.log(`No existing auth user found for any candidate. Creating ${DEMO_EMAIL_PRIMARY}.`);
    userRecord = await auth.createUser({
      email: DEMO_EMAIL_PRIMARY,
      password: DEMO_PASSWORD,
      displayName: DEMO_NAME,
      emailVerified: true,
    });
    console.log(`Created uid=${userRecord.uid}.`);
  }

  const userDocRef = db.collection('users').doc(userRecord.uid);
  await userDocRef.delete().catch(() => {});
  const payload = buildUserDoc();
  await userDocRef.set(payload);

  console.log('---');
  console.log(`Seeded users/${userRecord.uid}`);
  console.log(`  Email used: ${foundEmail || DEMO_EMAIL_PRIMARY}`);
  console.log(`  Courses: ${payload.courses.length}`);
  console.log(`  Snapshots: ${payload.attendanceSnapshots.length}`);
  payload.courses.forEach(course => {
    console.log(
      `  - ${course.courseName.split(' - ')[0]}  ` +
        `${course.classesAttended}/${course.classesTaken}  ` +
        `(missed-logged ${course.missedDates.length}, ` +
        `cancelled ${course.cancelledDates.length})`
    );
  });
  console.log(`  Login: ${foundEmail || DEMO_EMAIL_PRIMARY} / ${DEMO_PASSWORD}`);
  console.log('Done.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
