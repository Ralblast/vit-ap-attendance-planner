import nodemailer from 'nodemailer';

const placeholderMessage = [
  'Weekly attendance review mailer scaffold',
  'Status: not wired to real attendance data yet',
  'Next step later: replace the placeholder text with Firestore/user summary data',
].join('\n');

async function main() {
  const requiredEnv = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'ATTENDANCE_REVIEW_FROM', 'ATTENDANCE_REVIEW_TO'];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);

  if (missingEnv.length > 0) {
    console.log('Attendance review mailer scaffold is present but not configured yet.');
    console.log(`Missing env vars: ${missingEnv.join(', ')}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.ATTENDANCE_REVIEW_FROM,
    to: process.env.ATTENDANCE_REVIEW_TO,
    subject: process.env.ATTENDANCE_REVIEW_SUBJECT || 'Weekly attendance review',
    text: process.env.ATTENDANCE_REVIEW_TEXT || placeholderMessage,
  });

  console.log('Attendance review mailer scaffold executed.', info.messageId);
}

main().catch(error => {
  console.error('Attendance review mailer scaffold failed.', error);
  process.exitCode = 1;
});
