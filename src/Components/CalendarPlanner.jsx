import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/dateUtils.js';

const BLOCKING_EVENT_TYPES = new Set(['holiday', 'exam', 'other']);

// Type-tinted underline accents for academic events. Sits as a 2px bar
// at the bottom of each cell — far more legible than the old grey dot,
// and lets you tell holiday from exam from academic marker at a glance.
// Hues match the SlotHeatmap palette so the legend reads consistently
// across both views (purple = holiday, blue = exam, accent = academic).
const eventAccent = type => {
  switch (type) {
    case 'holiday':
      return 'var(--purple)';
    case 'exam':
    case 'other':
      return 'var(--blue)';
    case 'academic':
      return 'var(--accent)';
    default:
      return 'var(--text-muted)';
  }
};

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
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        Tap a future class date to mark it as a planned skip.
      </p>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleMonthNav(-1)}
          aria-label="Previous month"
          className="rounded p-1.5 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
        >
          <ChevronLeft size={14} />
        </button>
        <h3 className="text-sm font-semibold text-text-primary">
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          type="button"
          onClick={() => handleMonthNav(1)}
          aria-label="Next month"
          className="rounded p-1.5 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map(day => (
          <div
            key={day}
            className="py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
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
          const isBlocked = event ? BLOCKING_EVENT_TYPES.has(event.type) : false;
          const isClickable = isSelectable && !isBlocked;

          let dayClass =
            'group relative flex h-9 items-center justify-center rounded text-xs transition-colors duration-150';
          let title = event ? event.name : 'Tap to plan a skip';

          if (isSkipped) {
            // Confirmed planned-skip — highest visual weight on the page.
            dayClass += ' bg-danger text-white font-semibold';
            title = `${dateStr} — planned skip · tap to remove`;
          } else if (isClickable) {
            dayClass += ' cursor-pointer text-text-primary hover:bg-elevated hover:font-medium';
          } else if (isBlocked) {
            // Subtle fade — the date is still readable for context, but
            // signals "not selectable" without the noisy strikethrough.
            dayClass += ' text-text-muted opacity-50';
          } else {
            // Past dates that aren't class days, or non-class weekdays.
            dayClass += ' text-text-muted opacity-60';
          }

          // Today: clean ring outline that coexists with whatever fill
          // the cell already has (planned-skip, blocked, etc).
          if (isToday && !isSkipped) {
            dayClass += ' ring-1 ring-accent';
          }

          // Event accent: 2px coloured bar pinned to the bottom of the
          // cell. Replaces the old generic grey dot — type-tinted so a
          // glance distinguishes holiday from exam from academic marker.
          let eventBar = null;
          if (event && !isSkipped) {
            eventBar = (
              <span
                className="absolute inset-x-1 bottom-0.5 h-[2px] rounded-full"
                style={{ backgroundColor: eventAccent(event.type) }}
                aria-hidden="true"
              />
            );
          }

          return (
            <button
              key={day}
              type="button"
              title={title}
              onClick={() => {
                if (isClickable || isSkipped) {
                  onDateToggle(dateStr);
                }
              }}
              className={dayClass}
              disabled={!isClickable && !isSkipped}
            >
              {day}
              {eventBar}
            </button>
          );
        })}
      </div>

      {skippedDates.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-danger"
        >
          <Trash2 size={11} />
          Clear all
        </button>
      ) : null}
    </div>
  );
};

export default CalendarPlanner;
