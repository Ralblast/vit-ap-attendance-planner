import React, { useState } from 'react';

const FeedbackBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleFeedbackClick = () => {
    window.open('https://forms.gle/2mMj3ksCccdMTetCA', '_blank');
  };

  if (!isVisible) return null;

  return (
   <div className="fixed bottom-12 md:top-[calc(50%-120px)] md:bottom-auto left-[calc(50%-15px)] md:left-[calc(50%+145px)] -translate-x-1/2 md:-translate-y-1/2 bg-[#0f172a] border border-gray-700 text-gray-200 px-4 py-3 md:px-6 md:py-4 z-50 rounded-lg shadow-2xl max-w-[90%] md:max-w-md w-full mx-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <p className="text-xs md:text-sm text-gray-300 m-0 pr-2">
          We're updating our website! <br/>
          Share your feedback on new features and help us improve.
        </p>
        <div className="flex gap-2.5 items-center justify-end md:shrink-0">
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors"
            onClick={handleFeedbackClick}
          >
            Give Feedback
          </button>
          <button 
            className="bg-transparent border-none text-gray-400 hover:text-white text-lg px-2 cursor-pointer"
            onClick={handleDismiss}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackBanner;
