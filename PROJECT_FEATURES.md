# VIT-AP Attendance Planner — Project Features Summary

## What this project does

The VIT-AP Attendance Planner is a web-based planning workspace for VIT-AP students who must keep their per-course attendance above 75%. It eliminates the need for spreadsheets by combining the official academic calendar, slot-aware class-day enumeration, an attendance risk engine, statistical forecasting, a semester heatmap, and weekly cross-channel notifications into a single workspace. Students can plan future absences, track recovery requirements, and receive automated email or Telegram alerts when any course slips toward the 75% threshold. Admins can validate semester rules, calendar events, and slot mappings before they become live.

The app supports a fully functional guest mode (no account required) for one-off calculations, and a signed-in mode that persists courses, attendance, snapshots, theme, and notification preferences to Firebase.

---

## 1. Core Planning & Risk Engine

### Slot-aware class-day enumeration
- Calculates remaining class days for any selected slot combination from "today" through the last instructional day of the semester.
- Honors the official academic calendar — holidays, exam blocks (CAT-1, CAT-2, FAT), and "other" event types automatically remove blocked dates from the class-day list.
- Handles single-date events (`date`) and multi-day ranges (`startDate` / `endDate`) uniformly.
- Supports compound slot strings like `A1+TA1+TAA1`, deriving the union of weekday meetings from the slot-days map.
- **`getClassDatesBetween(slotDays, calendar, fromDate, toDate)`** — companion helper added this iteration. Enumerates slot class days in any historical window (exclusive of `fromDate`, inclusive of `toDate`), honoring blocked dates the same way. Drives the auto-fill in the Update Attendance strip and the candidate-date list shown to the precise-skip + cancelled-class chip pickers.

### Risk metrics (per course)
Computed live in the planner and dashboard, exposed on the `analytics` object the engine returns:
- **Current attendance** — `(attended / taken) × 100`.
- **Projected attendance** — projected % at the chosen horizon (semester end, or any checkpoint when the planner overrides `lastInstructionalDay`).
- **Remaining classes** — unblocked class days left for that slot in the active window.
- **Safe skips left** — how many additional classes the student can miss while still ending ≥ 75 %.
- **Recovery classes needed** — minimum consecutive classes the student must attend to climb back above the threshold (capped at 300 probes; `isRecoveryImpossible: true` when not feasible within remaining classes).
- **Planned skip count** — number of future class dates the user has marked as skips.
- **Risk score (0–100)** — weighted composite of projection gap, threshold deficit, negative skip buffer, recovery pressure, planned-skip penalty, and trend direction.
- **Risk label** — `Safe` / `Warning` / `Critical`, chosen as the worse of (a) a formula label based on thresholds and risk score, and (b) an `ml-cart` decision-tree classifier trained on hand-labeled examples (the `worst-label-wins` defensive ensemble).
- **`formulaLabel` and `classifierLabel`** — exposed separately this iteration so the "Why this verdict?" panel in the planner can show whether the two methods agreed or diverged.
- **`classifierFeatures`** — the five live values fed to the CART tree for this course (`current %, projected %, skip buffer, recovery needed, trend bucket`). Surfaced in the Why panel so the student sees exactly what the classifier saw.
- **`riskBreakdown`** — the six signed component contributions to the formula score (`projectionPenalty`, `thresholdDeficitPenalty`, `skipBufferPenalty`, `recoveryPenalty`, `plannedSkipPenalty`, `trendAdjustment`). Sum equals `riskScore`. Surfaced in the Why panel so the student can audit the math.

### Recommendation engine
Generates a context-aware recommendation per course (e.g. "Attend the next 3 classes before planning any skip", "Cancel planned skips and rebuild the buffer", or "You have a safe buffer of 2 skips"). Used both on-screen and inside email/Telegram alerts.

### Projection horizons
The planner can re-run all metrics against three cutoff dates so the student can answer "where will I land by …":
- **Till CAT-1** (start of first continuous-assessment exams).
- **Till CAT-2** (start of mid-semester exams).
- **Till FAT** (final assessment / last instructional day — default).

Cutoff dates are derived from `VITE_CAT1_START_DATE` / `VITE_CAT2_START_DATE` / `VITE_FAT_START_DATE` env vars, falling back to detection inside the academic calendar JSON. Past horizons are auto-disabled.

