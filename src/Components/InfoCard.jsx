import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const InfoCard = ({ icon, title, value, subtext, color = 'text-gray-200' }) => {
  const { theme } = useTheme();

  return (
    <div
      className={`p-4 rounded-xl shadow-lg flex items-center space-x-4 border ${
        theme === 'dark'
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-slate-200 shadow-slate-200/60' 
      }`}
    >
      <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-slate-100'} ${color}`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {title}
        </p>
        {/* --- UPDATED: Responsive font size --- */}
        <p className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
        {subtext && (
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default InfoCard;