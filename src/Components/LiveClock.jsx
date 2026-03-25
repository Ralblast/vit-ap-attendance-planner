import React, { useEffect, useState } from 'react';

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden text-right sm:block">
      <p className="text-sm font-medium text-text-secondary">
        {time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <p className="text-xs text-text-muted">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

export default LiveClock;
