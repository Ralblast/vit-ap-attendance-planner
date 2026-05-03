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

const MIN_ATTENDANCE = 75;
const BORDERLINE_BAND = 2; // % above the threshold still considered "no buffer"

// Bucket each course row into one of: below (debarrable), borderline
// (within BORDERLINE_BAND of threshold), or safe. Drives both the email
// and Telegram digests so the structure stays in sync.
const partitionCourses = courses => {
  const enriched = (Array.isArray(courses) ? courses : [])
    .map(item => {
      const course = item.course || item;
      const analytics = item.analytics || {};
      const pct = Number(analytics.currentAttendance ?? 0);
      const projected = Number(analytics.projectedAttendance ?? pct);
      return {
        name: sanitizeLine(course.courseName || course.slotLabel || 'Course'),
        slotLabel: sanitizeLine(course.slotLabel || ''),
        pct,
        projected,
        recommendation: sanitizeLine(analytics.recommendation || ''),
        riskLabel: analytics.riskLabel || 'Unknown',
      };
    })
    .sort((a, b) => a.pct - b.pct);

  const below = enriched.filter(course => course.pct < MIN_ATTENDANCE);
  const borderline = enriched.filter(
    course => course.pct >= MIN_ATTENDANCE && course.pct < MIN_ATTENDANCE + BORDERLINE_BAND
  );
  const safe = enriched.filter(course => course.pct >= MIN_ATTENDANCE + BORDERLINE_BAND);
  const lowest = enriched[0] || null;
  return { all: enriched, below, borderline, safe, lowest };
};

const formatCoursePct = course => `${course.pct.toFixed(1)}%`;

// Subject line carries the headline. When something is at risk we name
// the worst offender so the open rate isn't gated on the student
// expanding a generic "weekly review".
export const buildAttendanceSubject = ({ courses = [] }) => {
  const { below, borderline, lowest } = partitionCourses(courses);
  if (below.length === 1) {
    return `${below[0].slotLabel || below[0].name} is below 75% — attendance check`;
  }
  if (below.length > 1) {
    return `${below.length} courses below 75% — attendance check`;
  }
  if (borderline.length > 0 && lowest) {
    return `${lowest.slotLabel || lowest.name} sitting at ${formatCoursePct(lowest)} — no buffer left`;
  }
  if (lowest) {
    return `All courses on track — lowest is ${lowest.slotLabel || lowest.name} at ${formatCoursePct(lowest)}`;
  }
  return process.env.ATTENDANCE_REVIEW_SUBJECT || 'Weekly attendance review';
};

export const buildAttendanceEmailText = ({ summary, courses = [] }) => {
  const partition = partitionCourses(courses);
  const lines = [];

  if (partition.below.length > 0) {
    const noun = partition.below.length === 1 ? 'course' : 'courses';
    lines.push(
      `Your attendance is below the 75% eligibility threshold in ${partition.below.length} ${noun}:`
    );
    lines.push('');
    partition.below.forEach((course, index) => {
      const tag = index === 0 ? ' (lowest)' : '';
      lines.push(`- ${course.name} — ${formatCoursePct(course)}${tag}`);
    });
    lines.push('');
  } else if (partition.lowest) {
    lines.push(
      `All ${partition.all.length} courses on track. Lowest: ${partition.lowest.name} at ${formatCoursePct(partition.lowest)}.`
    );
    lines.push('');
  }

  if (partition.borderline.length > 0) {
    lines.push('Borderline (within 2% of threshold, no buffer for skips):');
    partition.borderline.forEach(course => {
      lines.push(`- ${course.name} — ${formatCoursePct(course)}`);
    });
    lines.push('');
  }

  lines.push(
    `Average across ${partition.all.length} courses: ${Number(summary.averageAttendance || 0).toFixed(1)}%`
  );
  lines.push(
    `Safe: ${summary.safeCourses || 0}  ·  Warning: ${summary.warningCourses || 0}  ·  Critical: ${summary.criticalCourses || 0}`
  );
  lines.push('');
  lines.push('Refresh your numbers from VTOP and review the dashboard:');
  lines.push('https://vit-ap-attendance-planner.vercel.app');

  return lines.join('\n');
};

export const buildAttendanceMarkdown = ({ summary, courses = [] }) => {
  const partition = partitionCourses(courses);
  const lines = [];

  if (partition.below.length > 0) {
    lines.push(`*⚠ Below 75% in ${partition.below.length} course${partition.below.length === 1 ? '' : 's'}*`);
    lines.push('');
    partition.below.forEach((course, index) => {
      const tag = index === 0 ? '  _(lowest)_' : '';
      lines.push(`• ${course.name} — *${formatCoursePct(course)}*${tag}`);
    });
    lines.push('');
  } else if (partition.lowest) {
    lines.push(`*✅ All ${partition.all.length} courses on track*`);
    lines.push(`Lowest: ${partition.lowest.name} at *${formatCoursePct(partition.lowest)}*`);
    lines.push('');
  }

  if (partition.borderline.length > 0) {
    lines.push('*Borderline (no buffer):*');
    partition.borderline.forEach(course => {
      lines.push(`• ${course.name} — ${formatCoursePct(course)}`);
    });
    lines.push('');
  }

  lines.push(`_Average:_ ${Number(summary.averageAttendance || 0).toFixed(1)}%`);
  lines.push(
    `_Safe:_ ${summary.safeCourses || 0}  ·  _Warning:_ ${summary.warningCourses || 0}  ·  _Critical:_ ${summary.criticalCourses || 0}`
  );

  return lines.join('\n');
};
