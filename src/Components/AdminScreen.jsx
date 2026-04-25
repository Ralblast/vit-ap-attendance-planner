import React, { useMemo, useState } from 'react';

const EVENT_TYPES = ['academic', 'holiday', 'exam', 'other'];

const countSlots = slotsByYear =>
  Object.values(slotsByYear || {}).reduce((total, yearData) => {
    const slots = yearData?.slots || {};
    return total + Object.values(slots).reduce((count, list) => count + list.length, 0);
  }, 0);

const getEventTypeCounts = events =>
  (events || []).reduce((counts, event) => {
    counts[event.type] = (counts[event.type] || 0) + 1;
    return counts;
  }, {});

const examDateConfig = [
  ['CAT-1', import.meta.env.VITE_CAT1_START_DATE || 'Not set'],
  ['CAT-2', import.meta.env.VITE_CAT2_START_DATE || 'Not set'],
  ['FAT', import.meta.env.VITE_FAT_START_DATE || 'Not set'],
];

export default function AdminScreen({ userData, semesterData, onUpdateAdminDraft }) {
  const [status, setStatus] = useState('');
  const [eventDraft, setEventDraft] = useState({
    name: '',
    type: 'holiday',
    date: '',
    startDate: '',
    endDate: '',
  });
  const draft = userData?.adminDraft || {};
  const eventCounts = useMemo(
    () => getEventTypeCounts(semesterData?.academicCalendar),
    [semesterData?.academicCalendar]
  );
  const totalSlots = useMemo(() => countSlots(semesterData?.slotsByYear), [semesterData?.slotsByYear]);

  const validateSemester = async () => {
    setStatus('');

    try {
      const response = await fetch('/api/admin/semester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.semesterName,
          minAttendance: draft.minAttendance,
          lastInstructionalDay: draft.lastInstructionalDay,
          isActive: true,
        }),
      });
      const result = await response.json();
      setStatus(result.ok ? 'Semester settings are ready to publish.' : 'Semester settings need review.');
    } catch {
      setStatus('Unable to validate the semester configuration right now.');
    }
  };

  const validateEvent = async () => {
    setStatus('');

    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventDraft),
      });
      const result = await response.json();

      if (result.ok) {
        await onUpdateAdminDraft({
          eventCount: Number(draft.eventCount || semesterData?.academicCalendar?.length || 0) + 1,
        });
        setStatus('Calendar event is ready to publish.');
        setEventDraft({ name: '', type: 'holiday', date: '', startDate: '', endDate: '' });
      } else {
        setStatus('Calendar event needs review.');
      }
    } catch {
      setStatus('Unable to validate the calendar event right now.');
    }
  };

  const validateSlots = async () => {
    setStatus('');

    try {
      const response = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: 'active',
          credit: 'all',
          slots: Object.keys(semesterData?.slotsByYear || {}),
          slotDays: semesterData?.slotsByYear || {},
        }),
      });
      const result = await response.json();
      setStatus(result.ok ? 'Slot mapping is ready to publish.' : 'Slot mapping needs review.');
    } catch {
      setStatus('Unable to validate slot mapping right now.');
    }
  };

  return (
    <div className="space-y-8">
      <section className="border-b border-border-faint pb-8">
        <p className="eyebrow-label">Admin Console</p>
        <h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em]">
          Manage semester rules, calendar events, slot mappings, and alert readiness.
        </h2>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Events', semesterData?.academicCalendar?.length || 0],
          ['Slots', totalSlots],
          ['Min attendance', `${draft.minAttendance || 75}%`],
          ['Mode', 'Admin'],
        ].map(([label, value]) => (
          <div key={label} className="border-y border-border-faint py-4">
            <p className="eyebrow-label">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6 lg:border-r lg:border-border-faint lg:pr-8">
          <div>
            <p className="eyebrow-label">Semester Settings</p>
            <p className="mt-2 text-sm text-text-secondary">
              Control active semester rules used by forecasting and recovery calculations.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Semester name
              </span>
              <input
                value={draft.semesterName || ''}
                onChange={event => onUpdateAdminDraft({ semesterName: event.target.value })}
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Minimum attendance
              </span>
              <input
                type="number"
                min="1"
                max="100"
                value={draft.minAttendance || 75}
                onChange={event => onUpdateAdminDraft({ minAttendance: event.target.value })}
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                Last instructional day
              </span>
              <input
                type="date"
                value={draft.lastInstructionalDay || ''}
                onChange={event => onUpdateAdminDraft({ lastInstructionalDay: event.target.value })}
                className="field-input"
              />
            </label>

            <button type="button" onClick={validateSemester} className="primary-button">
              Validate semester
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div>
              <p className="eyebrow-label">Calendar Event</p>
              <h3 className="mt-1 text-2xl font-semibold">Prepare holiday or exam update</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={eventDraft.name}
                onChange={event => setEventDraft(value => ({ ...value, name: event.target.value }))}
                className="field-input"
                placeholder="Event name"
              />
              <select
                value={eventDraft.type}
                onChange={event => setEventDraft(value => ({ ...value, type: event.target.value }))}
                className="field-input"
              >
                {EVENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={eventDraft.date}
                onChange={event => setEventDraft(value => ({ ...value, date: event.target.value }))}
                className="field-input"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={eventDraft.startDate}
                  onChange={event =>
                    setEventDraft(value => ({ ...value, startDate: event.target.value }))
                  }
                  className="field-input"
                />
                <input
                  type="date"
                  value={eventDraft.endDate}
                  onChange={event =>
                    setEventDraft(value => ({ ...value, endDate: event.target.value }))
                  }
                  className="field-input"
                />
              </div>
            </div>
            <button type="button" onClick={validateEvent} className="ghost-button">
              Validate event
            </button>
          </div>

          <div className="grid gap-6 border-y border-border-faint py-5 md:grid-cols-2">
            <div>
              <p className="eyebrow-label">Event Breakdown</p>
              <p className="mt-2 text-sm text-text-muted">
                Academic {eventCounts.academic || 0} · Holidays {eventCounts.holiday || 0} · Exams{' '}
                {eventCounts.exam || 0}
              </p>
            </div>
            <div>
              <p className="eyebrow-label">Slot Mapping</p>
              <p className="mt-2 text-sm text-text-muted">
                {Object.keys(semesterData?.slotsByYear || {}).length} year groups · {totalSlots} course combinations
              </p>
              <button type="button" onClick={validateSlots} className="mt-3 text-sm font-semibold text-accent">
                Validate slot mapping
              </button>
            </div>
          </div>

          <div className="border-b border-border-faint pb-5">
            <p className="eyebrow-label">Projection Cutoffs</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {examDateConfig.map(([label, value]) => (
                <div key={label}>
                  <p className="text-sm font-medium text-text-primary">{label}</p>
                  <p className="mt-1 font-mono text-sm text-text-muted">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {status ? <p className="text-sm text-text-secondary">{status}</p> : null}
        </div>
      </section>
    </div>
  );
}
