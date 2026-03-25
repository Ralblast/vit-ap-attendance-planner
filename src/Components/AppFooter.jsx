import React from 'react';
import { AlertCircle, Mail } from 'lucide-react';

const AppFooter = () => {
  return (
    <footer className="mt-8 border-t border-border-faint pt-4 text-xs text-text-muted">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 text-warning" size={14} />
            <p>
              This planner is intended for 2nd, 3rd, and 4th year students.
              <span className="ml-1 text-warning">Freshers have a different academic calendar.</span>
            </p>
          </div>
          <p>
            Projections are based on the Winter 2025-2026 calendar. Verify schedule changes with
            official VIT-AP communication before making attendance decisions.
          </p>
          <p>Independent student project. Not affiliated with VIT-AP.</p>
        </div>
        <a
          href="https://www.linkedin.com/in/abhisheksingh7566"
          target="_blank"
          rel="noopener noreferrer"
          className="ghost-button w-fit px-3 py-1.5 text-xs"
        >
          <Mail size={14} />
          Contact Developer
        </a>
      </div>
    </footer>
  );
};

export default AppFooter;
