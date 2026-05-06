import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CalendarRange } from 'lucide-react';

import SlotHeatmap from './SlotHeatmap.jsx';
import { daysUntil, getNextCheckpoint, buildProjectionHorizons } from '../utils/projectionHorizons.js';

const NO_SLOT_ID = '__no_slot__';

const YEAR_LABELS = {
  '2nd_year': '2nd Year',
  '3rd_year': '3rd Year',
  '4th_year': '4th Year',
};

const CREDIT_LABELS = {
  '4_credits': '4 credits',
  '3_credits': '3 credits',
  '2_credits': '2 credits',
};

// Flatten the nested slotsByYear structure into a single picker-friendly
// list. Each option carries the resolved slotDays (the union for compound
// slots like A1+TA1+TAA1) so the heatmap can render directly without
// re-deriving them at click time.
const buildSlotOptions = semesterData => {
  const options = [];
  const slotsByYear = semesterData?.slotsByYear || {};
  Object.entries(slotsByYear).forEach(([year, yearData]) => {
    const slotDaysMap = yearData?.slotDays || {};
    const slots = yearData?.slots || {};
    Object.entries(slots).forEach(([credit, slotList]) => {
      (slotList || []).forEach(slot => {
        const baseSlots = String(slot).split('+');
        const days = new Set();
        baseSlots.forEach(b => {
          (slotDaysMap[b] || []).forEach(d => days.add(d));
        });
        options.push({
          id: `${year}__${credit}__${slot}`,
          year,
          credit,
          slot,
          slotDays: Array.from(days).sort(),
        });
      });
    });
  });
  return options;
};

