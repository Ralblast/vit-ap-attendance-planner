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
        <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
          Email and Telegram alerts for low attendance and weekly course health.
        </h2>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="border border-border-default bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-lg font-semibold text-text-primary">
                  Weekly attendance alerts
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Sent every Sunday with your lowest course, anything below 75%,
                  and a borderline watchlist. Delivered to email and Telegram.
                </p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={userData?.alertEnabled !== false}
                  onChange={event => {
                    const next = event.target.checked;
                    onUpdatePreferences({
                      alertEnabled: next,
                      weeklySummaryEnabled: next,
                    });
                  }}
                />
                <span className="relative inline-block h-6 w-11 rounded-full bg-border-default transition-colors peer-checked:bg-accent">
                  <span className="absolute left-0.5 top-0.5 inline-block h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </span>
              </label>
            </div>

            <div className="mt-5 grid gap-4 border-t border-border-faint pt-4 sm:grid-cols-2">
              <div>
                <p className="eyebrow-label">Active channels</p>
                <p className="mt-1 font-mono text-sm text-text-secondary">
                  {channelsConfigured.length
                    ? channelsConfigured.join(' + ')
                    : 'none'}
                </p>
              </div>
              <div>
                <p className="eyebrow-label">Last delivery</p>
                <p className="mt-1 font-mono text-sm text-text-secondary">
                  {formatLastSent(userData?.lastEmailSentAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-border-faint pt-4">
              <button
                type="button"
                onClick={sendReview}
                disabled={isSending || courses.length === 0}
                className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? 'Sending…' : 'Send a test alert now'}
              </button>
              {status ? (
                <p className="text-xs text-text-muted">{status}</p>
              ) : null}
            </div>
          </div>

          <div className="border border-border-faint bg-surface p-5">
            <p className="eyebrow-label">Threshold</p>
            <p className="mt-2 text-sm text-text-secondary">
              Courses below this percent show up in the weekly digest. Default 78%
              gives a small buffer above the 75% eligibility line.
            </p>
            <label className="mt-3 block">
              <span className="sr-only">Alert threshold (%)</span>
              <input
                type="number"
                min="75"
                max="100"
                value={userData?.alertThreshold || 78}
                onChange={event =>
                  onUpdatePreferences({ alertThreshold: Number(event.target.value) })
                }
                className="field-input max-w-[120px]"
              />
            </label>
          </div>
        </div>

        <div className="border border-border-faint bg-surface p-5">
          <p className="eyebrow-label">Telegram (optional)</p>
          <p className="mt-2 text-sm text-text-secondary">
            Create a bot via @BotFather, message it once, then paste the bot token
            and your chat ID. Telegram delivery turns on automatically when both
            fields are filled.
          </p>
          <div className="mt-4 space-y-3">
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
          <p className="mt-3 text-xs text-text-muted">
            Inputs save automatically when you click out.
          </p>
        </div>
      </section>
    </div>
  );
}
