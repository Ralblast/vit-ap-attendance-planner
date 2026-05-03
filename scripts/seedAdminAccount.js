// One-shot admin account reset:
// - Deletes the old admin user (admin@vitap.local) and its users/{uid} doc
// - Creates admin@gmail.com / 123456
// - Sets the admin: true custom claim so server endpoints accept it

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const loadLocalEnv = () => {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const keyRe = /^([A-Z_][A-Z0-9_]*)=(.*)$/;
  let currentKey = null;
  let currentVal = '';
  const flush = () => {
    if (!currentKey) return;
    let value = currentVal.trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[currentKey]) process.env[currentKey] = value;
    currentKey = null;
    currentVal = '';
  };
  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;
    const match = keyRe.exec(line);
    if (match) {
      flush();
      currentKey = match[1];
      currentVal = match[2];
    } else if (currentKey) {
      currentVal += '\n' + line;
    }
  }
  flush();
};

loadLocalEnv();

const OLD_ADMIN_EMAIL = 'admin@vitap.local';
const NEW_ADMIN_EMAIL = 'admin@gmail.com';
const NEW_ADMIN_PASSWORD = '123456';

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set in .env');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  const auth = admin.auth();
  const db = admin.firestore();

  // 1. Delete the old admin user + doc, if present.
  try {
    const oldUser = await auth.getUserByEmail(OLD_ADMIN_EMAIL);
    console.log(`Deleting old admin ${OLD_ADMIN_EMAIL} (uid=${oldUser.uid}).`);
    await db.collection('users').doc(oldUser.uid).delete().catch(() => {});
    await auth.deleteUser(oldUser.uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    console.log(`No existing user at ${OLD_ADMIN_EMAIL}; skipping delete.`);
  }

  // 2. Create or reset the new admin user.
  let newUser;
  try {
    newUser = await auth.getUserByEmail(NEW_ADMIN_EMAIL);
    console.log(`Found existing ${NEW_ADMIN_EMAIL} (uid=${newUser.uid}); resetting password.`);
    await auth.updateUser(newUser.uid, {
      password: NEW_ADMIN_PASSWORD,
      displayName: 'Admin',
      emailVerified: true,
    });
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    console.log(`Creating ${NEW_ADMIN_EMAIL}.`);
    newUser = await auth.createUser({
      email: NEW_ADMIN_EMAIL,
      password: NEW_ADMIN_PASSWORD,
      displayName: 'Admin',
      emailVerified: true,
    });
  }

  // 3. Set the admin custom claim.
  await auth.setCustomUserClaims(newUser.uid, { admin: true });
  console.log(`Set admin: true claim on ${NEW_ADMIN_EMAIL}.`);

  // 4. Sanity-check the doc state. We don't seed an admin profile doc — the
  //    app creates one on first login via useUserSync.
  console.log('---');
  console.log(`Admin login: ${NEW_ADMIN_EMAIL} / ${NEW_ADMIN_PASSWORD}`);
  console.log(`UID: ${newUser.uid}`);
  console.log('Done.');
}

main().catch(err => {
  console.error('Admin seed failed:', err);
  process.exitCode = 1;
});