// Pull every academic-calendar event into a flat list sorted by date,
// so the right-hand "Upcoming" panel can show what's coming up next.
const buildEventList = (semesterData, today) => {
  const events = Array.isArray(semesterData?.academicCalendar)
    ? semesterData.academicCalendar
    : [];
  return events
    .map(event => {
      const startStr = event.date || event.startDate;
      if (!startStr) return null;
      const start = new Date(`${startStr}T00:00:00`);
      if (Number.isNaN(start.getTime())) return null;
      const endStr = event.endDate || event.date || event.startDate;
      const end = endStr ? new Date(`${endStr}T00:00:00`) : start;
      return {
        ...event,
        start,
        end,
        spansRange: !!event.startDate && event.startDate !== event.endDate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)
    .map(event => ({
      ...event,
      isPast: event.end < today,
      isOngoing: event.start <= today && event.end >= today,
    }));
};

const formatEventRange = event => {
  const opts = { month: 'short', day: 'numeric' };
  if (event.spansRange) {
    return `${event.start.toLocaleDateString('en-US', opts)} – ${event.end.toLocaleDateString('en-US', opts)}`;
  }
  return event.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const eventTypeTone = type => {
  switch (type) {
    case 'holiday':
      return 'text-danger';
    case 'exam':
    case 'other':
      return 'text-warning';
    case 'academic':
      return 'text-accent';
    default:
      return 'text-text-secondary';
  }
};

const SemesterCalendarScreen = ({
  semesterData,
  defaultSlot,
  defaultSlotDays,
  onBack,
  isGuest = false,
  onPlanSkip,
  userCourses = [],
}) => {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const slotOptions = useMemo(() => buildSlotOptions(semesterData), [semesterData]);

  // Pick a sensible default: caller-provided slot first (guest's selected
  // slot or signed-in user's first course), otherwise the first 4-credit
  // slot we can find. Falls back to the "No slot" sentinel if there are
  // no options at all.
  const defaultOptionId = useMemo(() => {
    if (defaultSlot) {
      const match = slotOptions.find(option => option.slot === defaultSlot);
      if (match) return match.id;
    }
    return slotOptions[0]?.id || NO_SLOT_ID;
  }, [defaultSlot, slotOptions]);

  const [selectedOptionId, setSelectedOptionId] = useState(defaultOptionId);
  const isNoSlot = selectedOptionId === NO_SLOT_ID;
  const selectedOption = useMemo(
    () =>
      isNoSlot
        ? null
        : slotOptions.find(option => option.id === selectedOptionId) || null,
    [isNoSlot, selectedOptionId, slotOptions]
  );

  const slotDays = isNoSlot ? [] : selectedOption?.slotDays || defaultSlotDays || [];
  const slotLabel = isNoSlot ? 'Events only' : selectedOption?.slot || defaultSlot || '';

  // Plan-skip button is allowed when a real slot is picked AND, for
  // signed-in users, that slot matches a saved course (so the resulting
  // skip plan persists). Guests can plan against any slot — their session
  // state holds the skip dates either way.
  const matchingCourse = useMemo(() => {
    if (!selectedOption) return null;
    return (
      (Array.isArray(userCourses) ? userCourses : []).find(
        course => course.slotLabel === selectedOption.slot
      ) || null
    );
  }, [selectedOption, userCourses]);

  const canPlanSkip = !!selectedOption && (isGuest || !!matchingCourse);
  const planSkipTooltip = !selectedOption
    ? 'Pick a slot to plan a skip'
    : !isGuest && !matchingCourse
      ? `Add ${selectedOption.slot} from the dashboard to plan skips for it`
      : `Open Skip Calendar for ${selectedOption.slot}`;

  // Group dropdown options by year for clearer visual grouping inside
  // the native <select> element (optgroups).
  const optionsByYear = useMemo(() => {
    const grouped = {};
    slotOptions.forEach(option => {
      if (!grouped[option.year]) grouped[option.year] = [];
      grouped[option.year].push(option);
    });
    return grouped;
  }, [slotOptions]);

  const events = useMemo(() => buildEventList(semesterData, today), [semesterData, today]);
  const upcomingEvents = useMemo(
    () => events.filter(event => !event.isPast).slice(0, 6),
    [events]
  );

  const nextCheckpoint = useMemo(() => getNextCheckpoint(semesterData), [semesterData]);
  const checkpoints = useMemo(() => buildProjectionHorizons(semesterData), [semesterData]);

  return (
    <div className="space-y-8">
      <section className="space-y-5 border-b border-border-faint pb-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            {isGuest ? 'Back to start' : 'Back to dashboard'}
          </button>
          {nextCheckpoint && !nextCheckpoint.isPast ? (
            <p className="text-[11px] text-text-muted">
              Next checkpoint:{' '}
              <span className="font-medium text-text-secondary">
                {nextCheckpoint.label}
              </span>{' '}
              · {(() => {
                const days = daysUntil(nextCheckpoint.date);
                if (days === null) return '';
                if (days < 0) return 'passed';
                if (days === 0) return 'today';
                if (days === 1) return 'in 1 day';
                return `in ${days} days`;
              })()}
            </p>
          ) : null}
        </div>

        <div>
          <p className="eyebrow-label">Semester Calendar</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-text-primary sm:text-3xl lg:text-4xl">
            Holidays, exams, and class days at a glance.
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            The full {semesterData?.name || 'semester'} laid out as a heatmap. Pick a slot
            to see when its classes meet — academic events overlay automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-y border-border-faint py-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Highlight class days for slot
              </span>
              <select
                value={selectedOptionId}
                onChange={event => setSelectedOptionId(event.target.value)}
                className="mt-1 min-w-[260px] border border-border-default bg-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              >
                <option value={NO_SLOT_ID}>No slot — events only</option>
                {Object.entries(optionsByYear).map(([year, list]) => (
                  <optgroup key={year} label={YEAR_LABELS[year] || year}>
                    {list.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.slot} · {CREDIT_LABELS[option.credit] || option.credit}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            {onPlanSkip ? (
              <button
                type="button"
                onClick={() =>
                  selectedOption ? onPlanSkip(selectedOption) : null
                }
                disabled={!canPlanSkip}
                title={planSkipTooltip}
                className="primary-button h-[38px] gap-1.5 px-3 py-0 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Plan skip
                <ArrowRight size={13} />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] text-text-muted">
            {checkpoints.map(checkpoint => (
              <span key={checkpoint.key} className={checkpoint.isPast ? 'opacity-60' : ''}>
                <span className="font-semibold text-text-secondary">{checkpoint.label}</span>{' '}
                {checkpoint.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {checkpoint.isPast ? ' (passed)' : ''}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="space-y-3">
          <SlotHeatmap
            slotLabel={slotLabel}
            slotDays={slotDays}
            course={null}
            semesterData={semesterData}
            showLegend
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="eyebrow-label">Upcoming events</p>
            <h3 className="mt-1 text-base font-semibold text-text-primary">
              <CalendarDays size={14} className="mr-1 inline align-middle" />
              What's next on the calendar
            </h3>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-text-muted">
              No upcoming academic events on file.
            </p>
          ) : (
            <ul className="divide-y divide-border-faint border-y border-border-faint">
              {upcomingEvents.map(event => (
                <li
                  key={`${event.name}-${event.start.toISOString()}`}
                  className="py-2.5"
                >
                  <p
                    className={`text-sm font-medium ${
                      event.isOngoing ? 'text-accent' : 'text-text-primary'
                    }`}
                  >
                    {event.name}
                    {event.isOngoing ? (
                      <span className="ml-2 inline-flex items-center rounded bg-accent-glow px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                        ongoing
                      </span>
                    ) : null}
                  </p>
                  <p className={`text-[11px] ${eventTypeTone(event.type)}`}>
                    {event.type ? `${event.type} · ` : ''}
                    {formatEventRange(event)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {isGuest ? (
            <div className="border border-border-faint bg-subtle p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <CalendarRange size={12} /> Guest preview
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Sign in to track per-course attendance against this calendar with
                weekly forecasts and risk classification.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default SemesterCalendarScreen;
