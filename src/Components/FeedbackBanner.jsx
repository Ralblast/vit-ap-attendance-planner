import React, { useState } from 'react';

const FeedbackBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleFeedbackClick = () => {
    window.open('https://forms.gle/2mMj3ksCccdMTetCA', '_blank');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="subtle-notice flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="pr-3 text-sm text-text-secondary">
        We are collecting product feedback while the planner evolves.
        <button
          type="button"
          onClick={handleFeedbackClick}
          className="ml-1 text-accent transition-colors hover:underline"
        >
          Give feedback
        </button>
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default FeedbackBanner;
