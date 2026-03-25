# VIT-AP Attendance Planner: AI Context File

This file is a compact orientation guide for another developer. It explains what the project does, how the codebase is organized, where the logic lives, and what assumptions the app currently makes. It intentionally avoids long code dumps.

## 1. What this project is

This is a frontend-only React + Vite app for VIT-AP students to estimate whether they can remain above the required 75% attendance threshold.

The app lets a student:

- pick year + credit type + slot combination
- enter current attendance from VTOP
- see current attendance percentage
- see how many classes remain before the last instructional day
- mark future class dates as planned skips
- instantly see projected final attendance

The main planning rule is simple:

- minimum required attendance = `75%`

## 2. Stack and runtime model

- Framework: React 19
- Bundler/dev server: Vite 7
- Styling: Tailwind CSS + a small global CSS file
- Animation: Framer Motion
- Icons: Lucide React
- Language: JavaScript / JSX only
- Architecture: purely client-side, no backend, no database, no auth, no router

Important consequence:

- all logic runs in the browser
- semester/scheduling data is loaded from a static JSON file in `public/`
- there is no persistent storage for user attendance inputs or theme choice

## 3. File count and codebase shape

Tracked app/repo files before this context doc is committed: `29`

Tracked files by type:

- `.jsx`: 12
- `.js`: 8
- `.json`: 3
- `.css`: 2
- `.html`: 1
- `.md`: 1
- `.PNG`: 1
- `.gitignore`: 1

Source files under `src/`: `17`

Source directory breakdown:

- `src/`: 2 files
- `src/Components/`: 9 files
- `src/contexts/`: 1 file
- `src/data/`: 1 file
- `src/hooks/`: 2 files
- `src/styles/`: 1 file
- `src/utils/`: 1 file

High-level repo layout:

```text
public/
  semester-data.json   -> academic calendar + slot matrix
  Capture.PNG          -> social/share preview image
  output.css           -> tracked artifact, not currently imported anywhere

src/
  main.jsx             -> React bootstrap
  App.jsx              -> top-level page shell and screen switching
  Components/          -> UI building blocks
  hooks/               -> data loading + planner calculations
  contexts/            -> theme state
  data/                -> constants
  utils/               -> date formatting helper
  styles/              -> Tailwind/globals
```

## 4. Runtime flow

The app flow is:

1. `src/main.jsx` mounts `App` inside `ThemeProvider`.
2. `src/App.jsx` calls `useSemesterData()` to fetch `/semester-data.json`.
3. User picks year, credit bucket, and slot combination in `CourseSelector`.
4. The selected slot is passed into `useAttendancePlanner(...)`.
5. `useAttendancePlanner` derives:
   - event lookup map
   - holiday/exam exclusion set
   - remaining class dates until the last instructional day
   - attendance math for current and projected percentages
6. `PlannerView` renders:
   - current metrics
   - skip budget
   - interactive calendar
   - projected final attendance gauge

This means the real "business logic" is not spread across many files. Most of it lives in:

- `src/hooks/useAttendancePlanner.js`
- `public/semester-data.json`
- `src/Components/CourseSelector.jsx`
- `src/Components/PlannerView.jsx`
- `src/Components/CalendarPlanner.jsx`

## 5. Key data model

### Semester data

`public/semester-data.json` is the only real domain dataset.

It currently contains:

- `lastInstructionalDay`
- `academicCalendar`
- `slotsByYear`

Current dataset facts:

- last instructional day: `2026-05-02`
- academic calendar entries: `18`
- supported cohorts: `2nd_year`, `3rd_year`, `4th_year`
- each year has the same slot matrix right now
- per year:
  - `4_credits`: 21 combinations
  - `3_credits`: 24 combinations
  - `2_credits`: 14 combinations
  - slot-day keys: 48

Minimal shape:

```js
{
  lastInstructionalDay: "2026-05-02T00:00:00",
  academicCalendar: [
    { date: "2026-01-13", type: "holiday", name: "Bhogi" },
    { startDate: "2026-03-23", endDate: "2026-03-30", type: "exam", name: "CAT-2 Exams" }
  ],
  slotsByYear: {
    "2nd_year": {
      slotDays: { A1: [2, 6], TA1: [5] },
      slots: {
        "4_credits": ["A1+TA1+TAA1"],
        "3_credits": ["A1+TA1"],
        "2_credits": ["A1"]
      }
    }
  }
}
```

### Selected slot object

`CourseSelector` converts a chosen slot string into a compact object:

```js
{ slot: "A1+TA1+TAA1", days: [2, 4, 5, 6] }
```

`days` uses JavaScript `Date.getDay()` numbering:

- `0` = Sunday
- `1` = Monday
- `2` = Tuesday
- ...
- `6` = Saturday

### Derived planner state

`useAttendancePlanner` owns the live planning state:

- `classesTaken`
- `classesAttended`
- `skippedDates`
- `eventsMap`
- `remainingClassDates`
- `calculationData`
- `showProjection`

`calculationData` is the main derived result:

```js
{
  isValid: true,
  currentAtt,
  remainingClasses,
  projectedAtt,
  remainingSkips
}
```

