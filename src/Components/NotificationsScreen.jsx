import React, { useState } from 'react';
import { auth } from '../firebase.js';

export default function NotificationsScreen({
  user,
  userData,
  courses,
  semesterData,
  onUpdatePreferences,
}) {
  const [status, setStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendReview = async () => {
    setIsSending(true);
    setStatus('');

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const response = await fetch('/api/send-alert-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          user: { email: user?.email || userData?.email },
          courses,
          semester: semesterData,
        }),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        setStatus('To test backend emails locally, please run `vercel dev` instead of `npm run dev`.');
        return;
      }

      const result = await response.json();

      if (result.skipped) {
        setStatus('Email delivery is not active yet.');
      } else if (result.ok) {
        await onUpdatePreferences({ lastEmailSentAt: new Date().toISOString() });
        setStatus('Review email sent successfully.');
      } else {
        setStatus(result.error || 'Unable to send review email.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Unable to send the review right now.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="border-b border-border-faint pb-8">
        <p className="eyebrow-label">Notifications</p>
        <h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em]">
          Email alerts for low attendance and weekly course health.
        </h2>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5 lg:border-r lg:border-border-faint lg:pr-8">
          <div>
            <p className="eyebrow-label">Delivery</p>
            <p className="mt-2 text-sm text-text-secondary">
              Send a course health summary to your registered email address.
            </p>
          </div>
          <button
            type="button"
            onClick={sendReview}
            disabled={isSending || courses.length === 0}
            className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send review email'}
          </button>
          {status ? <p className="text-sm text-text-muted">{status}</p> : null}
        </div>

        <div className="space-y-5">
          <label className="flex items-center justify-between border-y border-border-faint py-4">
            <span>
              <span className="block font-medium text-text-primary">Risk alerts</span>
              <span className="text-sm text-text-muted">Send email when a course needs attention.</span>
            </span>
            <input
              type="checkbox"
              checked={userData?.alertEnabled !== false}
              onChange={event => onUpdatePreferences({ alertEnabled: event.target.checked })}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Alert threshold
            </span>
            <input
              type="number"
              min="75"
              max="100"
              value={userData?.alertThreshold || 78}
              onChange={event => onUpdatePreferences({ alertThreshold: event.target.value })}
              className="field-input max-w-xs"
            />
          </label>

          <label className="flex items-center justify-between border-y border-border-faint py-4">
            <span>
              <span className="block font-medium text-text-primary">Weekly summary</span>
              <span className="text-sm text-text-muted">Send a consolidated course review.</span>
            </span>
            <input
              type="checkbox"
              checked={userData?.weeklySummaryEnabled !== false}
              onChange={event =>
                onUpdatePreferences({ weeklySummaryEnabled: event.target.checked })
              }
            />
          </label>

          <p className="text-sm text-text-muted">
            Last email: {userData?.lastEmailSentAt || 'Not sent yet'}
          </p>
        </div>
      </section>
    </div>
  );
}
