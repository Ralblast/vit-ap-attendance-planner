import nodemailer from 'nodemailer';

const requiredEmailEnv = [
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'ATTENDANCE_REVIEW_FROM',
];

export const getMissingEmailEnv = () => requiredEmailEnv.filter(key => !process.env[key]);

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

export const buildAttendanceEmailText = ({ summary, courses = [] }) => {
  const lines = [
    'Weekly Attendance Review',
    '',
    `Average attendance: ${summary.averageAttendance || 0}%`,
    `Safe: ${summary.safeCourses || 0}`,
    `Warning: ${summary.warningCourses || 0}`,
    `Critical: ${summary.criticalCourses || 0}`,
    '',
    'Course actions:',
  ];

  courses.forEach(item => {
    const course = item.course || item;
    const analytics = item.analytics || {};
    lines.push(
      `- ${course.courseName || course.slotLabel || 'Course'}: ${analytics.riskLabel || 'Unknown'} (${analytics.riskScore ?? '--'}/100). ${analytics.recommendation || ''}`
    );
  });

  return lines.join('\n');
};
