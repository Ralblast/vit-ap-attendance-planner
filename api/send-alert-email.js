import { buildDashboardSummary } from '../src/utils/attendanceAnalytics.js';
import { buildAttendanceEmailText, createMailTransport, getMissingEmailEnv } from './lib/email.js';
import { readJsonBody, requireMethod, verifyFirebaseToken } from './lib/http.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) {
    return;
  }

  const missingEnv = getMissingEmailEnv();
  if (missingEnv.length > 0) {
    return response.status(200).json({
      ok: true,
      skipped: true,
      missingEnv,
      message: 'Email is not configured yet. Add SMTP env vars to enable alerts.',
    });
  }

  const authHeader = request.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const verifiedUser = await verifyFirebaseToken(token);

  if (!verifiedUser || !verifiedUser.email) {
    return response.status(401).json({ ok: false, error: 'Unauthorized request. Invalid token.' });
  }

  const body = await readJsonBody(request);
  const recipient = verifiedUser.email;

  const summary = buildDashboardSummary({
    courses: body.courses,
    semester: body.semester,
    snapshotsByCourse: body.snapshotsByCourse,
  });
  const text = buildAttendanceEmailText({
    summary,
    courses: summary.courseAnalytics,
  });
  const info = await createMailTransport().sendMail({
    from: process.env.ATTENDANCE_REVIEW_FROM,
    to: recipient,
    subject: body.subject || 'Attendance risk review',
    text,
  });

  return response.status(200).json({ ok: true, messageId: info.messageId, summary });
}