* **Shared horizon module (`src/utils/projectionHorizons.js`)** — `buildProjectionHorizons` (used by the planner toggle) and `getNextCheckpoint` + `daysUntil` (used by the dashboard's Exam Horizon panel) live in one module so the headline checkpoint date is identical wherever it's shown.

---

## 2. Forecast Model (Insights)

A statistical forecaster runs once a course has at least **4 saved attendance snapshots**:
- **EWMA-smoothed current** — exponentially-weighted moving average (α = 0.4) of historical snapshot percentages.
- **Linear regression** — fits `(daysSinceFirstSnapshot, attendance%)` using `simple-statistics`.
- **End-of-semester prediction** — extrapolates the regression line to the last instructional day.
- **95 % confidence band** — derived from the residual standard deviation (z = 1.96), giving a low/high range.
- **Slope per day** — daily drift in attendance, in %/day.
- **Trajectory direction** — improving / stable / declining (slope thresholds ±0.35 %/day).
- **Sample-size gating** — until 4 snapshots exist, the UI shows progress (e.g. "2/4 snapshots") and the planner's forecast row reads *"Save N more attendance snapshots to unlock the predicted % with confidence interval"* — honest about the floor instead of hiding the row entirely. **Guest mode** swaps the forecast row for a sign-in nudge with a working `Sign in →` button (the regression needs persisted snapshot history).

---

## 3. Course Setup & Selection

### CourseSelector (modal flow)
Three-step picker:
1. **Year** — 4th Year (2022 batch), 3rd Year (2023 batch), or 2nd Year (2024 batch). Freshers are explicitly excluded (footer disclaimer).
2. **Credit category** — 4 credits, 3 credits, or 2 credits.
3. **Slot combination** — picked from the year/credit list (e.g. `A1+TA1+TAA1`, `C2+SC2+TC2`, `G1`).

The selector lives inside an animated modal launched from the dashboard "Add course" button; on submit, signed-in users persist the slot, guests open the planner immediately.

### Course management
- Multiple courses per user. Each course stores: `id`, `courseName`, `slotLabel`, `slotDays`, `credit`, `classesTaken`, `classesAttended`, `skippedDates[]`, `lastUpdated`.
- Add, open, and delete courses from the dashboard.
- Click any course tile to jump straight into the planner pre-filled with its saved values.
- Adding a slot that already exists updates the existing course rather than duplicating it.

---

## 4. Dashboards & Screens

### Landing screen (guests)
Full-bleed hero with three discoverable CTAs (`Start as guest`, `Sign in`, `Browse the semester calendar →`) and a redesigned **Live Risk Preview** card on the right. The preview shows a sample slot (`A1+TA1 · 4 credits · snapshot Apr 12, 2026`) with a big `73.8%` display, a verdict line (`Warning · 4 classes from recovery`), a three-row mini-table of projections at CAT-1 / CAT-2 / FAT (passed / on-track / at-risk), and a one-line statistical-forecast row with 95% CI and trajectory direction. Below the CTAs sits a small credibility line that names the three checkpoints, the threshold, and the freshers disclaimer in one sentence. Below the hero, a **"What's inside"** three-feature row (slot-aware schedule · forecast at every checkpoint · weekly alerts) gives a scannable preview of what guests unlock when they sign in.

### Dashboard screen (signed-in)
* **Exam Horizon panel (top)** — the headline section. Picks the next upcoming exam-eligibility checkpoint (CAT-1 / CAT-2 / FAT) from the env dates with calendar-event fallback. The header surfaces the checkpoint label + countdown, the on-track summary (`X of Y on track for FAT`), and an inline `+ Add Course` button. Renders one row per course with `current% → projected%`, an inline verdict glyph (`StatusGlyph` SVG, no native emoji), planned-skip count, last-updated freshness, and an inline trash icon that fades in on hover. Below the rows, a one-line recovery action per at-risk course — switches to an honest "recovery isn't possible within the remaining schedule" copy when the deficit can't be closed.
* **Update Attendance strip** — mounted directly inside the Exam Horizon panel header. Always-visible compact bar (`Last update: 13 days ago · 6 new class days`) that expands inline. The expanded form shows every course as a row with auto-filled `taken` (`lastTaken + classDaysSinceLastUpdate`) and auto-filled `attended` (`lastAttended + classDaysSinceLastUpdate`); the student adjusts down for any classes missed or cancelled. When `attended` is decreased below the auto-fill, an optional **precise-skip chip picker** appears with date chips for the candidate class days — tap each missed date to write to `missedDates[]`, or hit `skip this →` to save totals only. When `taken` is decreased, an optional **cancelled-class chip picker** behaves the same way and writes to `cancelledDates[]`. Both pickers are mutually exclusive (a date marked cancelled is removed from the missed candidates) and both have honest "skip this" escape hatches. One bulk save updates every changed course + writes one snapshot per course (deduped per-day) + appends precise dates if provided.
- **Per-course mini heatmaps** below — one `SlotHeatmap` per saved course, full data (past attended / missed-logged / cancelled / planned-skip / holiday / exam / today / probability-blended ambiguity for unknown past) with a single shared legend at the top.
- The pre-iteration `Tracked Courses` card grid is **gone** — its function (open / delete a course) is now inline on each Exam Horizon row, eliminating the redundant second course list.

### Planner view
Full-detail view for a single course. Hero zone restructured around one horizon-aware projection table:
- Header: back-to-dashboard link + course name + slot label.
- **4 hero tiles** (was 6): Current · Projected · Risk · Skips Left Till {next-checkpoint}.
  - **Projected** is a multi-row mini-table inside the tile listing CAT-1 / CAT-2 / FAT projected % with a `StatusGlyph` glyph per cell. Past checkpoints render `(passed)` muted. No more user-toggled horizon-switcher row.
  - **Risk** is the ensemble verdict (Safe / Warning / Critical) with `StatusGlyph` glyph and a `▼ Why this verdict?` toggle (see below).
  - **Skips Left** label dynamically reflects the next upcoming checkpoint (`Skips Left Till CAT-2` / `... Till FAT`). Number is scoped to that checkpoint's window, not the full semester.
- **Inline recovery line** appears beneath the hero tiles only when `recoveryClassesNeeded > 0` (folds in the old "Recovery Needed" tile honestly).
- **"Why this verdict?" expandable** under the Risk tile — the ML-surfacing panel. Three blocks: CART decision tree verdict + 5 input feature values, composite formula score with 6-component breakdown (projection penalty, threshold deficit, skip-buffer penalty, recovery pressure, planned-skip penalty, trend adjustment), and ensemble decision (`worst-label-wins`) with explanatory copy ("both methods agree" or "the more cautious label was kept"). Runs for both guests and signed-in users.
- **Forecast row** collapsed from three cards into one line: predicted % + 95% CI + sample size + trajectory + slope. Below the four-snapshot floor it reads *"Save N more attendance snapshots to unlock the predicted % with confidence interval"*. **Guest mode** swaps the row for a sign-in nudge with a working `Sign in →` button.
- Full-size `SlotHeatmap` for the active slot.
- Two-column working area:
  * **Attendance Input** — smaller-typography labels (eyebrow style) and tighter inputs. `Classes conducted so far` and `Classes attended` numeric fields, `attended ≤ taken` validation, a clear button, the live recommendation, and an inline auto-snapshot note.
  * **Skip Calendar** — `CalendarPlanner` with the new visual makeover (no strikethrough, type-tinted event bars, ring today, smaller `h-9` cells) and the `PlannedSkipPill` (`N planned ▼`) with the saved-pulse indicator next to it.
- Auto-debounced sync of attendance and skip changes back to Firestore.

### Insights screen
Restructured around six sections, each answering a discrete student question:

1. **Overview** — eyebrow + headline ("Attendance risk, recovery pressure, and semester progress in one view"), Avg / Semester / Warning / Critical stats grid, Highest Risk callout with semester-progress bar, and a global trajectory readout (`Trending Upward / Stable / Trending Downward`).
2. **Checkpoint Projections** — table with one row per course, columns CAT-1 / CAT-2 / FAT, each cell showing the projected % plus an inline `StatusGlyph` verdict. Past checkpoints render `(passed)` in muted text.
3. **Skip Budget** — per-course bars showing used vs allowed skips, color-coded (green > 3 buffer, amber 1–3, red 0 or negative). One-line recovery cost or "recovery not possible" copy per course.
4. **Forecast** — per-course card grid: `current → forecast %` with 95% CI inline, trajectory direction (▲ / — / ▼), and the existing SVG sparkline of saved snapshots.
5. **Historical Pattern** — two clearly-labelled sub-blocks. **"Risk band per snapshot"** is one row per course of colored dots (one dot per snapshot, colored by which threshold band the reading fell into — green ≥75% / amber 70-74% / red below). **"Weekly attendance"** is the redesigned `AttendanceHeatmap` (forward-fill removed; empty weeks render as dashed-outline no-data cells).
6. **The Engine** — three explainer cards laying out the algorithmic stack in plain prose: CART decision tree, statistical forecaster (linear regression + EWMA + 95% CI), and slot-aware enumeration. Surfaces what the engine actually does without burying it in code.

The pre-iteration "most-skipped weekday" stat (computed from future planned skips, semantically meaningless), "total skips burned" single number (no context), and raw 0–100 risk score number are all dropped. The Safe / Warning / Critical label is kept everywhere it appeared.

### Semester Calendar screen
New top-level tab available to both signed-in users (via main nav) and guests (via the landing-page CTA `Browse the semester calendar →`).

- Eyebrow + title ("Holidays, exams, and class days at a glance").
- **Slot dropdown** grouped by year (2nd / 3rd / 4th); each option renders as `slot · credit category`. The first option is `No slot — events only` for a structural-only view that surfaces every academic event without slot context.
- **Inline checkpoint summary** in the header — CAT-1 / CAT-2 / FAT dates, past ones marked `(passed)`.
- **Full-size `SlotHeatmap` in structural mode** — past class days render as outline (no fabricated green), holidays in purple, exams in blue, today as ring overlay. When a real slot is picked, that slot's class days render as filled outline cells; "No slot" mode shows event blocks only.
- **Upcoming events panel** (right side) — chronologically sorted next 6 academic-calendar events; ongoing events get an "ongoing" pill.
- **"Plan skip" button** *(guests only)* next to the slot dropdown — navigates straight to the Planner with the chosen slot pre-selected. Disabled when "No slot" is selected. Removed from the signed-in view since signed-in users access skip planning per-course from the dashboard.

### Notifications screen
* **Single master toggle "Weekly attendance alerts"** (iOS-style switch) — replaces the previous separate Risk Alerts and Weekly Summary checkboxes. Writes both legacy flags (`alertEnabled` and `weeklySummaryEnabled`) for back-compat so the cron logic doesn't change.
* **Inline channel + last-delivery readout** — Active channels (`email`, `email + telegram`, or `none`) and the timestamp of the last cron/manual send shown directly under the master toggle so the student can confirm the pipeline is live without hunting.
* **"Send a test alert now" button** — same `/api/send-alert-email` endpoint, prominent placement so reviewers / users can fire a real email + Telegram in front of them. 60-second server-side throttle preserved.
* **Threshold card** — separate panel with the 75-100 numeric input (defaults to 78). Copy explains what it does instead of leaving it as a bare number.
* **Telegram card** — own panel with clearer setup copy (bot token + chat ID, save on blur). Detection of "both filled → channel goes live" is automatic.

### Admin console
- Visible only to admins (custom claim or `VITE_ADMIN_EMAIL` match).
- Stat strip — event count, slot-combination count, minimum attendance, mode.
- **Semester settings** form (name, minimum attendance %, last instructional day) wired to `/api/admin/semester` for validation.
- **Calendar event drafter** — create/edit holiday, academic, exam, or other events with `date` or `startDate / endDate`; validated by `/api/admin/events` before publish.
- **Slot mapping validator** — sends current `slotsByYear` to `/api/admin/slots` for shape validation.
- **Projection cutoffs** display — surfaces the current `VITE_CAT1/2/FAT_START_DATE` env values so admins can confirm exam-window inputs.

---

## 5. Calendar / Heatmap Components

### SlotHeatmap (per slot)
- Compact and full sizes; cell sizes 11 px / 14 px.
- Weekday rows (Mon–Sat) × week columns spanning the full semester.
- **Seven distinct cell states** with intentionally separated hues so the legend reads cleanly at 14 px:
  - `past` — filled accent (green) · past class day, attended-by-default if not in `missedDates`
  - `missed` — solid red · past class day confirmed missed via the precise-skip picker (`missedDates[]`)
  - `cancelled` — slate-grey (`var(--text-muted)`) · class day on the slot calendar that didn't actually happen (`cancelledDates[]`); excluded from `totalClassDays`/`pastClassDays`/`futureClassDays` counts so attendance math stays honest
  - `planned-skip` — amber · future date the student toggled into the skip set (`skippedDates[]`)
  - `holiday` — **purple** (`var(--purple)`) · institutional closure; semantically distinct from `missed` (was previously the same red hue, which created an ambiguous warm cluster at small cell sizes)
  - `exam` — blue · CAT-1 / CAT-2 / FAT exam blocks
  - `future` / `off-class` — outline only · upcoming class day or non-class weekday
- **Probability-blended ambiguity rendering** — past class days that are *not* in `missedDates` and *not* `planned-skip` may still be implicitly missed (the totals say so) without us knowing which dates. For each such ambiguous cell, the renderer overlays a red wash at opacity = `unknownMissed / ambiguousPastCells` (clamped 0–1). 0 → fully accent (attended). 1 → fully red (all missed). 0.4 → visibly faded red. The hover tooltip on these cells appends `· ~40% chance missed`. Mathematically honest: the redness reflects exactly the engine's per-cell uncertainty given the totals.
- **Structural mode** — when no `course` prop is provided (e.g. the Semester Calendar tab), past class days render as outlined `future` cells instead of fabricated green; ambiguity calc is skipped. Used by the Semester Calendar screen.
- **Empty-slot support** — accepts empty `slotDays`. Used by the "No slot — events only" option in the Semester Calendar.
- **Events visible regardless of slot** — holidays / exams / `other`-type events render in their type colour even on weekdays the slot doesn't meet. Was previously rendered as `off-class` (transparent + faint border) on off-slot weekdays — inconsistent. Fixed.
- "Today" rendered as a ring overlay so it can coexist with any underlying status.
- Header summary: total class days · done · upcoming (or `N class days · M blocked by holiday/exam` in structural mode).
- Optional legend (now includes `Missed (logged)` and `Cancelled` swatches); month labels along the top axis.
* **Instant in-app hover** — moving the cursor over a cell swaps the cell's date + status into the stats line at the top of the card immediately (no native `title=""` 500 ms delay). The line is `aria-live="polite"` for screen readers.
* **Layered annotations on hover** — non-blocking academic markers (e.g. Lab FAT week) append their name to the regular cell tooltip ("Past class · Lab FAT week") instead of replacing the cell colour — class days continue to count toward attendance.
* **Padded matrix edges** — ~4 weeks of empty padding on each side of the semester so the heatmap doesn't run flush against the card boundaries.
* **Visible month boundaries** — small extra gap (6-8 px) inserted before every column that starts a new calendar month, with bolder month labels above. Boundaries are obvious without separator lines.
* **Past planned skips no longer counted as "upcoming"** — the past/future tally keys purely off the date and the planned-skip overlay only changes the cell colour, not the bucket.
* **Today re-keyed by `toDateString()`** — memo invalidates whenever the day changes so a long-lived tab doesn't drift.

### AttendanceHeatmap (per-course weekly matrix on Insights)
- Per-course timeseries view: rows = courses, columns = ISO weeks of the semester.
- Each cell colour-coded by attendance % at the end of that week, derived from the saved `attendanceSnapshots` for that course (latest reading inside each week wins).
- **No forward-fill.** Weeks without a saved snapshot render as a **dashed-outline no-data cell** (was previously forward-filled from the prior reading, which fabricated colour for unlogged weeks). The gaps now visibly tell the student where they didn't log — and that's the honest signal.
- Buckets: ≥80% green, 70-79% amber, 60-69% orange, <60% red, dashed outline = no reading recorded that week.
- Each row ends with the final % and a colour dot in the row's bucket.
- Hover any cell to see the exact week index + percentage in the legend area below the grid.
- Legend explicitly labelled `No reading (week not logged)` so the dashed outline is unambiguous.

### CalendarPlanner (skip planner)
Visual makeover this iteration to read as a clean, minimal calendar rather than a noisy spreadsheet.

- Month navigator with previous/next buttons; smaller chevrons; tighter weekday header (`text-[10px]` uppercase tracking).
- **Strikethrough on blocked dates removed** — replaced with a 50% opacity fade. Date numbers stay readable; the "not selectable" signal is now visual weight, not a heavy diagonal line.
- **Type-tinted event accent bars** instead of the old generic grey dot. Each event renders as a 2 px coloured underline at the bottom of the cell — purple for holidays, blue for exam/`other`, accent for academic markers. Hue palette matches `SlotHeatmap` so the two views read consistently.
- **Today** is now a clean accent-ring outline rather than a heavy bg-tint cell — coexists with whatever fill the cell already has (planned-skip, blocked, etc.).
- **Planned-skip cells** got bolder — solid red bg + white text + `font-semibold` — the highest visual weight on the calendar (which is what they should be, since they're the actionable items).
- Cell size reduced (`h-9` from `h-11`), `text-xs` from `text-sm`, gap tightened. Calendar takes less vertical real-estate while staying tappable.
- `border-y` wrapper dropped — calendar feels lighter, breathes more.
- Disabled state correctly applied (`disabled` attr + cursor) when a date isn't actionable.
- `Clear Selections` link compacted to `Clear all`.

---

## 6. Authentication & Authorization

### Authentication modes
- Email + password sign-up and sign-in via Firebase Auth (handled in `AuthModal`).
- Login/Sign-up toggle within the same modal; password visibility toggles for both fields; password ≥ 6 chars; passwords-match check on signup.
- Friendly mapping of Firebase error codes → human messages (≈ 18 codes covered, e.g. `auth/invalid-credential`, `auth/email-already-in-use`, `auth/network-request-failed`, `auth/unauthorized-domain`).

### Admin self-bootstrap
- The first sign-in attempt with `VITE_ADMIN_EMAIL` falls through to `/api/admin/bootstrap`.
- The endpoint compares the supplied email + password against `VITE_ADMIN_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` using `crypto.timingSafeEqual`.
- On match: creates the Firebase Auth user (if missing), sets the `admin` custom claim, and the client immediately retries `signInWithEmailAndPassword`.
- Bootstrap requires `ADMIN_BOOTSTRAP_PASSWORD` to be ≥ 6 chars; otherwise the endpoint returns `503`.

### Authorization model
- Custom claim `admin: true` is the source of truth for admin gating on the server; the email match is only a UX hint.
- Client `isAdmin` checks the claim first, then falls back to the env email match.
- Server endpoints under `/api/admin/*` use `requireAdmin`, which verifies the bearer Firebase ID token and re-checks the claim/email.
- Cron endpoint `/api/attendance-review` is gated by `CRON_SECRET` via `requireCronSecret`.
- All admin / send-alert / cron endpoints enforce HTTP method allow-lists and a 64 KB request body cap.

### Firestore security rules (`firestore.rules`)
- `users/{uid}` — read/write only by the owning user or any admin.
- `safeCreate` blocks initial writes from including `role` or `lastEmailSentAt`, and forces `email` to match `request.auth.token.email`.
- `safeUpdate` blocks clients from ever modifying `role`, `email`, or `lastEmailSentAt` (server-only fields).
- `app/{document=**}` — readable by any signed-in user, writable by admins only.
- Catch-all denies any other path.

---

## 7. Notifications System

### Channels
- **Email** — Nodemailer over SMTP. From-address resolves to `ATTENDANCE_REVIEW_FROM`, falling back to `SMTP_USER`. Required env: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (plus optional `SMTP_PORT`, `SMTP_SECURE`). The system silently skips email when SMTP env is missing instead of failing.
- **Telegram** — `sendMessage` to `api.telegram.org/bot{token}/sendMessage` with Markdown parse mode. Configured per-user via bot token + chat ID stored in `users/{uid}.notificationChannels.telegram`.

### Manual sends — `POST /api/send-alert-email`
- Requires a Firebase ID token in the `Authorization` header.
- Server-side throttle: 60 seconds between sends per user, derived from `lastEmailSentAt`.
- Sends to email and Telegram if both are configured; reports per-channel results.
* - Subject is request-supplied (clipped to 120 chars) or computed by the new `buildAttendanceSubject` helper — same logic the weekly cron uses, so the manual "Send a test alert now" button produces identical headlines to the scheduled run.
- On any successful delivery, server bumps `lastEmailSentAt`.

### Weekly cron — `GET /api/attendance-review`
- Scheduled by Vercel cron at `30 15 * * 6` UTC (Saturday 15:30 UTC).
- Iterates every user document in batches of 6 with `Promise.allSettled`.
- Per user: skips if no email, no courses, or both `weeklySummaryEnabled` and `alertEnabled` are off.
- Computes the `buildDashboardSummary` server-side; flags "needs attention" when any course is Critical, or current/projected/forecast-low drops below the user's `alertThreshold` (default 78).
- Sends only when summary is enabled OR (alerts are enabled AND attention is needed).
* - **Subject line names the worst offender by slot** — e.g. `B1+TB1 is below 75% — attendance check`, `2 courses below 75% — attendance check`, or `All courses on track — lowest is C2+TC2 at 87.8%`. Replaces the previous generic "Attendance alert: N course(s) need attention" copy. Single source: `buildAttendanceSubject` in `api/lib/email.js`.
* - Plain-text body via `buildAttendanceEmailText` and Telegram body via `buildAttendanceMarkdown` both use the same partition: below-threshold courses (sorted lowest first, with the lowest tagged) → borderline courses (within 2% of the 75% line, "no buffer" callout) → summary footer with average + safe/warning/critical counts + dashboard link.
- Returns a counts payload (`delivered`, `skippedHealthy`, `skippedDisabled`, `errored`, plus SMTP status).

### Email / Telegram bodies
- Both bodies sanitize each course name and recommendation to remove CR/LF (defense against header injection).
* - Structure (shared by both channels via the `partitionCourses` helper):
*   - **Below 75%** — sorted lowest first, the absolute lowest gets a `(lowest)` tag.
*   - **Borderline** — courses where `75% ≤ current < 77%` (within 2% of threshold, no skip buffer left). Surfaced as its own section so the student notices the zero-buffer state before it tips.
*   - **Footer** — average across all courses, safe/warning/critical counts, link back to the dashboard.
* - When everything is safe, the body opens with `All N courses on track. Lowest: <name> at X%.` instead of leading with an empty alert section.
* - Telegram body mirrors the same partition with `*bold*` markdown and uses `⚠`/`✅` glyphs for quick scanning on mobile.

---

## 8. Persistence & State Sync

### Firestore document shape (`users/{uid}`)
- Profile: `name`, `email` (server-set on create), `role` (server-set: `student` / `admin`).
- Selection state: `selectedYear`, `selectedCredit`, `selectedSlot`, `slotDays[]`.
- `courses[]` — full normalized course objects (`id`, `courseName`, `slotLabel`, `slotDays`, `credit`, `classesTaken`, `classesAttended`, `skippedDates[]`, **`missedDates[]`**, **`cancelledDates[]`**, `lastUpdated`). The two new arrays were added this iteration:
  - `missedDates[]` — confirmed past misses with exact ISO dates, written by the precise-skip chip picker. Distinct from `skippedDates[]` (forward planning intent). Used by `SlotHeatmap` to render crisp red `missed` cells and to compute `confirmedMissedInPast` for the ambiguity calculation.
  - `cancelledDates[]` — class days that were on the slot calendar but didn't happen (faculty cancelled, university closure). Excluded from `totalClassDays` / `pastClassDays` / `futureClassDays` in the heatmap so attendance math stays honest. Rendered as slate-grey `cancelled` cells.
- `attendanceSnapshots[]` — capped at the **last 120** snapshots (`{ id, courseId, attendancePercentage, classesTaken, classesAttended, riskScore, riskLabel, createdAt }`).
- Notification prefs: `alertEnabled`, `alertThreshold`, `weeklySummaryEnabled`, `notificationChannels.telegram`, `lastEmailSentAt` (server-owned), `lastCheckedAt`.
- `adminDraft` — staged semester/event/slot config (`semesterName`, `minAttendance`, `lastInstructionalDay`, `eventCount`, `slotVersion`).
- `theme` — `dark` | `light`.

### `useUserSync` hook
- Loads the user document on auth-state change; creates a default scaffold if missing.
- All mutations (saveSlot, updateAttendance, **updateBulkAttendance**, updateSkips, updateTheme, updatePreferences, deleteCourse, saveAttendanceSnapshot, updateAdminDraft) are local-first; a **1500 ms debounce** then `setDoc(..., { merge: true })`s to Firestore.
- **`updateBulkAttendance(entries)`** — new this iteration. Accepts an array of `{ courseId, classesTaken, classesAttended, missedDates?, cancelledDates? }` entries and, in a single transaction: writes the new totals onto each course, appends the precise missed / cancelled dates (deduped via `Set` union with the existing arrays), and emits one snapshot per course (using the same per-day dedup as `saveAttendanceSnapshot`). Powers the Update Attendance strip's bulk save path. Trims the snapshot list to the most recent 120 in the same write.
- `serializeUserData` strips server-only fields (`role`, `email`, `lastEmailSentAt`) before every write so the Firestore rules never reject the merge. Pass-through for `missedDates` and `cancelledDates` was added this iteration.
- Snapshots are **deduplicated per (course × calendar day)** — saving twice on the same day overwrites the earlier entry.

### Snapshot mechanics
* - **Auto-snapshot on attendance change** — whenever the student updates `classesTaken` or `classesAttended` in the planner, the same effect that syncs the new totals to Firestore also writes a snapshot `{ attendancePercentage, classesTaken, classesAttended, riskScore, riskLabel, createdAt }` for the active course. The bulk update path (Update Attendance strip → `updateBulkAttendance`) emits one snapshot per touched course in the same transaction.
- Snapshots feed both the trend regression on the planner and the EWMA forecast in Insights.
- Every save trims the snapshot list to the most recent 120 to keep documents small.
- Same-day snapshots for the same course are deduplicated by `(courseId, calendar day)`, so rapid edits in a single sitting don't pollute the timeseries.

### Guest mode
- Without auth, all state lives in React only — slot selection, attendance values, and skip toggles work end-to-end, just nothing persists.
- Theme preference is still saved to localStorage for guests.

---

## 9. Theming

- Two themes — `dark` (default) and `light` — toggled from the header `ThemeToggle` (animated spring switch).
- `ThemeProvider` uses the next-themes pattern: temporarily injects a stylesheet that disables every CSS *transition*, forces a synchronous reflow, swaps `data-theme` and `colorScheme`, then removes the suppressor on a double `requestAnimationFrame` so the paint commits before transitions resume — eliminates the cascade-flicker on themed surfaces.
- Theme is persisted to localStorage immediately and synced to Firestore (with one-shot hydration guard) for signed-in users so preferences travel between devices.
- All colors flow through CSS custom properties (`--accent`, `--green`, `--red`, `--amber`, `--bg-base`, `--border-default`, etc.), letting the JSX use semantic Tailwind utility classes (`text-accent`, `bg-surface`, `border-border-faint`).

---

## 10. UI / UX details

- React 19 + Vite 7 SPA with Tailwind 3 design tokens.
- `framer-motion` for screen transitions, modal entrances, the theme switch, the progress bar, and the gauge sweep.
- `lucide-react` icon set throughout.
- Mobile-first: dashboard, planner, insights, notifications, admin all collapse cleanly; on small screens the side navigation becomes a fixed bottom nav bar (with iOS safe-area inset).
- Consistent visual primitives — `eyebrow-label`, `primary-button`, `ghost-button`, `field-input`, `app-card`, `subtle-notice`.
- Live clock in the header (date + time, weekday).
- Reusable `AttendanceGauge` (animated radial gauge, 75% green / 65% amber / <65% red).
- Reusable `InfoCard` and `FeedbackBanner` (Google Form link, dismissible).
- Sticky app footer disclaimer reminding users that freshers have a different calendar and to verify with official VIT-AP communication.
- Auth modal, add-course modal, and screen transitions are all keyboard-/screen-reader-aware (`aria-label`s on icon-only buttons, focus restoration on close).

---

## 11. Semester Data (`public/semester-data.json`)

Loaded once on app start by `useSemesterData` and shared via props.
- `lastInstructionalDay` — anchor for projections, heatmap, and class-day enumeration.
- `academicCalendar` — Winter 2025-26 events (commencement, winter vacation, public holidays, CAT-1, CAT-2, Lab FAT week, Theory FAT window, Engineering Expo, summer vacation), each with `type` and either `date` or `startDate / endDate`.
* - **Lab FAT (Apr 24-30) is typed `academic`, not `other`** — theory courses still meet that week and the cells render as normal class days. The event name shows on hover (via the new annotation map) so the student gets context without those days being treated as exam blocks. Theory FAT (May 4-23) stays as a real `exam` block.
- `slotsByYear` — for each of `2nd_year`, `3rd_year`, `4th_year`:
  - `slotDays` — base slot → array of weekday numbers (0 = Sun … 6 = Sat).
  - `slots` — credit category → list of compound slot strings.
- The same JSON is loaded server-side by `loadSemesterData` for the cron and manual-send endpoints, keeping client and server projections aligned.

---

## 12. Backend APIs (Vercel serverless)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/attendance-review` | GET | Weekly cron — scan users, deliver email + Telegram summaries/alerts. | `CRON_SECRET` bearer |
| `/api/send-alert-email` | POST | Manual review trigger from Notifications screen. | Firebase ID token |
| `/api/admin/bootstrap` | POST | Self-bootstrap the admin user and set the `admin` custom claim. | `VITE_ADMIN_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` |
| `/api/admin/semester` | GET / POST | Validate + normalize a semester payload before publish. | Admin |
| `/api/admin/events` | GET / POST | Validate + normalize a single event or array of events. | Admin |
| `/api/admin/slots` | GET / POST | Validate + normalize a slot mapping (`year`, `credit`, `slots`, `slotDays`). | Admin |

Shared helpers in `api/lib/`:
- `firebaseAdmin.js` — singleton `firebase-admin` instance keyed by `FIREBASE_SERVICE_ACCOUNT`.
- `http.js` — `readJsonBody` (with 64 KB cap), `requireMethod`, `verifyFirebaseToken`, `requireAdmin`, `requireCronSecret`, and `safeStringEqual` (constant-time compare).
- `email.js` — Nodemailer transport factory + email/Markdown body builders + missing-env detector.
- `telegram.js` — Telegram `sendMessage` wrapper with disabled web-page preview.
- `semesterSource.js` — server-side loader of the same `semester-data.json`.

---

## 13. Environment & Configuration

Configuration is layered:
- **Client (`VITE_*`):** `VITE_FIREBASE_*` (Web SDK config), `VITE_ADMIN_EMAIL`, `VITE_CAT1_START_DATE`, `VITE_CAT2_START_DATE`, `VITE_FAT_START_DATE`, optional `VITE_DEV_ALLOWED_HOSTS` (Vite host allow-list for ngrok/Tailscale).
- **Server:** `FIREBASE_SERVICE_ACCOUNT` (JSON for `firebase-admin`), `CRON_SECRET`, `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_PORT` / `SMTP_SECURE` / `ATTENDANCE_REVIEW_FROM` / `ATTENDANCE_REVIEW_SUBJECT`, `ADMIN_BOOTSTRAP_PASSWORD`.
- The cron endpoint short-circuits to a 200 with `skipped: true` when `FIREBASE_SERVICE_ACCOUNT` is missing, so Vercel preview deployments don't fail loudly.

---

## 14. Tooling & Scripts

- `npm run dev` — Vite dev server (default port 5174).
- `npm run build` — production build.
- `npm run lint` — ESLint (flat config, React-hooks + react-refresh).
- `npm run test` — Node `--test` suites in `tests/` covering analytics math and endpoint contracts.
- `npm run attendance:review` — local SMTP scaffold (`scripts/sendAttendanceReview.js`) that mails a placeholder review.
- `scripts/smokeTest.sh` — hits every API route and asserts the expected status codes; honors `BASE_URL`, `ID_TOKEN`, `CRON_SECRET` env vars for use against deployed environments.
- `scripts/seedDemoAccount.js` — seeds the **consistent-student** demo account (`abhishek.22bce7566@vitapstudent.ac.in` / `123456`) with 6 theory courses and a clean snapshot trajectory. Use for showing the "ideal" engine output, tight forecast CIs, clear risk verdicts.
- `scripts/seedInconsistentAccount.js` — seeds the **inconsistent-student** demo account (`reallu654321@gmail.com` / `123456`; script also tries the typo'd `gmai.com` variant) with 6 theory courses across six different updating personas: `consistent` (~weekly snapshots), `abandoned` (4 snapshots all in Dec–Feb then nothing), `bursty` (12 snapshots clustered with same-week double-saves and long gaps), `sparse` (only 3 snapshots all semester), `declining` (7 snapshots showing the slide), `reliable` (10 snapshots in regular weekly cadence). Real `cancelledDates`, mix of logged misses and ambiguous gaps. 45 total snapshots distributed irregularly. Use for showing how the engine behaves under realistic messy data — the heatmap's probability-blended ambiguity rendering, sparse-data CI widening, and risk-drift dot timeline all earn their place against this dataset. Idempotent: re-running cleanly resets the document.
- Vercel cron registered in `vercel.json` (`30 15 * * 6` UTC).
- Firestore rules (`firestore.rules`) ship in-repo and deploy via `firebase deploy --only firestore:rules`.

---

## 15. Tech Stack Summary

- **Frontend** — React 19, Vite 7, Tailwind CSS 3, framer-motion, lucide-react.
- **State / persistence** — React contexts + custom hooks, Firebase Web SDK (Auth + Firestore), localStorage for theme.
- **Backend** — Vercel serverless functions, `firebase-admin`, `nodemailer`, native `fetch` to Telegram.
- **Analytics / ML** — `simple-statistics` (linear regression + line eval) for the forecast; `ml-cart` (Decision Tree, gini) for the risk classifier; hand-rolled EWMA + recovery probe.
- **Testing** — Node's built-in test runner with two suites (analytics and endpoint contracts).

---

## 16. Out of scope / explicit non-features

- **Freshers** are explicitly unsupported (different academic calendar) — flagged in the footer.
- The app does **not** scrape VTOP — students manually enter `Classes conducted` and `Classes attended`.
* - Per-day attendance **is** now optionally trackable through the precise-skip and cancelled-class chip pickers in the Update Attendance strip, but remains optional — students who don't want the friction can save totals only and the heatmap will fall back to probability-blended ambiguity rendering. Note: per-day attendance was previously never tracked; this iteration introduced it as an opt-in capture mechanism.
- No multi-semester history — the active semester is the only one.
- Independent student project; not affiliated with VIT-AP.

---

## 17. Changes in Last Iteration

This iteration closed data-honesty gaps in the visualisation layer, reorganised the Dashboard / Planner / Insights flow around clear student questions, **surfaced the ML and statistical engine as visible UI rather than backstage code**, and tightened the typographic and palette layer. Every existing feature is preserved — nothing was removed.

### 17.1 Data layer additions

* **`getClassDatesBetween(slotDays, calendar, fromDate, toDate)`** — new helper in `src/utils/attendanceAnalytics.js` that enumerates class days between two dates, excluding holidays/exams. Drives the auto-fill in the Update Attendance strip.
* **`missedDates: string[]`** — new course schema field for confirmed past misses entered via the precise-skip chip picker. Distinct from `skippedDates` (forward intent).
* **`cancelledDates: string[]`** — new course schema field for class days that were on the slot calendar but didn't happen (faculty cancelled, university closure). Excluded from `totalClassDays` in the heatmap so attendance math stays honest.
* **`updateBulkAttendance(entries)`** — new callback in `useUserSync.js` that writes new totals, appends `missedDates` + `cancelledDates`, and emits one snapshot per course (deduped per-day) in a single transaction.
* **`riskBreakdown`, `formulaLabel`, `classifierFeatures`** exposed on the analytics return so the new "Why this verdict?" UI can read engine internals without re-deriving them.

### 17.2 Update Attendance strip (new primary flow)

Always-visible expandable strip mounted **inside the Exam Horizon panel header** on the Dashboard. Replaces the per-course planner as the primary recurring action. Solves the "students don't update weekly" problem by:

- **Auto-filling `taken`** with `lastTaken + classDaysSinceLastUpdate` (slot-aware, blocks holidays/exams)
- **Auto-filling `attended`** with `lastAttended + classDaysSinceLastUpdate` (assume attended; student adjusts down)
- Showing the previous snapshot inline (`last 47/55`) and the `+N class days` chip so the student can spot typos
- Bulk-saving all courses in 30 seconds with a single click

#### Optional precise-skip and cancelled-class pickers

When the student decreases `attended` (i.e. they missed some classes), an inline date-chip picker appears showing the candidate class days. Tap to mark each missed class. Same UX appears when the student decreases `taken` below the slot-calendar's expected count (cancelled classes). Both pickers are **optional** — a `skip this →` link saves totals only and the heatmap gracefully degrades to ambiguity rendering.

### 17.3 Heatmap honesty

* **SlotHeatmap (per-course)** — now reads `missedDates` (red cells, "Missed (logged)"), `cancelledDates` (slate-grey, "Cancelled" — excluded from total/past/future counts), and renders **probability-blended ambiguity** for past class days where we know the count of misses but not which dates: each ambiguous cell tints between accent-green (attended) and red (missed) at opacity = `unknownMissed / ambiguousPastCells`. Mathematically honest: the redness reflects exactly the engine's uncertainty.
* **SlotHeatmap structural mode** — when no course is passed (Semester Calendar tab), past class days render as outlined `future` cells instead of fabricated green. No ambiguity calc.
* **SlotHeatmap empty-slot support** — accepts empty `slotDays` for the "No slot — events only" view.
* **Holidays/exams light up regardless of slot** — events affect the semester whether or not your slot meets that day. The "off-class" branch for blocking events is gone.
* **AttendanceHeatmap (Insights weekly)** — forward-fill removed. Empty weeks render as dashed-outline no-data cells. Honest about the gaps in student logging behaviour.

### 17.4 Dashboard reorganisation

* **Command Dashboard headline + stats grid + Highest Risk callout + semester progress bar** moved from Dashboard → Insights tab as Section 1.
* **Add Course button** moved into the Exam Horizon panel header (inline with `5 of 6 on track for FAT`).
* **Tracked Courses grid section deleted** — Exam Horizon rows now have an inline hover-revealed delete icon, eliminating the redundant second course list.

### 17.5 Planner restructure

* **4 hero tiles** instead of 6: Current · Projected · Risk · Skips Left Till {next-checkpoint}.
* **Projected tile is a multi-row mini-table** showing CAT-1 / CAT-2 / FAT projections inline — past checkpoints render `(passed)`, future ones get success/warning glyphs. No more user-toggled horizon switcher.
* **Skips Left tile auto-targets the next upcoming checkpoint** (auto-resolves CAT-1 → CAT-2 → FAT) so the number is always tied to the most pressing exam.
* **Inline recovery line** appears beneath the hero tiles only when `recoveryClassesNeeded > 0`.
* **Forecast row collapsed** from 3 cards into 1 line (predicted % + 95% CI + trajectory direction + slope).
* **Guest-mode forecast** swaps for a sign-in nudge with a working `Sign in →` button.
* **Smaller fonts** in Attendance Input section (text-xs labels, tighter input padding).
* **Tighter Skip Calendar** cells (h-9, smaller weekday header, reduced gap).
* Dropped: Final Projection tile (redundant), Remaining Classes tile (irrelevant when 0), Recovery Needed tile (folded into inline line), raw "22/100 score" line (folded into Why panel).

### 17.6 Insights tab restructure

Six sections, top-to-bottom, each answering a discrete student question:

1. **Overview** — eyebrow + headline + Avg/Semester/Warning/Critical stats grid + Highest Risk callout with semester progress bar + global trajectory ("Trending Upward / Stable / Trending Downward").
2. **Checkpoint Projections** *(new)* — table of projected attendance per course at CAT-1 / CAT-2 / FAT. Past checkpoints render `(passed)` in muted text. On-track cells show `87.0% ✓`, at-risk cells show `67.5% ⚠`.
3. **Skip Budget** *(new)* — per-course bar visualising used vs allowed skips, color-coded (green > 3 buffer, amber 1–3, red 0 or over-budget). Per-course one-line recovery cost or honest "recovery not possible in remaining schedule" copy.
4. **Forecast** — per-course `current → forecast %` with 95% CI inline, sparkline of saved snapshots, trajectory badge.
5. **Historical Pattern** — two clearly-labelled sub-blocks: **"Risk band per snapshot"** (one row per course, dots colored by where each snapshot fell against the 75% threshold) and **"Weekly attendance"** (the redesigned `AttendanceHeatmap`).
6. **The Engine** *(new — thesis justification)* — three explainer cards: CART decision tree, statistical forecaster (linear regression + EWMA + 95% CI), slot enumeration. Reads as "under the hood — what's driving these numbers."

Dropped: most-skipped-weekday (was computed from future planned skips — meaningless), total-skips-burned single number (no context), raw risk-score number (kept the Safe/Warning/Critical label).

### 17.7 Semester Calendar tab (new top-level screen)

New `Calendar` tab in the main nav, available to everyone (signed-in via nav, guests via a `Browse the semester calendar →` link on the landing page).

- Eyebrow + "Holidays, exams, and class days at a glance."
- **Slot dropdown** grouped by year (2nd / 3rd / 4th), each option showing slot label + credit category.
- **"No slot — events only"** option at the top of the dropdown — heatmap renders structural-only with all academic events visible.
- **Full-size `SlotHeatmap` in structural mode** — past class days as outline (no fabricated green), holidays/exams in their colour, today as ring overlay.
- **Upcoming events panel** on the right — chronologically sorted academic-calendar events with type-tinted captions, marks ongoing events with an "ongoing" pill.
- **Checkpoint summary inline** — CAT-1 / CAT-2 / FAT dates shown in the header, past ones marked `(passed)`.
- **"Plan skip" button** *(guest-only)* next to the slot dropdown — navigates directly to the Planner with the chosen slot pre-selected. Disabled when "No slot" is selected. Removed from signed-in view to reduce redundancy (signed-in users access skip planning per-course from the dashboard).

### 17.8 The ML engine — how it is now shown to the user

The CART decision tree, EWMA, linear regression, and worst-label-wins ensemble were always running but were previously invisible in the UI. This iteration surfaces every one of them in three distinct user-facing locations:

#### a) "Why this verdict?" expandable on the Planner

Beneath the Risk tile in the per-course Planner, a `▼ Why this verdict?` toggle expands an inline panel with three explanatory blocks:

- **CART decision tree** — verdict label (`Safe` / `Warning` / `Critical`) plus the five input features the tree was trained on, rendered as a feature → value list:
  - Current %
  - Projected %
  - Skip buffer
  - Recovery needed
  - Trend bucket
  Each feature shows the actual value the engine fed to the tree for this specific course. Lets the student (and any demo evaluator) trace the classifier path on real data.
- **Composite formula score** — the formula label (Safe/Warning/Critical) + the score out of 100 + a per-component breakdown:
  - Projection penalty (`100 − projected%`)
  - Threshold deficit (`(75 − current) × 1.2` if below threshold)
  - Skip buffer penalty (`8 × max(0, −skips left)`)
  - Recovery pressure (`3 × classes needed to recover`)
  - Planned skip penalty (`1.5 × planned skip count`)
  - Trend adjustment (`+8 declining / −5 improving / 0 stable`)
  Each component is shown signed (positive adds risk, negative reduces). Sum equals the rendered risk score — fully auditable.
- **Ensemble (worst-label-wins)** — final ensemble decision shown explicitly with explanatory copy: *"both methods agree"* when CART and formula match, or *"methods disagreed; the more cautious label was kept"* when they differ. Demonstrates the defensive bias claim (rather warn a safe student than miss a debarment).

This panel runs for both guests and signed-in users — CART operates on current features and doesn't need snapshot history.

#### b) Statistical Forecaster inline on the Planner

Single-line forecast row beneath the hero tiles:

`STATISTICAL FORECAST   87.3%   (95% CI 82.1–92.5%)   ·   19 snapshots   ·   ▼ trending declining (−0.064 %/day)`

Shows the regression-extrapolated end-of-semester %, the 95% confidence interval derived from residual standard deviation, snapshot sample size, and the trajectory direction with daily slope. **Guest mode replaces this with a sign-in nudge** since the regression needs a saved snapshot history.

When sample size is below the four-snapshot floor, the row reads *"Save N more attendance snapshots to unlock the predicted % with confidence interval"* — honest about the floor instead of hiding the row.

#### c) "The Engine" subsection on Insights (Section 6)

Three cards laying out the algorithmic stack in plain prose:

- **Risk classification** — *"CART decision tree (gini, depth 4) over five features… runs alongside a weighted formula score and a defensive worst-label-wins ensemble."*
- **Forecast** — *"Linear regression over (days, attendance %) snapshot points, extrapolated to the last instructional day. EWMA (α = 0.4) smooths the current reading. 95% confidence band derived from residual standard deviation (z = 1.96)."*
- **Slot enumeration** — *"Every projection counts only real class days for your slot — honouring holidays, exam blocks, and your planned skips. Recovery probe iterates up to 300 hypothetical attended classes before flagging a course as impossible to recover."*

Reads as "under the hood — what's driving these numbers." Lets the student (and the demo audience) see the math is doing real work, not just decoration.

#### d) Forecast detail per course in Insights (Section 4)

Same statistical forecaster output as the planner, but for every tracked course in one place. Lets the student compare confidence intervals across courses — wide CIs for sparsely-snapshotted courses, narrow for well-tracked ones, which itself proves the regression depends on sample size honestly.

#### e) Verdict consistency

The risk verdict shown on the dashboard, planner, exam horizon rows, and insights is always the **ensemble** label (worst of CART + formula). The "Why this verdict?" panel is the only place where the individual CART vs formula labels diverge in display — and only when they actually disagree. Everywhere else the user sees a single coherent label.

### 17.9 Visual layer refinements

* **Skip Calendar makeover** (`CalendarPlanner.jsx`):
  - Strikethrough on blocked dates removed → 50% opacity fade (cleaner)
  - Generic grey event dots replaced with type-tinted bottom underline bars (purple = holiday, blue = exam, accent = academic) — glanceable distinction between event types
  - Today is now a clean accent ring instead of a heavy bg-tint cell
  - Planned-skip cells got bolder (red bg + white text + font-semibold)
  - Border-y wrapper dropped, smaller cells (`h-9`), tighter weekday header
* **Holiday hue separated from missed**: added `--purple` and `--purple-dim` CSS vars (both themes); SlotHeatmap holiday cells now render in purple, distinct from the red missed cells. Resolves the missed/holiday/planned-skip warm-cluster ambiguity at small cell sizes.
* **`SavedCheck.jsx`** — new shared SVG component for the "Saved" confirmation glyph. Hand-tuned thin stroke (1.75px on 12×12 viewBox) replaces the bolder lucide `Check` (which read as "AI-generated"). Used in PlannerView's `SavedPulse` and the Update Attendance strip's saved-state indicator.
* **`StatusGlyph.jsx`** — new shared SVG component with three variants (`success` / `warning` / `danger`). Replaces the chunky native emoji rendering of `✅` / `⚠` / `❌` everywhere they appeared (Planner risk tile, Planner Projected mini-table, ExamHorizonPanel row verdicts, Insights Checkpoint Projections cells). Inherits `currentColor` so the parent's Tailwind colour class drives the tone. Zero native emoji glyphs remain in status indicators across the app.

### 17.10 Demo seed for the inconsistent-updater persona

* **`scripts/seedInconsistentAccount.js`** — new seed script. Targets `reallu654321@gmail.com` (or its typo'd variant `reallu654321@gmai.com` — script tries both). Resets password to `123456`. Builds 6 theory courses for a 4th-year student with deliberately messy data:
  - **CSE1005 - Software Engineering** (C2+TC2): 33/41, "consistent updater" — 9 snapshots, 5 logged misses, 1 cancelled
  - **CSE2008 - Operating Systems** (D2+TD2): 28/42, **"abandoned mid-semester"** — only 4 snapshots all in Dec–Feb, 4 logged misses, 2 cancelled, 10 ambiguous late-semester misses
  - **CSE2025 - AWS Solution Architecture** (F2+TF2): 32/40, "bursty" — 12 snapshots clustered with 2x-same-week and long gaps, 1 logged miss, 7 ambiguous
  - **CSE3002 - Artificial Intelligence** (E2+TE2): 30/40, "sparse" — only 3 snapshots all semester, 0 logged misses (full ambiguity → heatmap renders ~25% probability-blended red across all past cells)
  - **CSE3008 - Introduction to ML** (G2+TG2): 27/41, "slow decline" — 7 snapshots showing the slide, 4 logged + 10 ambiguous
  - **STS3007 - Advanced Competitive Coding** (B2+TB2): 36/40, "star tracker" — 10 snapshots in regular weekly cadence, all 4 misses logged precisely
* Total 45 snapshots distributed irregularly. Tells the engine's robustness story: the dashboard, heatmap, forecast, skip budget all behave honestly across a realistic mix of careful and lazy logging.
* Idempotent: re-running cleanly resets the document.

### 17.11 Landing page enhancements

* **`Browse the semester calendar →`** tertiary CTA below the primary buttons (guest discoverability of the new Calendar tab).
* **Credibility line** below the CTAs: *"Track attendance through CAT-1, CAT-2, and FAT — never dip below 75% with precise per-checkpoint analysis. Built for 2nd, 3rd, and 4th year students (freshers have a different academic calendar)."* Folds the freshers disclaimer in without needing a separate footer on landing.
* **"What's inside" three-feature row below the hero**:
  - 📅 Slot-aware schedule — *"Real semester calendar with holidays and exam blocks excluded."*
  - 📈 Forecast at every checkpoint — *"Projected attendance at CAT-1, CAT-2, and FAT with 95% confidence interval."*
  - 🔔 Weekly alerts — *"Email and Telegram pings when any course slips below threshold."*
  Uses lucide icons (`CalendarDays`, `TrendingUp`, `Bell`) — no native emoji.
* **Live Risk Preview card redesign**:
  - Big `73.8%` display number leads (`text-5xl`)
  - Verdict line: `⚠ Warning · 4 classes from recovery` with `StatusGlyph`
  - **Three-checkpoint mini-table inline** showing CAT-1 78.5% (passed), CAT-2 73.5% ⚠, FAT 72.1% ⚠ — exact same shape as the real Planner's Projected tile
  - **Forecast row** with 95% CI and trajectory direction
  - Snapshot date label (`snapshot · Apr 12, 2026`) — fixes the temporal ambiguity (placement between CAT-2 ending Mar 30 and FAT starting May 4 means the projections make sense as "live engine output on April 12")
  - Action caption: *"Sign in or start as guest to plug in your real attendance and watch every checkpoint update live."*

### 17.12 Files added or substantially rewritten

| File | Status | Purpose |
|---|---|---|
| `src/Components/UpdateAttendanceStrip.jsx` | new | Bulk attendance update with auto-fill + optional date pickers |
| `src/Components/SemesterCalendarScreen.jsx` | new | Master semester calendar tab |
| `src/Components/SavedCheck.jsx` | new | Refined "Saved" SVG glyph |
| `src/Components/StatusGlyph.jsx` | new | Success/warning/danger SVG glyphs |
| `src/Components/PlannerView.jsx` | rewritten | 4-tile hero + Why-verdict panel + slim forecast |
| `src/Components/InsightsScreen.jsx` | rewritten | 6-section restructure with new components |
| `src/Components/CalendarPlanner.jsx` | rewritten | Skip Calendar visual makeover |
| `src/Components/SlotHeatmap.jsx` | extended | missedDates, cancelledDates, ambiguity, structural mode |
| `src/Components/AttendanceHeatmap.jsx` | extended | Forward-fill removed, dashed-outline no-data cells |
| `src/Components/ExamHorizonPanel.jsx` | extended | Add Course inline + delete inline + Update strip mounted |
| `src/Components/DashboardScreen.jsx` | trimmed | Removed Tracked Courses + headline (moved to Insights) |
| `src/Components/LandingScreen.jsx` | extended | Calendar CTA + credibility line + features row + redesigned Live Risk Preview |
| `src/utils/attendanceAnalytics.js` | extended | `getClassDatesBetween`, `riskBreakdown`, `formulaLabel`, `classifierFeatures` |
| `src/hooks/useUserSync.js` | extended | `missedDates`, `cancelledDates`, `updateBulkAttendance` |
| `src/styles/globals.css` | extended | `--purple` / `--purple-dim` for both themes |
| `src/App.jsx` | extended | `SCREEN.CALENDAR`, nav entry, `handlePlanSkipForSlot`, isGuest plumbing |
| `scripts/seedInconsistentAccount.js` | new | Inconsistent-updater demo seed |
