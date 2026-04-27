# VIT-AP Attendance Planner

A planning workspace for VIT-AP students who need to keep their per-course
attendance above 75% without spreadsheets. The app combines slot-aware class
date enumeration, risk forecasting, a semester heatmap, and weekly delivery
of attendance reviews via email or Telegram.

Live: <https://vit-ap-attendance-planner.vercel.app>

## Features

- **Slot-aware planner** — pick a year/credit/slot combination and the planner
  enumerates remaining class days against the official Winter 2025-26 calendar.
- **Risk engine** — per-course current/projected attendance, recovery classes
  needed, planned-skip buffer, and a 0–100 risk score.
- **Forecast model** — once you have ≥4 saved snapshots per course, the
  Insights screen shows an EWMA-smoothed current attendance plus a linear
  regression forecast to the last instructional day with a 95 % band.
- **Semester heatmap** — GitHub-style grid of every weekday across the
  semester, highlighting class days, planned skips, holidays, and exams.
- **Notifications** — push reviews to email and/or Telegram. The weekly cron
  also alerts you when current/projected/forecast-low slips below your
  threshold.
- **Admin console** — gated by Firebase custom claims; validates semester,
  calendar event, and slot-mapping payloads before publishing.

## Tech stack

- React 19 + Vite 7 + Tailwind 3
- Firebase Auth + Firestore (Web SDK on the client, `firebase-admin` on the API)
- Vercel serverless functions for the API and weekly cron
- `simple-statistics` for the forecast, `ml-cart` for the risk classifier

## Project layout

```
api/                     Vercel serverless functions
  attendance-review.js   Weekly cron: scans users, sends review/alert emails + Telegram
  send-alert-email.js    Manual review trigger from the Notifications screen
  admin/                 Admin-gated validators (semester / events / slots / bootstrap)
  lib/                   firebase-admin singleton, http helpers, email + telegram, semester loader
public/
  semester-data.json     Academic calendar + slot mappings (Winter 2025-26)
src/
  App.jsx                Top-level routing between landing / dashboard / planner / insights / admin
  Components/            UI components (CalendarPlanner, AttendanceHeatmap, AdminScreen, ...)
  contexts/              AuthProvider (custom-claims aware), ThemeProvider
  hooks/                 useUserSync (Firestore), useAttendancePlanner, useSemesterData
  utils/                 attendanceAnalytics (risk + EWMA forecast), dateUtils
scripts/
  smokeTest.sh           Hits every API route and asserts expected status codes
  sendAttendanceReview.js  Local CLI mailer scaffold
tests/                   Node --test suites (analytics + endpoint contracts)
firestore.rules          Per-user access; server-only fields are locked
```

## Getting started

```bash
git clone https://github.com/Ralblast/vit-ap-attendance-planner
cd vit-ap-attendance-planner
npm install
cp .env.example .env      # fill in the Firebase keys at minimum
npm run dev
```

The dev server runs on <http://localhost:5174>. The `/api/*` routes are only
available when running with `vercel dev`, which mounts the serverless
functions alongside Vite.

## Environment

See [`.env.example`](.env.example) for the full list. The required minimum:

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_*` | Firebase Web SDK config (client) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account for `firebase-admin` (server) |
| `CRON_SECRET` | Bearer token Vercel cron sends to `/api/attendance-review` |
| `SMTP_HOST/USER/PASS` | Outbound email; the planner skips email channel cleanly when missing |
| `VITE_ADMIN_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` | First-time admin self-bootstrap (≥6 chars) |

`VITE_DEV_ALLOWED_HOSTS` accepts a comma-separated host allow-list for the dev
server (useful for ngrok / Tailscale).

## Authentication and authorization

- The client signs in via Firebase Auth (email + password).
- The server verifies every protected request with `admin.auth().verifyIdToken`.
- Admin status is granted by the `admin` custom claim, which is set when the
  bootstrap email logs in for the first time. The `VITE_ADMIN_EMAIL` env var
  is only a UX hint — server gates always re-check the claim.
- Firestore rules in [`firestore.rules`](firestore.rules) prevent clients from
  writing the `role`, `email`, or `lastEmailSentAt` fields on `users/{uid}`.
  Deploy them with the Firebase CLI:

  ```bash
  firebase deploy --only firestore:rules
  ```

## Notifications

Each user can opt into either or both channels:

- **Email** — sent from `ATTENDANCE_REVIEW_FROM` (or `SMTP_USER`) to the
  user's verified email.
- **Telegram** — store a bot token + chat ID under
  `users/{uid}.notificationChannels.telegram`. Create the bot with
  [@BotFather](https://t.me/BotFather), message it once, then paste the
  chat ID into the Notifications screen.

The weekly cron (`30 15 * * 6` UTC, configured in [`vercel.json`](vercel.json))
runs over all users in chunks of 6 and sends to whichever channels they have
configured. Manual sends from the Notifications screen are rate-limited to
one per 60 seconds per user.

## Scripts

```bash
npm run dev               # vite dev server
npm run build             # production build
npm run lint              # eslint
npm run test              # node --test (analytics + endpoint contracts)
npm run attendance:review # local smtp scaffold; sends a placeholder email
./scripts/smokeTest.sh    # hits every API route and asserts the status code
```

`smokeTest.sh` accepts `BASE_URL`, `ID_TOKEN`, and `CRON_SECRET` env vars to
exercise authenticated paths against a deployed environment.

## Disclaimer

Independent student project. Not affiliated with VIT-AP. Always verify any
schedule decision against the official VIT-AP communication.
