import React from 'react';
import { motion as Motion } from 'framer-motion';

export default function LandingScreen({ onStartGuest, onSignIn }) {
  return (
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
      </Motion.div>

      <Motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}
        className="border-y border-border-faint py-8"
      >
        <div className="flex items-baseline justify-between border-b border-border-faint pb-5">
          <div>
            <p className="eyebrow-label">Live Risk Preview</p>
            <p className="mt-2 text-3xl font-semibold">Warning · 46</p>
          </div>
          <p className="font-mono text-sm text-accent">A1+TA1</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border-faint border-b border-border-faint">
          <div className="py-5 pr-4">
            <p className="eyebrow-label">Current</p>
            <p className="mt-2 text-2xl font-semibold">73.8%</p>
          </div>
          <div className="px-4 py-5">
            <p className="eyebrow-label">Recovery</p>
            <p className="mt-2 text-2xl font-semibold">2</p>
          </div>
          <div className="py-5 pl-4">
            <p className="eyebrow-label">Skips</p>
            <p className="mt-2 text-2xl font-semibold">0</p>
          </div>
        </div>
        <p className="mt-5 text-sm text-text-muted">
          The actual dashboard uses your saved courses, semester calendar, planned skips, and trend snapshots.
        </p>
      </Motion.div>
    </section>
  );
}