## 6. Core logic rules

These are the most important behavioral rules in the app:

- attendance threshold comes from `src/data/constants.js` and is currently `75`
- if `classesAttended > classesTaken`, input is treated as invalid
- remaining class dates are generated from "today" until `lastInstructionalDay`
- a date counts as a class date only if:
  - it matches one of the selected slot weekdays
  - it is not marked as `holiday` or `exam`
- `holiday` and `exam` events are excluded from generated future class dates
- dates with any event object are not toggleable in the calendar UI
- planned skips are tracked as explicit user-selected future dates
- projected attendance assumes:
  - all remaining non-skipped class dates are attended
  - all selected skip dates are missed
- changing the slot resets entered attendance and skip selections

One subtle but important detail:

- `remainingClassDates` starts from the current browser date, not from semester start
- this app is therefore a forward planner, not a full-semester historical attendance simulator
- `other` events are a small edge case: they are not excluded from `remainingClassDates`, but the calendar click handler still blocks toggling them because it only allows dates with `!event`

## 7. What each main file does

### App shell

- `src/main.jsx`
  - mounts the app
  - wraps it in theme context

- `src/App.jsx`
  - top-level layout
  - loads semester data
  - owns `selectedSlot`
  - handles loading/error/empty/planner states
  - shows desktop sidebar and mobile selector

### Hooks

- `src/hooks/useSemesterData.js`
  - fetches `/semester-data.json`
  - converts `lastInstructionalDay` into a `Date`
  - exposes `{ data, isLoading, error }`

- `src/hooks/useAttendancePlanner.js`
  - contains most of the domain logic
  - resets state when slot changes
  - builds calendar event lookup
  - computes remaining class dates
  - calculates current and projected attendance metrics

### UI components

- `src/Components/CourseSelector.jsx`
  - year -> credit -> slot selection flow
  - converts slot strings into `{ slot, days }`

- `src/Components/PlannerView.jsx`
  - planner dashboard screen
  - input fields, info cards, projection area, warnings

- `src/Components/CalendarPlanner.jsx`
  - interactive month view
  - lets user mark eligible class dates as planned skips
  - shows dots for holiday/exam events

- `src/Components/AttendanceGauge.jsx`
  - animated circular gauge for projected attendance

- `src/Components/InfoCard.jsx`
  - reusable metric card

- `src/Components/LiveClock.jsx`
  - header date/time display

- `src/Components/ThemeToggle.jsx`
  - light/dark toggle

- `src/Components/FeedbackBanner.jsx`
  - dismissible CTA banner opening a Google Form

- `src/Components/AppFooter.jsx`
  - disclaimer, contact link, attribution text

### Supporting files

- `src/contexts/ThemeContext.jsx`
  - theme state in React context
  - default theme is `dark`
  - not persisted to local storage

- `src/data/constants.js`
  - `MIN_ATTENDANCE = 75`

- `src/utils/dateUtils.js`
  - single helper to format dates as `YYYY-MM-DD`

- `src/styles/globals.css`
  - Tailwind directives
  - reset styles
  - root height setup
  - backdrop blur support
  - custom scrollbar styling

## 8. UX and screen states

The app has four practical screen states:

1. Loading state while `semester-data.json` is being fetched
2. Error state if the fetch fails
3. Welcome/empty state before a slot is chosen
4. Planner state after slot selection

Inside planner state:

- metrics only become meaningful after the user enters current attendance
- calendar is always visible in the planner area
- projection card and top metric cards depend on `showProjection`

## 9. Important non-obvious notes

- The README is outdated relative to the actual code structure.
- There is no test suite in the current repo.
- There is no TypeScript.
- There is no API layer or server code.
- The app includes external analytics scripts in `index.html`:
  - Simple Analytics
  - Plausible
- `index.html` also contains Open Graph and Twitter metadata using `public/Capture.PNG`.
- Vite dev server is configured for port `5174` and includes a specific `allowedHosts` entry.
- Theme preference is volatile and resets on reload.
- Inputs and skip selections are also volatile and reset on refresh.
- `public/output.css` exists in the repo but is not referenced by the tracked source files.

## 10. If you need to modify the app

Use this guide:

- change attendance math -> `src/hooks/useAttendancePlanner.js`
- change slot/year options or calendar data -> `public/semester-data.json`
- change minimum threshold -> `src/data/constants.js`
- change selection UX -> `src/Components/CourseSelector.jsx`
- change planner layout/cards -> `src/Components/PlannerView.jsx`
- change calendar interaction rules -> `src/Components/CalendarPlanner.jsx`
- change theme behavior -> `src/contexts/ThemeContext.jsx`
- change page metadata / analytics -> `index.html`
- change styling defaults -> `src/styles/globals.css` or Tailwind classes in components

## 11. Short mental model

If you want the fastest possible understanding, think of the project like this:

- one static semester JSON file
- one hook to fetch that JSON
- one hook to turn a selected slot + calendar data + current attendance into planner outputs
- a small set of presentational React components around that hook

In short:

`semester-data.json` is the source of truth, `useAttendancePlanner` is the engine, and the rest of the app is the interface around it.
