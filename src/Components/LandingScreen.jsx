import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Bell, CalendarDays, TrendingUp } from 'lucide-react';

import StatusGlyph from './StatusGlyph.jsx';

export default function LandingScreen({ onStartGuest, onSignIn, onOpenCalendar }) {
  return (
    <>
      <section className="mx-auto grid min-h-[calc(100svh-56px)] w-full max-w-[1200px] items-center gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <Motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <p className="eyebrow-label">ML-Assisted Attendance Planning</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1] tracking-[-0.04em] text-text-primary sm:text-5xl sm:leading-[0.95] sm:tracking-[-0.06em] md:text-7xl">
            Plan every class. Protect your 75%.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-secondary">
            A VIT-AP attendance workspace for risk forecasting, recovery planning, and weekly alerts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onStartGuest} className="primary-button px-5 py-3">
              Start as guest
            </button>
            <button type="button" onClick={onSignIn} className="ghost-button px-5 py-3">
              Sign in
            </button>
          </div>
          {onOpenCalendar ? (
            <button
              type="button"
              onClick={onOpenCalendar}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              Browse the semester calendar →
            </button>
          ) : null}
          <p className="mt-5 max-w-xl text-[11px] leading-relaxed text-text-muted">
            Track attendance through CAT-1, CAT-2, and FAT — never dip below 75% with precise
            per-checkpoint analysis. Built for 2nd, 3rd, and 4th year students (freshers have
            a different academic calendar).
          </p>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}
          className="border-y border-border-faint py-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border-faint pb-5">
            <div>
              <p className="eyebrow-label">Live Risk Preview</p>
              <p className="mt-2 font-display text-5xl font-semibold tracking-[-0.04em]">73.8%</p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-warning">
                <StatusGlyph tone="warning" size={12} />
                Warning · 4 classes from recovery
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-accent">A1+TA1</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">4 credits</p>
              <p className="mt-0.5 text-[10px] text-text-muted">snapshot · Apr 12, 2026</p>
            </div>
          </div>

          <ul className="divide-y divide-border-faint border-b border-border-faint">
            <li className="flex items-center justify-between py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                CAT-1
              </span>
              <span className="font-mono text-sm text-text-muted">78.5% (passed)</span>
            </li>
            <li className="flex items-center justify-between py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                CAT-2
              </span>
              <span className="inline-flex items-baseline gap-1.5 font-mono text-sm text-danger">
                73.5% <StatusGlyph tone="warning" size={11} />
              </span>
            </li>
            <li className="flex items-center justify-between py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                FAT
              </span>
              <span className="inline-flex items-baseline gap-1.5 font-mono text-sm text-danger">
                72.1% <StatusGlyph tone="warning" size={11} />
              </span>
            </li>
          </ul>

          <div className="flex flex-wrap items-baseline justify-between gap-2 pt-3 text-[11px]">
            <span className="text-text-secondary">
              <span className="text-text-muted">Forecast</span>{' '}
              <span className="font-mono text-text-primary">72.5%</span>{' '}
              <span className="text-text-muted">(CI 68.4 – 76.6%)</span>
            </span>
            <span className="font-medium text-danger">▼ trending declining</span>
          </div>

          <p className="mt-5 text-xs text-text-muted">
            Sample slot. Sign in or start as guest to plug in your real attendance and watch
            every checkpoint update live.
          </p>
        </Motion.div>
      </section>

      {/* What's inside — three-feature row, scannable, no marketing prose */}
      <Motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.18 }}
        className="mx-auto w-full max-w-[1200px] border-t border-border-faint px-6 py-12"
      >
        <p className="eyebrow-label">What's inside</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          <div>
            <CalendarDays size={20} className="text-accent" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-text-primary">
              Slot-aware schedule
            </h3>
            <p className="mt-1.5 text-sm text-text-muted">
              Real semester calendar with holidays and exam blocks excluded.
            </p>
          </div>
          <div>
            <TrendingUp size={20} className="text-accent" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-text-primary">
              Forecast at every checkpoint
            </h3>
            <p className="mt-1.5 text-sm text-text-muted">
              Projected attendance at CAT-1, CAT-2, and FAT with 95% confidence interval.
            </p>
          </div>
          <div>
            <Bell size={20} className="text-accent" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-text-primary">
              Weekly alerts
            </h3>
            <p className="mt-1.5 text-sm text-text-muted">
              Email and Telegram pings when any course slips below threshold.
            </p>
          </div>
        </div>
      </Motion.section>
    </>
  );
}
