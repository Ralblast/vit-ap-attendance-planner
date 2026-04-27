import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

import { adminAuth } from './firebaseAdmin.js';

const MAX_BODY_BYTES = 64 * 1024;
const ADMIN_EMAIL = (process.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

export const readJsonBody = request =>
  new Promise((resolve, reject) => {
    if (request.body && typeof request.body === 'object') {
      resolve(request.body);
      return;
    }

    if (typeof request.body === 'string') {
      try {
        resolve(JSON.parse(request.body));
      } catch {
        resolve({});
      }
      return;
    }

    let received = 0;
    const chunks = [];
    request.on('data', chunk => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject(new Error('payload-too-large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve({});
      }
    });
    request.on('error', reject);
  });

export const requireMethod = (request, response, methods = ['POST']) => {
  if (!methods.includes(request.method)) {
    response.setHeader('Allow', methods.join(', '));
    response.status(405).json({ ok: false, error: 'Method not allowed.' });
    return false;
  }

  return true;
};

export const safeStringEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
};

const extractBearer = request => {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

export const verifyFirebaseToken = async request => {
  const token = extractBearer(request);
  if (!token) {
    return null;
  }
  try {
    return await adminAuth().verifyIdToken(token);
  } catch (error) {
    console.warn('Firebase token verification failed.', error.message);
    return null;
  }
};

export const requireAdmin = async (request, response) => {
  const decoded = await verifyFirebaseToken(request);
  if (!decoded) {
    response.status(401).json({ ok: false, error: 'Authentication required.' });
    return null;
  }

  const isAdminClaim = decoded.admin === true;
  const isAdminEmail =
    ADMIN_EMAIL && (decoded.email || '').toLowerCase() === ADMIN_EMAIL;

  if (!isAdminClaim && !isAdminEmail) {
    response.status(403).json({ ok: false, error: 'Admin access required.' });
    return null;
  }

  return decoded;
};

export const requireCronSecret = (request, response) => {
  const expected = process.env.CRON_SECRET || '';
  const provided = extractBearer(request);
  if (!expected || !safeStringEqual(provided, expected)) {
    response.status(401).json({ ok: false, error: 'Unauthorized cron request.' });
    return false;
  }
  return true;
};
