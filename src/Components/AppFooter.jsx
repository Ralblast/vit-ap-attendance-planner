import React from 'react';
import { HelpCircle, Mail } from 'lucide-react';

const AppFooter = ({ theme }) => (
  <footer className={`mt-auto pt-4 pb-2 border-t ${
    theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
  } text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
      <div className="flex items-start gap-2 max-w-lg text-left">
        <HelpCircle size={16} className="flex-shrink-0 mt-0.5"/>
        <p>
          <strong>Disclaimer:</strong> Projections are estimates based on the Fall 2025 calendar. 
          Please verify with official university sources for critical decisions.
        </p>
      </div>
          <a
              href="https://www.linkedin.com/in/abhisheksingh7566"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-shrink-0 flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } text-sm` }
          >
            <Mail size={14} /> Contact Developer
          </a>

    </div>
  </footer>
);

export default AppFooter;
