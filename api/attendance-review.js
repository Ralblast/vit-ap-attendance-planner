import { buildDashboardSummary } from '../src/utils/attendanceAnalytics.js';
import {
  buildAttendanceEmailText,
  buildAttendanceMarkdown,
  createMailTransport,
  getAttendanceReviewFrom,
  getMissingEmailEnv,
} from './lib/email.js';
import { adminDb } from './lib/firebaseAdmin.js';
import { requireCronSecret } from './lib/http.js';
import { loadSemesterData } from './lib/semesterSource.js';
import { sendTelegramMessage } from './lib/telegram.js';

const DEFAULT_ALERT_THRESHOLD = 78;
const SEND_CONCURRENCY = 6;

const toSafeNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const groupSnapshotsByCourse = snapshots =>
  (Array.isArray(snapshots) ? snapshots : []).reduce((groups, snapshot) => {
    if (!snapshot?.courseId) {
      return groups;
    }
    if (!groups[snapshot.courseId]) {
      groups[snapshot.courseId] = [];
    }
    groups[snapshot.courseId].push(snapshot);
    return groups;
  }, {});

const buildSubject = summary => {
  const needsAttention = summary.warningCourses + summary.criticalCourses;
  if (needsAttention > 0) {
    return `Attendance alert: ${needsAttention} course${needsAttention === 1 ? '' : 's'} need attention`;
  }
  return process.env.ATTENDANCE_REVIEW_SUBJECT || 'Weekly attendance review';
};

const processUser = async ({ doc, semester, transporter, fromAddress }) => {
  const userData = doc.data();
  const courses = Array.isArray(userData.courses) ? userData.courses : [];
  const weeklySummaryEnabled = userData.weeklySummaryEnabled !== false;
  const alertEnabled = userData.alertEnabled !== false;

  if (!userData.email || courses.length === 0 || (!weeklySummaryEnabled && !alertEnabled)) {
    return { uid: doc.id, status: 'skipped-disabled' };
  }

  const summary = buildDashboardSummary({
    courses,
    semester,
    snapshotsByCourse: groupSnapshotsByCourse(userData.attendanceSnapshots),
  });
  const alertThreshold = toSafeNumber(userData.alertThreshold) || DEFAULT_ALERT_THRESHOLD;
  const needsAttention = summary.courseAnalytics.some(item => {
    const a = item.analytics;
    if (a.riskLabel === 'Critical') return true;
    if (a.currentAttendance < alertThreshold) return true;
    if (a.projectedAttendance < alertThreshold) return true;
    if (a.forecast?.ready && a.forecast.low < alertThreshold) return true;
    return false;
  });

  if (!weeklySummaryEnabled && !(alertEnabled && needsAttention)) {
    return { uid: doc.id, status: 'skipped-healthy' };
  }

  const subject = buildSubject(summary);
  const text = buildAttendanceEmailText({ summary, courses: summary.courseAnalytics });
  const channels = {};

  if (transporter && fromAddress) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: userData.email,
        subject,
        text,
      });
      channels.email = 'sent';
    } catch (error) {
      console.warn(`Email failed for ${doc.id}:`, error.message);
      channels.email = 'failed';
    }
  } else {
    channels.email = 'skipped';
  }

  const telegramTarget = userData.notificationChannels?.telegram;
  if (telegramTarget?.botToken && telegramTarget?.chatId) {
    const markdown = buildAttendanceMarkdown({ summary, courses: summary.courseAnalytics });
    const result = await sendTelegramMessage(telegramTarget, markdown);
    channels.telegram = result.ok ? 'sent' : 'failed';
  }

  await doc.ref.set({ lastEmailSentAt: new Date().toISOString() }, { merge: true });
  return { uid: doc.id, status: 'delivered', channels };
};

const runInBatches = async (items, batchSize, worker) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(slice.map(worker));
    settled.forEach(entry => {
      if (entry.status === 'fulfilled') {
        results.push(entry.value);
      } else {
        console.error('Cron worker failed:', entry.reason);
        results.push({ status: 'errored', error: entry.reason?.message });
      }
    });
  }
  return results;
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  if (!requireCronSecret(request, response)) {
    return;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    response.status(200).json({ ok: true, skipped: true, error: 'FIREBASE_SERVICE_ACCOUNT missing.' });
    return;
  }

  try {
    const semester = loadSemesterData();
    const usersSnapshot = await adminDb().collection('users').get();
    const missingSmtpEnv = getMissingEmailEnv();
    const transporter = missingSmtpEnv.length === 0 ? createMailTransport() : null;
    const fromAddress = transporter ? getAttendanceReviewFrom() : '';

    const docs = usersSnapshot.docs;
    const results = await runInBatches(docs, SEND_CONCURRENCY, doc =>
      processUser({ doc, semester, transporter, fromAddress })
    );

    const counts = results.reduce(
      (acc, item) => {
        if (item.status === 'delivered') acc.delivered += 1;
        else if (item.status === 'skipped-healthy') acc.skippedHealthy += 1;
        else if (item.status === 'skipped-disabled') acc.skippedDisabled += 1;
        else acc.errored += 1;
        return acc;
      },
      { delivered: 0, skippedHealthy: 0, skippedDisabled: 0, errored: 0 }
    );

    response.status(200).json({
      ok: true,
      ...counts,
      smtp: transporter ? 'configured' : `missing:${missingSmtpEnv.join(',')}`,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    response.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
