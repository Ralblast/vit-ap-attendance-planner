import { adminAuth } from '../lib/firebaseAdmin.js';
import { readJsonBody, requireMethod, safeStringEqual } from '../lib/http.js';

const ADMIN_EMAIL = (process.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_BOOTSTRAP_PASSWORD =
  process.env.ADMIN_BOOTSTRAP_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '';

const isBootstrapConfigured = () =>
  ADMIN_EMAIL.length > 0 && ADMIN_BOOTSTRAP_PASSWORD.length >= 6;

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) {
    return;
  }

  if (!isBootstrapConfigured()) {
    response.status(503).json({
      ok: false,
      error: 'Admin bootstrap is not configured. Set VITE_ADMIN_EMAIL and ADMIN_BOOTSTRAP_PASSWORD (>=6 chars).',
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    response.status(413).json({ ok: false, error: 'Payload too large.' });
    return;
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    response.status(400).json({ ok: false, error: 'Email and password are required.' });
    return;
  }

  if (!safeStringEqual(email, ADMIN_EMAIL) || !safeStringEqual(password, ADMIN_BOOTSTRAP_PASSWORD)) {
    response.status(401).json({
      ok: false,
      error: 'Admin credentials do not match the configured bootstrap account.',
    });
    return;
  }

  try {
    const auth = adminAuth();
    let userRecord;
    let created = false;

    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        throw error;
      }
      userRecord = await auth.createUser({ email, password });
      created = true;
    }

    if (userRecord.customClaims?.admin !== true) {
      await auth.setCustomUserClaims(userRecord.uid, {
        ...(userRecord.customClaims || {}),
        admin: true,
      });
    }

    response.status(200).json({ ok: true, created, uid: userRecord.uid });
  } catch (error) {
    console.error('Failed to bootstrap admin account.', error);
    response.status(500).json({ ok: false, error: 'Unable to prepare the admin account right now.' });
  }
}
