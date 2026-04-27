import admin from 'firebase-admin';

let cachedApp = null;

export const getAdminApp = () => {
  if (cachedApp) {
    return cachedApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
  }

  cachedApp = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  return cachedApp;
};

export const adminAuth = () => getAdminApp().auth();
export const adminDb = () => getAdminApp().firestore();
