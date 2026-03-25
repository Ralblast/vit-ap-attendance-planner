import React from 'react';

const InfoCard = ({ icon, title, value, subtext, color = 'text-text-primary' }) => {
  return (
    <div className="app-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="eyebrow-label">{title}</p>
          <p className={`text-2xl font-semibold tracking-[-0.01em] ${color}`}>{value}</p>
          {subtext ? <p className="text-xs text-text-muted">{subtext}</p> : null}
        </div>
        {icon ? (
          <div className="rounded-lg border border-border-faint bg-subtle p-2 text-text-secondary">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InfoCard;
