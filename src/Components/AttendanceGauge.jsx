import React from 'react';
import { motion } from 'framer-motion';
import { MIN_ATTENDANCE } from '../data/constants.js';
import { useTheme } from '../contexts/ThemeContext.jsx';

const AttendanceGauge = ({ percentage }) => {
  const { theme } = useTheme();
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const isSafe = clampedPercentage >= MIN_ATTENDANCE;
  const color = isSafe ? '#4ade80' : '#f87171';
  
  return (
    // --- UPDATED: Responsive size for the whole container ---
    <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48">
      <svg className="transform -rotate-90 w-full h-full">
        <circle 
          cx="50%" 
          cy="50%" 
          r="40%" 
          stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
          strokeWidth="12%" 
          fill="transparent" 
        />
        <motion.circle 
          cx="50%" 
          cy="50%" 
          r="40%" 
          stroke={color} 
          strokeWidth="12%" 
          fill="transparent" 
          strokeLinecap="round" 
          strokeDasharray="251.32" // 2 * pi * 40
          initial={{ strokeDashoffset: 251.32 }} 
          animate={{ strokeDashoffset: 251.32 * (1 - clampedPercentage / 100) }} 
          transition={{ duration: 1.5, ease: "easeInOut" }} 
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {/* --- UPDATED: Responsive font size --- */}
        <span className={`text-3xl sm:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {clampedPercentage.toFixed(1)}%
        </span>
        <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Projected
        </span>
      </div>
    </div>
  );
};

export default AttendanceGauge;