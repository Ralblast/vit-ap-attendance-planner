import { buildDashboardSummary } from '../src/utils/attendanceAnalytics.js';
import {
  buildAttendanceEmailText,
  buildAttendanceMarkdown,
  createMailTransport,
  getAttendanceReviewFrom,
  getMissingEmailEnv,
} from './lib/email.js';
import { adminDb } from './lib/firebaseAdmin.js';
import { readJsonBody, requireMethod, verifyFirebaseToken } from './lib/http.js';
import { loadSemesterData } from './lib/semesterSource.js';
import { sendTelegramMessage } from './lib/telegram.js';

const MIN_SECONDS_BETWEEN_SENDS = 60;

const isThrottled = lastSentAt => {
  if (!lastSentAt) {
    return false;
  }
  const last = new Date(lastSentAt).getTime();
  if (Number.isNaN(last)) {
    return false;
  }
  return (Date.now() - last) / 1000 < MIN_SECONDS_BETWEEN_SENDS;
};

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) {
    return;
  }

  const decoded = await verifyFirebaseToken(request);
  if (!decoded || !decoded.email) {
    response.status(401).json({ ok: false, error: 'Authentication required.' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    response.status(413).json({ ok: false, error: 'Payload too large.' });
    return;
  }

  let userDocRef = null;
  let userDocData = null;
  try {
    userDocRef = adminDb().collection('users').doc(decoded.uid);
    const snap = await userDocRef.get();
    userDocData = snap.exists ? snap.data() : null;
  } catch (error) {
    console.warn('Could not load user doc for rate limit check.', error.message);
  }

  if (userDocData && isThrottled(userDocData.lastEmailSentAt)) {
    response.status(429).json({
      ok: false,
      error: `Please wait at least ${MIN_SECONDS_BETWEEN_SENDS} seconds between sends.`,
    });
    return;
  }

  const semester = loadSemesterData();
  const summary = buildDashboardSummary({
    courses: body.courses,
    semester,
    snapshotsByCourse: body.snapshotsByCourse,
  });

  const channels = userDocData?.notificationChannels || {};
  const results = {};
  let anyDelivered = false;

  const missingSmtpEnv = getMissingEmailEnv();
  if (missingSmtpEnv.length === 0) {
    try {
      const text = buildAttendanceEmailText({ summary, courses: summary.courseAnalytics });
      const info = await createMailTransport().sendMail({
        from: getAttendanceReviewFrom(),
        to: decoded.email,
        subject: String(body.subject || 'Attendance risk review').slice(0, 120),
        text,
      });
      results.email = { ok: true, messageId: info.messageId };
      anyDelivered = true;
    } catch (error) {
      console.error('Email send failed.', error);
      results.email = { ok: false, error: 'Email send failed.' };
    }
  } else {
    results.email = { ok: false, skipped: true, missingEnv: missingSmtpEnv };
  }

  if (channels.telegram?.botToken && channels.telegram?.chatId) {
    const markdown = buildAttendanceMarkdown({ summary, courses: summary.courseAnalytics });
    results.telegram = await sendTelegramMessage(channels.telegram, markdown);
    if (results.telegram.ok) {
      anyDelivered = true;
    }
  }

  if (anyDelivered && userDocRef) {
    try {
      await userDocRef.set(
        { lastEmailSentAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (error) {
      console.warn('Could not update lastEmailSentAt.', error.message);
    }
  }

  response.status(200).json({
    ok: anyDelivered,
    skipped: !anyDelivered,
    results,
    summary,
  });
}
