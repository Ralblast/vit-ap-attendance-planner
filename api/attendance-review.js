import admin from 'firebase-admin';
import { createMailTransport, getMissingEmailEnv } from './lib/email.js';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}'))
    });
  } catch (error) {
    console.error('Firebase admin initialization failed. Make sure FIREBASE_SERVICE_ACCOUNT is set.', error);
  }
}

const getDaysSince = (dateString) => {
  if (!dateString) return Infinity;
  const lastDate = new Date(dateString);
  if (isNaN(lastDate.getTime())) return Infinity;
  
  const diffTime = Math.abs(new Date() - lastDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const authHeader = request.headers.authorization || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).json({ ok: false, error: 'Unauthorized cron request.' });
  }

  const missingEnv = getMissingEmailEnv();
  if (missingEnv.length > 0) {
    return response.status(200).json({ ok: true, skipped: true, error: 'Missing SMTP config.' });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return response.status(200).json({ ok: true, skipped: true, error: 'Missing FIREBASE_SERVICE_ACCOUNT env var.' });
  }

  try {
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').get();
    
    let emailsSent = 0;
    let skippedRecent = 0;
    let skippedNoAlerts = 0;
    
    const transporter = createMailTransport();

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      if (userData.alertEnabled === false || !userData.email) {
        skippedNoAlerts++;
        continue;
      }
      
      const daysSinceLastCheck = getDaysSince(userData.lastCheckedAt);
      
      if (daysSinceLastCheck <= 3) {
        skippedRecent++;
        continue; // User checked recently, skip them
      }
      
      // Send reminder email
      const text = `Hi ${userData.name || 'there'},\n\nIt's been a few days since you last updated your attendance tracker.\n\nPlease log in to the VIT-AP Attendance Planner to log any recent classes or skips to keep your risk forecasts accurate!\n\nStay safe,\nThe Attendance Planner System`;
      
      await transporter.sendMail({
        from: process.env.ATTENDANCE_REVIEW_FROM,
        to: userData.email,
        subject: 'Action Required: Update your attendance tracker',
        text,
      });
      
      emailsSent++;
    }

    return response.status(200).json({
      ok: true,
      emailsSent,
      skippedRecent,
      skippedNoAlerts
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return response.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
