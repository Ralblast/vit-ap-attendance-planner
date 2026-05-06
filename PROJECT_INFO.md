# VIT-AP Attendance Planner — The Case For This Project

## 1. The Idea, In One Line

A web app that tells every VIT-AP student exactly how many classes they can still safely skip — and warns them, on email and Telegram, the moment they're about to fall below 75%.

---

## 2. The Pain Point Is Real (And Universal)

Every VIT-AP student lives under the same rule: **fall below 75% attendance in any course and you are barred from the final exam.** That rule is not theoretical — it ends semesters. And yet the tools students have to manage it are absurd:

- **VTOP shows a number, not a forecast.** It tells you "73.4% today" but never "you will land at 68% if you keep skipping Tuesdays."
- **Spreadsheets are everywhere on campus.** Students copy slot timings, count weekdays by hand, subtract holidays, guess at exam blocks, and re-do the math after every cold or family emergency. One typo and the whole plan is wrong.
- **The academic calendar is not machine-readable.** CAT-1, CAT-2, Lab FAT, Theory FAT, public holidays, vacation — all sit in a PDF. Students mentally subtract those from their class days every time they re-plan.
- **Slot logic is non-trivial.** A single course like `A1+TA1+TAA1` meets on three different weekdays with three different rules. Students routinely miscount because they treat compound slots as if they were one slot.
- **Recovery math is the worst part.** "I'm at 71% — how many classes in a row do I need to attend to get back to 75?" Almost no one computes this correctly. They guess, attend a few, and hope.
- **Warnings come too late.** By the time VTOP turns red, the student has already lost the buffer. There is no early-warning system — no nudge on Saturday morning saying "you will dip below 75 by Wednesday if you skip the Monday lab."

The result: every semester, students get debarred from exams not because they were lazy, but because **they did the arithmetic wrong, or did it too late.**

This app fixes that. End to end.

---

## 3. What The App Actually Does (Plain English)

1. **You pick your slot** — `A1+TA1+TAA1`, `C2+SC2+TC2`, whatever your timetable says. The app already knows which weekdays that slot meets, because the official academic calendar and slot map ship with the build.
2. **You enter two numbers** — classes conducted, classes attended. That's it. No VTOP scraping, no OAuth dance.
3. **The app instantly tells you six things** — your current %, your projected end-of-semester %, your risk level, how many classes are left, **how many you can still safely skip**, and **how many you'd need to attend in a row to recover** if you've already slipped.
4. **You plan future skips on a calendar.** Click a Tuesday three weeks from now. The projection updates live. Holidays and exam weeks are pre-blocked so you literally cannot mis-plan around them.
5. **You see a heatmap of every class day in the semester** — past, upcoming, planned skip, holiday, exam — color coded.
6. **Every Saturday, an email and Telegram message arrive** that say, by name, which course is closest to 75% and what to do about it. If everything is fine, the message says so honestly, with the lowest course called out.
7. **You can ask "where will I land by CAT-1? By CAT-2? By FAT?"** The same metrics re-run against three different cutoff dates with one click.

That's the loop. Open the app, see the truth, plan, get nudged.

---

## 4. Why It Solves The Pain Point (Point By Point)

| Pain | What students do today | What this app does |
|---|---|---|
| "Will I clear 75 by FAT?" | Mental math, often wrong | Live projection, recomputed on every keystroke |
| "How many classes can I skip?" | Guess | Exact integer: *Safe skips left* |
| "I'm already below — how do I recover?" | Panic | *Recovery classes needed*, or honest "Impossible" if it's too late |
| "When does my semester actually end?" | Check PDF | Anchored on `lastInstructionalDay` from the official calendar |
| "Does Lab FAT week count?" | Argue with friends | The calendar JSON encodes it correctly — theory courses still meet, lab courses don't |
| "I forgot to check VTOP this week" | Find out too late | Saturday cron mails you, names the worst course, links to the dashboard |
| "I'd want this on Telegram, not email" | No option | Bot token + chat ID, both channels fire |
| "I share a hostel WiFi, don't want to sign up" | Avoid tools | **Guest mode** — full planner, no account |

Every column on the right is something the app does *today*, not a roadmap item.

---

## 5. Why This Is Not Trivial To Build

It looks like a calculator. It is not. Look at what's actually happening behind those six tiles:

- **Slot-aware day enumeration.** Compound slots (`A1+TA1+TAA1`) become a *union* of weekdays, intersected with the date range from today to the last instructional day, minus every holiday/exam/blocked event. That is a real set operation against real calendar data, not a `daysBetween()` call.
- **Recovery math is iterative.** "How many in-a-row classes do I need to climb back to 75?" has no closed-form answer because each attended class shifts both the numerator and the denominator. The app probes up to 300 future classes and returns the minimum that lands ≥ threshold, or admits "Impossible" if none does.
- **Risk classification is hybrid.** A formula label (based on projection gap, threshold deficit, skip buffer, trend) is *cross-checked* against an `ml-cart` decision-tree classifier trained on hand-labeled examples. The app picks the worse of the two — defensive, not optimistic. ML is not a buzzword here; it's the second opinion.
- **Forecasting requires real statistics.** Once a student has 4+ snapshots, the app fits a linear regression on `(daysSince, attendance%)` with `simple-statistics`, extrapolates to FAT, and computes a 95% confidence band off the residual standard deviation. It also runs an EWMA (α = 0.4) for a smoothed "where you actually are right now" reading. This is not `Math.average`.
- **The heatmap is a real layout problem.** Mon-Sat rows × ~22 weeks of columns, with month gaps, edge padding, hover annotations, "today" rendered as a non-blocking ring overlay so it can sit on any underlying status, and a memo that re-keys at midnight so a long-lived browser tab doesn't keep showing yesterday's "upcoming" cells.
- **Cross-channel notifications need real plumbing.** Vercel cron at 15:30 UTC Saturday → iterate every user document in batches of 6 with `Promise.allSettled` → server-side `buildDashboardSummary` → partition courses into below-75 / borderline / safe → render Nodemailer email + Telegram Markdown → 60-second per-user throttle on `lastEmailSentAt` so retries can't spam → CR/LF stripping on every user-supplied string to defend against header injection.
- **Auth and authorization are not glued on.** Firebase custom claims gate `/api/admin/*`, a `CRON_SECRET` bearer gates the cron route, Firestore rules enforce that clients can never write `role`, `email`, or `lastEmailSentAt`. There's even a constant-time-compare admin bootstrap so the first admin can sign in without a manual console step.
- **Two storage modes, one codebase.** Guest mode runs the *exact same* engine, just without persistence. Signed-in mode adds a 1500ms-debounced Firestore sync, snapshot deduplication per (course × calendar day), and a 120-snapshot rolling cap to keep documents small.
- **Theme switching without the flicker.** A dark/light toggle that injects a transition-suppressing stylesheet, forces a synchronous reflow, swaps `data-theme`, then removes the suppressor on a double `requestAnimationFrame`. That is the only way to avoid the cascade-flash on themed surfaces.

This is a legitimately full-stack product: client engine, server APIs, scheduled jobs, two notification channels, two auth states, an admin console, and a security model. Not a CRUD app with a chart.

---

## 6. Why It's Innovative

- **Predictive, not descriptive.** Every existing tool a student uses (VTOP, spreadsheets) tells them *where they are*. This app tells them *where they will be* — and what to do about it. That shift from descriptive to predictive is the entire value.
- **The same engine runs on the client and on the server.** The Saturday cron computes the *same* dashboard summary the student sees in the browser, against the *same* `semester-data.json`. Email/Telegram and the UI cannot drift.
- **Honest about uncertainty.** The forecast won't render until 4 snapshots exist. Recovery returns "Impossible" when it really is. Borderline courses (75–77%) are surfaced as their own category with a "no buffer" callout — not lumped in with "safe."
- **Calendar-aware in the right way.** Lab FAT week (Apr 24–30) is typed `academic`, not `exam`, because theory courses still meet — but the event name still appears on hover so the student gets context. That's a real-world detail no generic attendance tracker would handle correctly.
- **Risk = formula ∨ ML, whichever is worse.** Innovative not because ML is new, but because we deliberately *use both* and bias toward the more cautious answer. A student should never be lulled into safety by a single model.
- **Frictionless adoption.** Guest mode means a student can run a full plan in 30 seconds without an account. That is what makes the tool actually spread on campus.

---

## 7. Why Students Will Actually Use This

- **It costs them nothing.** No login required for the planner. The signed-in features (saved courses, weekly emails, history) are upside, not a wall.
- **It is faster than a spreadsheet.** Slot picker → two numbers → six metrics. Under 20 seconds. No formulas to copy.
- **It is mobile-first.** Side nav becomes a bottom nav on phones with a safe-area inset. Heatmaps reflow. The course grid collapses to one column. This is where students live — not laptops.
- **It speaks their language.** It says *"B1+TB1 is below 75% — attendance check"* in the email subject, not *"Notification 47."* It says *"Attend the next 3 classes before planning any skip,"* not *"Recommendation: positive."*
- **It nags them at the right time.** Saturday afternoon — before they plan the next week. Not Monday morning when it's already too late.
- **It tells the truth.** When the recovery is impossible, it says so. When everything is fine, it leads with "All N courses on track" instead of inventing alarm.

Students don't trust tools that overpromise. This one underpromises and delivers.

---

## 8. The Closing Argument

Attendance is the single biggest preventable cause of exam debarment at VIT-AP. The math to avoid it is not hard — but it is tedious, error-prone, calendar-dependent, and time-sensitive in a way that students consistently get wrong. Every existing solution (VTOP, spreadsheets, group-chat reminders) addresses *one* of those four properties and ignores the others.

This project addresses all four:

- **Tedious** → automated.
- **Error-prone** → hybrid formula + ML risk classifier, double-checked.
- **Calendar-dependent** → official semester JSON, slot-aware, exam-aware.
- **Time-sensitive** → weekly cron on email + Telegram, with a manual "send test alert" button so students *see* the pipeline is alive.

It is built with production-grade pieces (Firebase Auth + Firestore rules, Vercel serverless, Nodemailer, Telegram Bot API, `firebase-admin`, `simple-statistics`, `ml-cart`), it has a real security model (custom claims, constant-time compares, server-only fields, request-body caps, throttles), and it ships with an admin console so the calendar and slot map can be maintained without redeploying.

It is, in the most literal sense, the tool every VIT-AP student has been hand-rolling in a spreadsheet for years — finally built once, built correctly, and given to them for free.

That is why this project deserves to exist, deserves to be used, and deserves a top mark.
