import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CALCULATION_DATE } from '../data/constants.js';
import { formatDate } from '../utils/dateUtils.js';

const CalendarPlanner = ({ classDates, onDateToggle, skippedDates, onClear, theme, eventsMap }) => {
  const [viewDate, setViewDate] = useState(CALCULATION_DATE);

  const handleMonthNav = (offset) =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + offset, 1));

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const selectableDates = new Set(classDates);

  const Legend = () => (
    <div className={`mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ring-1 ${theme === 'dark' ? 'ring-green-400' : 'ring-green-500'}`}></div>
        Class Day
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        Planned Skip
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></div>
        Holiday/Break
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
        Exam Period
      </div>
    </div>
  );

  return (
    <div className={`p-6 rounded-xl shadow-md border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={() => handleMonthNav(-1)} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
          &lt;
        </button>
        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={() => handleMonthNav(1)} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
          &gt;
        </button>
      </div>

      <div className={`grid grid-cols-7 gap-1 text-center text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-black'} mb-4`}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {calendarDays.map(day => {
          const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
          const dateStr = formatDate(date);
          const event = eventsMap.get(dateStr);
          const isSelectable = selectableDates.has(dateStr);
          const isSkipped = new Set(skippedDates).has(dateStr);
          const isSunday = date.getDay() === 0;

          let dayClass = 'h-9 w-9 flex items-center justify-center rounded-full text-base transition-colors duration-150 relative ';
          let title = event ? event.name : '';

          if (isSkipped) {
            dayClass += 'bg-red-500 text-white font-bold ring-2 ring-red-400 scale-110';
          } else if (isSelectable) {
            dayClass += `cursor-pointer ${theme === 'dark' ? 'text-green-400 hover:bg-green-500/20' : 'text-green-700 hover:bg-green-200'}`;
          } else if (isSunday) {
            dayClass += theme === 'dark' ? 'text-amber-600/70' : 'text-amber-600';
          } else {
            dayClass += theme === 'dark' ? 'text-gray-400' : 'text-black';
          }

          // Highlight oval for class days
          if (isSelectable && !isSkipped) {
            dayClass += theme === 'dark'
              ? ' bg-green-800 ring-1 ring-green-400/80 text-green-300 hover:bg-green-700'
              : ' bg-green-200 ring-1 ring-green-500 text-green-700 hover:bg-green-300';
          }

          let eventDot = null;
          if (event && !isSkipped) {
            if (event.type === 'holiday') {
              eventDot = <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-amber-500/80 rounded-full"></div>;
            } else if (event.type === 'exam') {
              eventDot = <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>;
            }
          }

          return (
            <button
              key={day}
              title={title}
              onClick={() => isSelectable && onDateToggle(dateStr)}
              disabled={!isSelectable || !!event}
              className={dayClass}
            >
              {day}
              {eventDot}
            </button>
          );
        })}
      </div>

      {skippedDates.length > 0 && (
        <button onClick={onClear} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 mt-5 ml-auto">
          <Trash2 size={14} />
          Clear Selections
        </button>
      )}

      <Legend />
    </div>
  );
};

export default CalendarPlanner;
