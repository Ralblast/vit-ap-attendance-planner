import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/dateUtils.js';

const CalendarPlanner = ({ classDates, onDateToggle, skippedDates, onClear, eventsMap }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const skippedDateSet = new Set(skippedDates);
  const selectableDates = new Set(classDates);
  const today = formatDate(new Date());
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleMonthNav = offset =>
    setViewDate(currentDate => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="border-y border-border-faint py-5">
      <p className="mb-4 text-sm text-text-muted">
        Select a future class date to mark it as a planned skip.
      </p>

      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleMonthNav(-1)}
          className="p-2 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-base font-semibold text-text-primary">
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          type="button"
          onClick={() => handleMonthNav(1)}
          className="p-2 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map(day => (
          <div key={day} className="eyebrow-label py-2 text-center">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {calendarDays.map(day => {
          const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
          const dateStr = formatDate(date);
          const event = eventsMap.get(dateStr);
          const isSelectable = selectableDates.has(dateStr);
          const isSkipped = skippedDateSet.has(dateStr);
          const isToday = dateStr === today;
          const isBlocked = event && (event.type === 'holiday' || event.type === 'exam');
          const isClickable = isSelectable && !isBlocked;

          let dayClass =
            'relative flex h-11 items-center justify-center border border-transparent text-sm transition-colors duration-150';
          let title = event ? event.name : 'Click to plan a skip';

          if (isSkipped) {
            dayClass += ' bg-danger-dim text-danger';
            title = 'Click to un-skip';
          } else if (isBlocked) {
            dayClass += ' text-text-muted line-through';
          } else if (isClickable) {
            dayClass += ' cursor-pointer font-medium text-text-primary hover:bg-elevated';
          } else {
            dayClass += ' text-text-secondary';
          }

          if (isToday) {
            dayClass += ' border-accent bg-[var(--accent-glow)] text-text-primary';
          }

          let eventDot = null;
          if (event && !isSkipped) {
            eventDot = (
              <span
                className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                  event.type === 'holiday' ? 'bg-warning' : 'bg-text-muted'
                }`}
              />
            );
          }

          return (
            <button
              key={day}
              type="button"
              title={title}
              onClick={() => {
                if (isClickable) {
                  onDateToggle(dateStr);
                }
              }}
              className={dayClass}
            >
              {day}
              {eventDot}
            </button>
          );
        })}
      </div>

      {skippedDates.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 ml-auto flex items-center gap-1 text-xs text-danger transition-colors hover:text-danger"
        >
          <Trash2 size={14} />
          Clear Selections
        </button>
      ) : null}
    </div>
  );
};

export default CalendarPlanner;
