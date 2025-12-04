import React from 'react';
import { AlertCircle, Mail, Heart } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const AppFooter = () => {
  const { theme } = useTheme();
  
  return (
    <footer className={`mt-auto pt-4 pb-3 border-t-2 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-300'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
          <div className="flex items-start gap-3 max-w-2xl">
            <AlertCircle
              size={18}
              className={`flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-amber-500' : 'text-amber-600'}`}
            />
            <div className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="font-semibold">Important:</span> This tool is for 2nd/3rd/4th year students only.{' '}
              <span className={`font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                Freshers have a different academic calendar.
              </span>
              <br />
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Projections based on  Winter 2025-2026 calendar. Monitor email for schedule changes and verify with official VIT-AP sources.
              </span>
              <br />
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                I'm not liable for any attendance-related issues.
              </span>
            </div>
          </div>
          <a
            href="https://www.linkedin.com/in/abhisheksingh7566"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
              theme === 'dark' ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'
            } text-sm`}
          >
            <Mail size={14} />
            <span>Contact Developer</span>
          </a>
        </div>
        <div className={`h-px mb-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'}`} />
        <div className="space-y-2">
          <p className={`text-center text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Found a bug? Have suggestions? Your feedback helps improve this tool.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-sm">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Independent project • Not affiliated with VIT-AP
            </span>
            <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>•</span>
            <div className="flex items-center gap-1.5">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Made with</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>by a student</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;