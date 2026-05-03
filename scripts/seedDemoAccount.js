// Seeds a fully-populated demo account for the project review demo.
// - Creates (or reuses) the Firebase Auth user with a known password
// - Writes a users/{uid} Firestore document with 6 theory courses
// - Backfills attendanceSnapshots across the semester so the ML trend,
//   forecast, and decision-tree risk classifier all render realistically

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Multi-line aware .env loader. The project's .env stores
// FIREBASE_SERVICE_ACCOUNT as pretty-printed JSON spanning ~13 lines, so
// the naive line-by-line parser used elsewhere truncates it to "{". We
// accumulate continuation lines until we hit the next KEY= line.
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

const DEMO_EMAIL = 'abhishek.22bce7566@vitapstudent.ac.in';
const DEMO_PASSWORD = '123456';
const DEMO_NAME = 'Abhishek';
const SEMESTER_NAME = 'Winter 2025-26';
const MIN_ATTENDANCE = 75;
const ALERT_THRESHOLD = 78;

// Theory-only courses (labs intentionally ignored). Slot codes and slotDays
// are real VIT-AP data from public/semester-data.json. classesTaken values
// are calibrated to each slot's actual maximum class count for WIN 2025-26
// (Dec 9 → May 2 minus holidays/exam blocks); classesAttended values are
// hand-picked to give the demo a strong distribution: one Critical course
// (CSE3018) for the ML risk story, one borderline Warning at the threshold
// (CSE4016 right at 75%), four Safe courses with realistic spread.
//
// Per-slot max class counts derived by getRemainingClassDates():
//   D2+TD2+TDD2 → 57    B2+TB2 → 40    C2+TC2 → 41
//   B1+TB1      → 40    F2+TF2 → 40    A2+TA2 → 41
const COURSES_INPUT = [
  {
    code: 'CSE1008',
    name: 'Theory of Computation',
    slotLabel: 'D2+TD2+TDD2',
    slotDays: [2, 3, 4, 6],
    credit: '4_credits',
    classesAttended: 47,
    classesTaken: 55,
    faculty: 'Afzal Hussain Shahid',
  },
  {
    code: 'CSE2003',
    name: 'Requirements Engineering Management',
    slotLabel: 'B2+TB2',
    slotDays: [2, 3, 5],
    credit: '3_credits',
    classesAttended: 34,
    classesTaken: 40,
    faculty: 'Pulipati Nagaraju',
  },
  {
    code: 'CSE3004',
    name: 'Design and Analysis of Algorithms',
    slotLabel: 'C2+TC2',
    slotDays: [2, 4, 5],
    credit: '3_credits',
    classesAttended: 36,
    classesTaken: 41,
    faculty: 'Somya Ranjan Sahoo',
  },
  {
    // 27/40 = 67.5%. Below the 75 - 8 = 67 critical band, plus
    // recovery is impossible (semester over) — gives the dashboard a
    // real "this student got debarred" hero example for the demo.
    code: 'CSE3018',
    name: 'Software Configuration Management',
    slotLabel: 'B1+TB1',
    slotDays: [2, 3, 5],
    credit: '3_credits',
    classesAttended: 27,
    classesTaken: 40,
    faculty: 'Bhabani Sankar Samantray',
  },
  {
    // 30/40 = 75.0% sitting exactly on the threshold. Demonstrates the
    // borderline state — ✅ on-track today but zero buffer for skips.
    code: 'CSE4016',
    name: 'Database Administration',
    slotLabel: 'F2+TF2',
    slotDays: [2, 3, 5],
    credit: '3_credits',
    classesAttended: 30,
    classesTaken: 40,
    faculty: 'Kotta Jyoshna Priya',
  },
  {
    code: 'STS4006',
    name: 'Advanced Competitive Coding - II',
    slotLabel: 'A2+TA2',
    slotDays: [2, 4, 5],
    credit: '3_credits',
    classesAttended: 35,
    classesTaken: 41,
    faculty: 'Yamuna Durga A',
  },
];

// Build a stable course id from the code so re-runs are idempotent.
const courseIdFor = code => `demo-${code.toLowerCase()}`;

const SEMESTER_START = new Date('2025-12-09T00:00:00');
const SEMESTER_END = new Date('2026-05-02T00:00:00');

// Cap snapshots per course so 6 courses fit under the 120-snapshot doc cap
// (serializeUserData slices to the last 120). 18 * 6 = 108.
const SNAPSHOTS_PER_COURSE = 18;

const formatDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Load the same academic calendar the app uses so we don't pick a planned
// skip on a date the app considers blocked (holiday/exam). Without this
// filter Bhogi (Jan 13) would silently disappear from heatmaps because
// the renderer treats holidays first and never paints the amber cell.
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

