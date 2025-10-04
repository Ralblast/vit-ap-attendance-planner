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
    // --- REVERTED: The container is back to a fixed size ---
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="transform -rotate-90 w-full h-full">
        <circle 
          cx="96" 
          cy="96" 
          r="80" 
          stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
          // --- REVERTED: Stroke width is back to a fixed pixel value for a crisp look ---
          strokeWidth="16" 
          fill="transparent" 
        />
        <motion.circle 
          cx="96" 
          cy="96" 
          r="80" 
          stroke={color} 
          // --- REVERTED: Stroke width is back to a fixed pixel value ---
          strokeWidth="16" 
          fill="transparent" 
          strokeLinecap="round" 
          strokeDasharray="502.65" 
          initial={{ strokeDashoffset: 502.65 }} 
          animate={{ strokeDashoffset: 502.65 * (1 - clampedPercentage / 100) }} 
          transition={{ duration: 1.5, ease: "easeInOut" }} 
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {/* --- REVERTED: Font size is back to the original professional scale --- */}
        <span className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {clampedPercentage.toFixed(1)}%
        </span>
        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Projected
        </span>
      </div>
    </div>
  );
};

export default AttendanceGauge;