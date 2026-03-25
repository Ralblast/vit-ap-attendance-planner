import React from 'react';
import { motion as Motion } from 'framer-motion';
import { MIN_ATTENDANCE } from '../data/constants.js';

const AttendanceGauge = ({ percentage }) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const circumference = 2 * Math.PI * 80;
  const gaugeTone =
    clampedPercentage >= MIN_ATTENDANCE
      ? 'text-success'
      : clampedPercentage >= 65
        ? 'text-warning'
        : 'text-danger';

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 192 192">
        <circle
          cx="96"
          cy="96"
          r="80"
          className="stroke-border-default"
          strokeWidth="16"
          fill="transparent"
        />
        <Motion.circle
          cx="96"
          cy="96"
          r="80"
          className={`stroke-current ${gaugeTone}`}
          strokeWidth="16"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clampedPercentage / 100) }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${gaugeTone}`}>{clampedPercentage.toFixed(1)}%</span>
        <span className="text-xs text-text-muted">Projected</span>
      </div>
    </div>
  );
};

export default AttendanceGauge;