// Pick N past dates that fall on the course's slot days AND are not blocked
// by holiday/exam, spread evenly across the middle of the semester. The
// heatmap will render these as amber planned-skip cells.
const buildPlannedSkips = (slotDays, count = 3) => {
  const candidates = [];
  const cursor = new Date(SEMESTER_START);
  cursor.setDate(cursor.getDate() + 14); // skip first two weeks
  const cutoff = new Date(SEMESTER_END);
  cutoff.setDate(cutoff.getDate() - 14); // skip last two weeks (FAT prep)
  while (cursor <= cutoff) {
    const key = formatDateKey(cursor);
    if (slotDays.includes(cursor.getDay()) && !BLOCKED_DATES.has(key)) {
      candidates.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (candidates.length <= count) return candidates;
  // Evenly sample `count` dates across the candidate list.
  const step = candidates.length / count;
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    picks.push(candidates[Math.floor(i * step + step / 2)]);
  }
  return picks;
};

// Generate a believable weekly attendance trajectory that lands exactly on
// the final attended/taken values. Returns an array of snapshots ordered
// chronologically. Uses a slow drift from ~92% down to the final percentage
// with small noise so the linear regression / EWMA show a real trend.
const buildSnapshots = (course, courseId) => {
  const finalTaken = course.classesTaken;
  const finalAttended = course.classesAttended;
  const finalPct = (finalAttended / finalTaken) * 100;

  const totalWeeks = SNAPSHOTS_PER_COURSE;
  // We'll emit roughly one snapshot per week.
  const snapshots = [];

  // Distribute the cumulative classesTaken evenly across weeks so each
  // weekly snapshot looks like a real cumulative reading.
  for (let week = 1; week <= totalWeeks; week += 1) {
    const fraction = week / totalWeeks;
    const cumulativeTaken = Math.max(1, Math.round(finalTaken * fraction));
    // Start higher than final, ease toward it. Adds a touch of noise.
    const startPct = Math.min(95, finalPct + 8);
    const easedPct = startPct + (finalPct - startPct) * Math.pow(fraction, 1.3);
    const noise = (Math.sin(week * 1.7 + finalTaken) * 1.4);
    let pct = Math.max(50, Math.min(100, easedPct + noise));

    // Ensure last snapshot matches final exactly.
    let attended;
    if (week === totalWeeks) {
      attended = finalAttended;
      pct = finalPct;
    } else {
      attended = Math.min(cumulativeTaken, Math.round((pct / 100) * cumulativeTaken));
    }
    const taken = week === totalWeeks ? finalTaken : cumulativeTaken;
    const actualPct = (attended / taken) * 100;

    // Spread snapshots evenly across the actual semester span.
    const semesterDays = (SEMESTER_END - SEMESTER_START) / (24 * 60 * 60 * 1000);
    const dayOffset = Math.round((week / totalWeeks) * semesterDays);
    const created = new Date(SEMESTER_START);
    created.setDate(created.getDate() + dayOffset);

    // Risk score / label mirror the formula in attendanceAnalytics.js so
    // the snapshot list is internally consistent.
    let riskLabel = 'Safe';
    if (actualPct < MIN_ATTENDANCE - 4) riskLabel = 'Critical';
    else if (actualPct < MIN_ATTENDANCE) riskLabel = 'Warning';
    const riskScore = Math.max(0, Math.min(100, Math.round(100 - actualPct)));

    snapshots.push({
      id: `${courseId}-w${week}`,
      courseId,
      attendancePercentage: Number(actualPct.toFixed(1)),
      classesTaken: taken,
      classesAttended: attended,
      riskScore,
      riskLabel,
      createdAt: created.toISOString(),
    });
  }

  return snapshots;
};

const buildUserDoc = () => {
  const now = new Date();
  const courses = COURSES_INPUT.map(c => ({
    id: courseIdFor(c.code),
    courseName: `${c.code} - ${c.name}`,
    slotLabel: c.slotLabel,
    slotDays: c.slotDays,
    credit: c.credit,
    classesTaken: c.classesTaken,
    classesAttended: c.classesAttended,
    skippedDates: buildPlannedSkips(c.slotDays, 3),
    lastUpdated: now.toISOString(),
  }));

  const attendanceSnapshots = COURSES_INPUT.flatMap(c =>
    buildSnapshots(c, courseIdFor(c.code))
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Pick the highest-credit course as the active selectedSlot so the
  // dashboard opens with a meaningful default.
  const primary = courses[0];

  return {
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    role: 'student',
    selectedYear: '4th_year',
    selectedCredit: primary.credit,
    selectedSlot: primary.slotLabel,
    slotDays: primary.slotDays,
    courses,
    attendanceSnapshots: attendanceSnapshots.slice(-120),
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

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set in .env');
  const serviceAccount = JSON.parse(raw);

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const auth = admin.auth();
  const db = admin.firestore();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(DEMO_EMAIL);
    console.log(`Found existing auth user ${DEMO_EMAIL} (uid=${userRecord.uid}). Resetting password.`);
    await auth.updateUser(userRecord.uid, {
      password: DEMO_PASSWORD,
      displayName: DEMO_NAME,
      emailVerified: true,
    });
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    console.log(`Creating auth user ${DEMO_EMAIL}.`);
    userRecord = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: DEMO_NAME,
      emailVerified: true,
    });
    console.log(`Created uid=${userRecord.uid}.`);
  }

  // Delete-then-set instead of merge so any fields no longer present in
  // the seed payload (renamed courses, removed snapshots, etc.) are
  // actually removed rather than lingering.
  const userDocRef = db.collection('users').doc(userRecord.uid);
  await userDocRef.delete().catch(() => {});
  const payload = buildUserDoc();
  await userDocRef.set(payload);

  console.log('---');
  console.log(`Seeded users/${userRecord.uid}`);
  console.log(`  Courses: ${payload.courses.length}`);
  console.log(`  Snapshots: ${payload.attendanceSnapshots.length}`);
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log('Done.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
