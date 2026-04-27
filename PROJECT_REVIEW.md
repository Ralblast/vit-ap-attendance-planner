# Project Review

## App Overview

VIT-AP Attendance Planner is a React + Vite application for tracking course attendance, forecasting attendance risk, planning future skips, and sending review emails to students who want recurring attendance visibility.

The app supports:

- guest planning with slot-based class schedules
- authenticated dashboards backed by Firebase Auth and Firestore
- risk scoring and attendance trend snapshots
- weekly review / alert email workflows
- an admin-only validation surface for semester and calendar payloads

## Architecture Breakdown

### Frontend

- `src/App.jsx`
  - top-level screen orchestration
  - auth-aware routing between landing, dashboard, planner, insights, notifications, and admin flows
  - synchronization between planner inputs and persisted course data
- `src/Components/*`
  - `DashboardScreen.jsx`: course summary and risk overview
  - `PlannerView.jsx`: per-course attendance planning, horizon selection, and skip calendar
  - `InsightsScreen.jsx`: historical trend view
  - `NotificationsScreen.jsx`: email preferences and manual review trigger
  - `AdminScreen.jsx`: validation-oriented admin tooling
- `src/contexts/*`
  - `AuthContext.jsx`: Firebase auth flows plus admin bootstrap handoff
  - `ThemeContext.jsx`: light/dark theme state
- `src/hooks/*`
  - `useSemesterData.js`: semester JSON loading
  - `useAttendancePlanner.js`: planner calculations and skip-date state
  - `useUserSync.js`: Firestore load/save normalization for user workspace data
- `src/utils/attendanceAnalytics.js`
  - remaining-class calculation
  - course risk scoring
  - dashboard summary aggregation
  - trend analysis

### Data and Persistence

- Semester data is loaded from `public/semester-data.json`.
- User workspace data is stored in Firestore under `users/{uid}`.
- Saved user data includes:
  - courses
  - selected slot metadata
  - attendance snapshots
  - notification preferences
  - admin draft values
  - theme preference

### Serverless API Layer

- `api/send-alert-email.js`
  - authenticated manual review email sender
- `api/attendance-review.js`
  - weekly review / alert cron endpoint
- `api/admin/*.js`
  - validation endpoints for semester, event, and slot payloads
- `api/admin/bootstrap.js`
  - server-side bootstrap for the first admin account without exposing the bootstrap password to the client bundle

## Feature Details

### Attendance Planning

- slot-based course selection by year and credit bucket
- attendance input for classes taken vs attended
- projected attendance calculation
- recovery requirement calculation
- planned-skip calendar
- projection horizons for CAT-1, CAT-2, FAT, and full semester

### Risk and Insights

- current vs projected attendance
- risk labels and numeric risk scores
- trend snapshots stored per course
- dashboard rollup across all tracked courses
- historical sparkline view in insights

### Notifications

- manual review email send
- weekly summary toggle
- alert threshold preference
- alert enable/disable toggle
- cron review endpoint now respects stored notification preferences

### Admin

- validation-oriented tools for:
  - semester payloads
  - academic calendar events
  - slot mapping payloads
- environment-backed exam cutoff visibility

## Key Flows

### 1. Guest Planner Flow

1. Landing page
2. Start as guest
3. Select year, credits, and slot combination
4. Enter current attendance
5. Review projected outcome and planned skips

### 2. Authenticated Student Flow

1. Sign in or create account
2. Save course slot to Firestore-backed workspace
3. Update attendance and skip plans
4. View dashboard and insights
5. Save manual trend snapshots when needed

### 3. Notification Flow

1. Student configures review preferences
2. Manual review email can be triggered from the app
3. Weekly cron sends either:
   - weekly summary emails for opted-in users
   - alert emails for users whose course risk crosses the configured threshold

### 4. Admin Bootstrap Flow

1. Admin attempts to sign in with the configured admin email
2. If the Firebase user does not yet exist, the app calls the server bootstrap endpoint
3. The bootstrap endpoint validates the server-side bootstrap password and creates the admin user securely
4. Client retries Firebase sign-in

## Developer Notes

- `npm run lint` is clean.
- `npm run build` succeeds.
- `npm run attendance:review` now loads `.env` automatically.
- Email sender resolution now falls back to `SMTP_USER` when `ATTENDANCE_REVIEW_FROM` is not set.
- Only a curated subset of `VITE_*` variables is exposed to the client bundle via `vite.config.js`.

## Future Improvements

- split the main client bundle further to reduce the remaining Vite chunk-size warning
- convert the admin validation surface into a true publish workflow if global semester editing is needed
- add automated UI coverage for planner and notification flows
- add a dedicated semester source for cron reviews so server-side reviews can reuse the same live calendar configuration as the frontend
