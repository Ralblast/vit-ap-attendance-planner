import nodemailer from 'nodemailer';

const requiredEmailEnv = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];

export const getMissingEmailEnv = () => requiredEmailEnv.filter(key => !process.env[key]);

export const getAttendanceReviewFrom = () =>
  process.env.ATTENDANCE_REVIEW_FROM || process.env.SMTP_USER || '';

export const createMailTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sanitizeLine = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

export const buildAttendanceEmailText = ({ summary, courses = [] }) => {
  const lines = [
    'Weekly Attendance Review',
    '',
    `Average attendance: ${Number(summary.averageAttendance || 0).toFixed(1)}%`,
    `Safe: ${summary.safeCourses || 0}`,
    `Warning: ${summary.warningCourses || 0}`,
    `Critical: ${summary.criticalCourses || 0}`,
    '',
    'Course actions:',
  ];

  courses.forEach(item => {
    const course = item.course || item;
    const analytics = item.analytics || {};
    const name = sanitizeLine(course.courseName || course.slotLabel || 'Course');
    const recommendation = sanitizeLine(analytics.recommendation || '');
    lines.push(
      `- ${name}: ${analytics.riskLabel || 'Unknown'} (${analytics.riskScore ?? '--'}/100). ${recommendation}`
    );
  });

  return lines.join('\n');
};

export const buildAttendanceMarkdown = ({ summary, courses = [] }) => {
  const lines = [
    '*Weekly Attendance Review*',
    '',
    `Average attendance: *${Number(summary.averageAttendance || 0).toFixed(1)}%*`,
    `Safe: ${summary.safeCourses || 0}  ·  Warning: ${summary.warningCourses || 0}  ·  Critical: ${summary.criticalCourses || 0}`,
    '',
    '*Courses:*',
  ];

  courses.forEach(item => {
    const course = item.course || item;
    const analytics = item.analytics || {};
    const name = sanitizeLine(course.courseName || course.slotLabel || 'Course');
    const recommendation = sanitizeLine(analytics.recommendation || '');
    lines.push(
      `• ${name} — ${analytics.riskLabel || 'Unknown'} (${analytics.riskScore ?? '--'}/100). ${recommendation}`
    );
  });

  return lines.join('\n');
};
