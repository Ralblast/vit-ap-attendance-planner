import React, { useEffect, useState } from 'react';

import { auth } from '../firebase.js';

const formatLastSent = value => {
  if (!value) {
    return 'Not sent yet';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not sent yet';
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildResultMessage = result => {
  if (!result) {
    return '';
  }
  if (result.error) {
    return result.error;
  }
  const channels = result.results || {};
  const delivered = Object.entries(channels)
    .filter(([, info]) => info?.ok)
    .map(([name]) => name);
  if (delivered.length === 0) {
    return 'No channels are configured. Add SMTP env vars or a Telegram bot.';
  }
  return `Sent via ${delivered.join(' + ')}.`;
};

export default function NotificationsScreen({
  user,
  userData,
  courses,
  semesterData,
  onUpdatePreferences,
}) {
  const [status, setStatus] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [telegram, setTelegram] = useState({ botToken: '', chatId: '' });

  useEffect(() => {
    setTelegram({
      botToken: userData?.notificationChannels?.telegram?.botToken || '',
      chatId: userData?.notificationChannels?.telegram?.chatId || '',
    });
  }, [userData?.notificationChannels?.telegram?.botToken, userData?.notificationChannels?.telegram?.chatId]);

  const persistTelegram = next => {
    setTelegram(next);
    onUpdatePreferences({
      notificationChannels: {
        telegram: { botToken: next.botToken.trim(), chatId: next.chatId.trim() },
      },
    });
  };

  const sendReview = async () => {
    setIsSending(true);
    setStatus('');

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const response = await fetch('/api/send-alert-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          courses,
          semester: semesterData,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        setStatus('Run `vercel dev` to test the email endpoint locally.');
        return;
      }

      const result = await response.json();
      setStatus(buildResultMessage(result));
    } catch (error) {
      console.error(error);
      setStatus('Unable to send the review right now.');
    } finally {
      setIsSending(false);
    }
  };

  const channelsConfigured = [];
  if (user?.email) {
    channelsConfigured.push('email');
  }
  if (telegram.botToken && telegram.chatId) {
    channelsConfigured.push('telegram');
  }

  return (
    <div className="space-y-8">
      <section className="border-b border-border-faint pb-8">
        <p className="eyebrow-label">Notifications</p>
        <h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em]">
          Email and Telegram alerts for low attendance and weekly course health.
        </h2>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5 lg:border-r lg:border-border-faint lg:pr-8">
          <div>
            <p className="eyebrow-label">Delivery</p>
            <p className="mt-2 text-sm text-text-secondary">
              Sends to every channel you have configured.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Active: {channelsConfigured.length ? channelsConfigured.join(' + ') : 'none'}
            </p>
          </div>
          <button
            type="button"
            onClick={sendReview}
            disabled={isSending || courses.length === 0}
            className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send review now'}
          </button>
          {status ? <p className="text-sm text-text-muted">{status}</p> : null}
          <p className="text-xs text-text-muted">
            Last delivery: {formatLastSent(userData?.lastEmailSentAt)}
          </p>
        </div>

        <div className="space-y-6">
          <label className="flex items-center justify-between border-y border-border-faint py-4">
            <span>
              <span className="block font-medium text-text-primary">Risk alerts</span>
              <span className="text-sm text-text-muted">
                Notify when a course needs attention.
              </span>
            </span>
            <input
              type="checkbox"
              checked={userData?.alertEnabled !== false}
              onChange={event => onUpdatePreferences({ alertEnabled: event.target.checked })}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Alert threshold (%)
            </span>
            <input
              type="number"
              min="75"
              max="100"
              value={userData?.alertThreshold || 78}
              onChange={event =>
                onUpdatePreferences({ alertThreshold: Number(event.target.value) })
              }
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

          <div className="border-t border-border-faint pt-5">
            <p className="eyebrow-label">Telegram</p>
            <p className="mt-1 text-sm text-text-muted">
              Create a bot via @BotFather, then message your bot once and paste the chat ID.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Bot token
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  value={telegram.botToken}
                  onChange={event =>
                    setTelegram(value => ({ ...value, botToken: event.target.value }))
                  }
                  onBlur={() => persistTelegram(telegram)}
                  className="field-input"
                  placeholder="123456:ABC..."
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Chat ID
                </span>
                <input
                  type="text"
                  value={telegram.chatId}
                  onChange={event =>
                    setTelegram(value => ({ ...value, chatId: event.target.value }))
                  }
                  onBlur={() => persistTelegram(telegram)}
                  className="field-input"
                  placeholder="123456789"
                />
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
