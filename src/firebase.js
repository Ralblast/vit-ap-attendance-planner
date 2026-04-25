import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingFirebaseEnv = firebaseEnvKeys.filter(key => !import.meta.env[key]);

export const isFirebaseConfigured = missingFirebaseEnv.length === 0;

let app = null;
let authInstance = null;
let dbInstance = null;

if (isFirebaseConfigured) {
  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });

  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
} else {
  console.warn(
    `Firebase is not configured. Missing env vars: ${missingFirebaseEnv.join(', ')}`
  );
}

export const auth = authInstance;
export const db = dbInstance;
