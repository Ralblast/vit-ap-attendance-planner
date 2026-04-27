import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const placeholderMessage = [
  'Weekly attendance review mailer scaffold',
  'Status: not wired to real attendance data yet',
  'Next step later: replace the placeholder text with Firestore/user summary data',
].join('\n');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const loadLocalEnv = () => {
  const envPath = path.join(projectRoot, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  lines.forEach(line => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || process.env[key]) {
      return;
    }

    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
};

async function main() {
  loadLocalEnv();

  const requiredEnv = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);
  const fromAddress = process.env.ATTENDANCE_REVIEW_FROM || process.env.SMTP_USER || '';
  const toAddress = process.env.ATTENDANCE_REVIEW_TO || process.env.SMTP_USER || '';

  if (!fromAddress) {
    missingEnv.push('ATTENDANCE_REVIEW_FROM|SMTP_USER');
  }

  if (!toAddress) {
    missingEnv.push('ATTENDANCE_REVIEW_TO|SMTP_USER');
  }

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
    from: fromAddress,
    to: toAddress,
    subject: process.env.ATTENDANCE_REVIEW_SUBJECT || 'Weekly attendance review',
    text: process.env.ATTENDANCE_REVIEW_TEXT || placeholderMessage,
  });

  console.log('Attendance review mailer scaffold executed.', info.messageId);
}

main().catch(error => {
  console.error('Attendance review mailer scaffold failed.', error);
  process.exitCode = 1;
});
