import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme} 
      className={`relative w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-indigo-600' : 'bg-yellow-400'
      }`}
    >
      <motion.div 
        layout 
        transition={{ type: 'spring', stiffness: 700, damping: 30 }} 
        className="absolute w-6 h-6 bg-white rounded-full shadow-md" 
        style={{ 
          left: theme === 'dark' ? 2 : 'auto', 
          right: theme === 'light' ? 2 : 'auto' 
        }}
      />
      <div className="flex w-full justify-between">
        <Moon size={14} className="text-white ml-0.5" />
        <Sun size={14} className="text-gray-800 mr-0.5" />
      </div>
    </button>
  );
};

export default ThemeToggle;