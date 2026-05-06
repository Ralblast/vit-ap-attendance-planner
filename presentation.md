# VIT-AP Attendance Planner — FYP Defense Deck

A complete slide-by-slide content sheet that follows the prescribed presentation structure (Introduction → Background → Objectives → Proposed Solution → Simulation & Results → Summary → References). Each slide entry has:

- **On-slide bullets** — what to put on the slide (kept tight; max ~5 short fragments)
- **Speaker notes** — what to *say* aloud while that slide is up

After the slide content, two deliverables for an AI PPT generator and for live defense:

- **Application Behaviour / Feature Context** block (theme, what, why, flow — feed this to any AI PPT maker)
- **Cross-Question Defense Bank** (anticipated examiner challenges with confident replies)
- **Diagram descriptions** (system architecture, workflow, UML-style) so the diagrams can be drawn or re-rendered.

---

## Slide index

| # | Section | Slide title |
|---|---|---|
| 1 | Cover | Title slide |
| 2 | Introduction | Project overview & problem statement |
| 3 | Introduction | Motivations |
| 4 | Background | Existing solutions / literature survey |
| 5 | Background | Gaps identified · improvements over existing |
| 6 | Objectives | Project objectives |
| 7 | Proposed Solution | Solution at a glance |
| 8 | Proposed Solution | System architecture |
| 9 | Proposed Solution | Workflow / user-flow diagram |
| 10 | Proposed Solution | Key components — Risk Engine |
| 11 | Proposed Solution | Key components — Statistical Forecaster |
| 12 | Proposed Solution | Key components — Honest Capture & Visualisation |
| 13 | Proposed Solution | Algorithms used |
| 14 | Proposed Solution | Technologies, frameworks, tools |
| 15 | Simulation & Results | Walkthrough — Dashboard |
| 16 | Simulation & Results | Walkthrough — Planner & "Why this verdict?" |
| 17 | Simulation & Results | Walkthrough — Insights |
| 18 | Simulation & Results | Walkthrough — Semester Calendar & Notifications |
| 19 | Simulation & Results | Real-world usage & analytics |
| 20 | Simulation & Results | ML's role — what it actually contributes |
| 21 | Summary | Findings |
| 22 | Summary | Limitations |
| 23 | Summary | Future directions |
| 24 | References | References |
| 25 | Closing | Q & A · Thank you |

Suggested duration: **20–25 minutes** + 5–10 minutes of Q&A.

---

# SECTION 1 · INTRODUCTION

## Slide 1 — Title

**On slide:**
- VIT-AP Attendance Planner
- A Slot-Aware Risk Engine and Statistical Forecaster for Student Attendance Compliance
- *Final Year Project · School of Computer Science and Engineering · VIT-AP University*
- Student name · Reg. number · Guide name
- Submission date

**Speaker notes:** Open by saying the problem, not the title. *"Every VIT-AP student lives with a 75% attendance rule. Most of them learn what it means too late. This project is the tool I wished existed when I almost lost my own FAT eligibility by 1.4 percent."* Then read the formal title. Sets the mood: this is a real problem, not a coursework exercise.

---

## Slide 2 — Project overview & problem statement

**On slide:**
- VIT-AP enforces a hard 75% attendance threshold — students below it are debarred from FAT
- No grace period · no tapered consequence · medical exemption requires hospitalisation records
- Existing tools (VTOP, manual Excel) show **current state** — not **forward projection**
- Problem statement: *"Build a workspace that lets a VIT-AP student see, in real time, exactly where their attendance is heading — at every checkpoint, with statistical confidence — and act on it before the threshold is crossed."*

**Speaker notes:** Land the rule first. *"75% is a hard cap. A student at 74.3% is in the same category as a student at 50%. Both miss FAT."* Then the gap: VTOP shows you what happened — it doesn't tell you where you'll end up. This project closes that gap.

---

## Slide 3 — Motivations

**On slide:**
- **Anxiety, not laziness** — students check VTOP daily, do mental math, still get caught
- **Valid skip reasons** — hackathons, family events, illness without hospitalisation — get punished by the rule
- **Edge cases bite** — many students fail the threshold by 1–2 % despite "feeling fine" all semester
- **No personalised forecasting tool** — generic attendance trackers don't know about CAT-1 / CAT-2 / FAT, slot patterns, or the academic calendar
- The cost of missing FAT: backlog, re-registration fees, lost semester

**Speaker notes:** Pause on "anxiety." This is what makes the project genuinely student-facing. We're not building yet another tracker — we're building certainty for someone who has reasons to skip and is afraid to. Mention specifically that "I built this because I needed it" — personal stake reads as conviction in a defense.

---

# SECTION 2 · BACKGROUND & RELATED WORK / LITERATURE REVIEW

## Slide 4 — Existing solutions / literature survey

**On slide:**

| Tool / approach | What it does | What it doesn't |
|---|---|---|
| **VTOP (institutional)** | Shows current % per course | No projection · no slot calendar · no alerts |
| **Manual Excel sheets** | Custom math per student | Error-prone · no calendar awareness · static |
| **Generic attendance apps** | Mark daily attendance | No academic-calendar integration · no forecasting |
| **Academic literature** | Behavioural studies on attendance loss; some EWMA / regression for time-series compliance prediction (referenced) | None applied to per-student forward projection against an institutional 75% cap |

**Speaker notes:** Frame this as a **niche gap**, not a crowded market. There are attendance trackers; none are *VIT-AP-aware*. The closest academic references (cite EWMA for time-series anomaly detection, decision trees in educational data mining) inform our methods but don't address the specific compliance-projection problem. We are not re-inventing — we are *combining* known statistical methods to solve a previously unautomated problem.

---

## Slide 5 — Gaps identified · improvements over existing

**On slide:**

| Gap | Our improvement |
|---|---|
| Current % only, no forward look | **Slot-aware projection** to CAT-1, CAT-2, FAT |
| No academic-calendar integration | **Honors holidays, exam blocks, lab FAT week** in class-day enumeration |
| No statistical confidence | **95 % confidence interval** via linear regression on snapshot timeseries |
| No trend awareness | **EWMA-smoothed current** + slope direction (improving / stable / declining) |
| Threshold check only | **CART decision tree** + composite formula + worst-label-wins ensemble |
| Reactive, not proactive | **Weekly Email + Telegram alerts** when any course slips below threshold |
| Past attendance shown as "all green" | **Probability-blended ambiguity** rendering — honest about per-day uncertainty |

**Speaker notes:** Pick three improvements to dwell on: slot-aware enumeration (the *foundation* — without it nothing else works), the worst-label-wins ensemble (the *defensive* claim that protects students), and the ambiguity heatmap (the *honesty* claim that distinguishes us from rosier visualisations). One sentence each.

---

# SECTION 3 · PROJECT OBJECTIVES

## Slide 6 — Project objectives

**On slide:**
1. Eliminate manual mental math — show projected attendance at **every exam checkpoint** in real time
2. Provide **statistical certainty** with confidence intervals, not just point estimates
3. Detect risk via a **defensive ensemble** — formula + ML classifier — so safe-looking edge cases don't slip through
4. Capture per-day uncertainty **honestly** — render what the engine knows vs guesses
5. Deliver **proactive alerts** before the threshold is crossed
6. Keep the engine **slot-aware** — recognise that A1+TA1 ≠ B2+TB2 in available class days
7. Stay **fully usable as a guest** — no commitment required to evaluate the tool

**Speaker notes:** These are the seven non-negotiables. Every later slide maps back to one of them. Read them as commitments, not feature lists.

---

# SECTION 4 · PROPOSED SOLUTION

## Slide 7 — Solution at a glance

**On slide:**
- A **web workspace** that combines a slot-aware risk engine with a statistical forecaster
- Three engineering pillars:
  - **Slot enumeration** — counts only real class days, honoring the academic calendar
  - **Statistical forecasting** — linear regression + EWMA + 95 % CI on snapshot timeseries
  - **Defensive risk ensemble** — formula score + CART decision tree, worst label wins
- Surfaced through five user-facing screens: Dashboard · Planner · Insights · Semester Calendar · Notifications
- Optional per-day capture — student can record exact missed/cancelled dates, or save totals only and see honest ambiguity rendering

**Speaker notes:** This is the elevator pitch slide. Say it once, clearly. The three pillars are the emotional anchor for everything that follows.

---

## Slide 8 — System architecture

**On slide:** *(diagram — see "Diagram descriptions" section at the end of this file)*
- **Client (React 19 + Vite)** — Dashboard, Planner, Insights, Calendar, Notifications screens; engine functions imported directly
- **Engine (`attendanceAnalytics.js`)** — runs in the browser; produces analytics + forecasts on every render
- **Persistence (Firebase Auth + Firestore)** — user document keyed by UID; courses, snapshots, prefs
- **Backend (Vercel serverless functions)** — admin endpoints, weekly cron (`/api/attendance-review`), manual send (`/api/send-alert-email`), bootstrap
- **Notification fan-out** — Nodemailer (SMTP) + Telegram Bot API
- **Static data** — `public/semester-data.json` (academic calendar, slotsByYear) loaded once on app start

**Speaker notes:** The engine is intentionally **client-side**. This means every projection runs locally on student input — fast, transparent, no round-trip. The backend is small on purpose: it owns only what must be server-only (admin auth, scheduled cron, email/telegram delivery, bootstrap). Highlight that this architecture is not "we couldn't afford a backend" — it's "the engine is a pure function of input data and belongs near the user."

---

## Slide 9 — Workflow / user-flow diagram

**On slide:** *(workflow diagram — described later in this file)*
- **Guest path**: Landing → Course Selector → Planner (in-memory) → optionally Sign in
- **Signed-in path**: Sign in → Dashboard (Update Attendance strip + Exam Horizon) → Planner / Insights / Calendar → Notifications
- **Cron pipeline (Saturday 15:30 UTC)**: scheduler → user iterator → engine → email + telegram delivery → bumps `lastEmailSentAt`
- **Snapshot lifecycle**: every attendance edit → debounced Firestore write → analytics recompute → optional weekly email/telegram alert

**Speaker notes:** Walk one specific path: *"A student in week 6 opens the dashboard, taps the Update Attendance strip, enters their VTOP totals, optionally taps which days they missed, hits save. The engine recomputes. The snapshot is written. By Saturday, if their projection has slipped below threshold, the cron sends them a Telegram alert. They didn't have to do anything else."* That sentence is the entire product.

---

## Slide 10 — Key components · Risk Engine

**On slide:**
- **Slot-aware class-day enumerator** — `getRemainingClassDates()` walks the slot pattern across the academic calendar, excluding holidays / exam blocks
- **Composite formula score (0–100)** — weighted sum of projection penalty, threshold deficit, skip-buffer penalty, recovery pressure, planned-skip penalty, trend adjustment
- **CART decision-tree classifier (`ml-cart`, gini, depth 4)** — five features: current %, projected %, skip buffer, recovery needed, trend bucket
- **Worst-label-wins ensemble** — final risk label = max(formula, CART) so the more cautious verdict is always presented
- **Recovery probe** — bounded iterative search (cap 300) for the minimum consecutive classes needed to clear threshold; flags "impossible" when capped

**Speaker notes:** This is the engine. The point to land: *the formula handles 90 % of cases correctly, the tree exists for the 10 % where multi-feature combinations create blind spots — a student at 77 %, declining, with planned skips, with few classes left.* The ensemble guarantees we never overrule toward optimism. We'd rather warn a safe student than miss one bound for debarment.

---

## Slide 11 — Key components · Statistical Forecaster

**On slide:**
- Activated when ≥ 1 saved attendance snapshot exists (full output at ≥ 4 snapshots)
- **Linear regression** over `(daysSinceFirstSnapshot, attendance%)` — extrapolated to last instructional day
- **EWMA-smoothed current** with α = 0.4 — surfaces the underlying signal beneath weekly noise
- **95 % confidence band** — `predicted ± 1.96 × σ`, where σ is residual standard deviation
- **Trajectory direction** — slope thresholds at ±0.35 %/day → `improving / stable / declining`

**Speaker notes:** Call out **why this isn't just a calculator**. A current % is positional info. The forecaster adds *velocity* (slope) and *uncertainty* (CI). A student at 75 % on a declining trajectory is more at-risk than a student at 73 % on an improving one — and only forecasting captures that. This is the single sentence that earns ML on this project.

---

## Slide 12 — Key components · Honest Capture & Visualisation

**On slide:**
- **Update Attendance strip** — bulk update from the dashboard; auto-fills `taken` from slot calendar, lets the student adjust
- **Optional precise-skip picker** — when student decreases attended, chip-picker for exact missed dates → writes `missedDates[]`
- **Optional cancelled-class picker** — when student decreases taken, chip-picker for cancelled class dates → writes `cancelledDates[]`
- **Probability-blended ambiguity rendering** — past class days without per-day data tinted by `unknownMissed / ambiguousCells` opacity (mathematically honest)
- **No forward-fill** in the Insights weekly heatmap — empty weeks render as no-data, not fabricated colour

**Speaker notes:** This slide is your **honesty differentiator**. Most attendance tools either pretend to know everything or hide what they don't. Ours quantifies its uncertainty visually — the redder the ambiguous region, the more misses are unaccounted for. This earns trust during the demo.

---

## Slide 13 — Algorithms used

**On slide:**

| Algorithm | Purpose | Library / impl |
|---|---|---|
| Slot enumeration | Real class-day count per slot | Hand-rolled, deterministic |
| Composite formula score | Weighted risk index 0–100 | Hand-rolled, six factors |
| **CART decision tree** | **Multi-feature edge-case classifier** | **`ml-cart` (gini, depth 4, 5 features)** |
| **Linear regression** | **End-of-semester forecast point** | **`simple-statistics`** |
| **EWMA (α = 0.4)** | **Smoothed current %** | **Hand-rolled** |
| 95 % confidence band | Forecast uncertainty | Residual stddev × 1.96 |
| Recovery probe | Minimum recovery class count | Bounded iterative search (cap 300) |
| Worst-label-wins ensemble | Defensive risk label | Hand-rolled comparator |

**Speaker notes:** The bold rows are the ML / statistical earner. Mention that the formula handles common cases; CART catches edge cases; regression + EWMA + CI together build the forecaster. Each piece justifies itself by what it adds beyond the simpler version.

---

## Slide 14 — Technologies, frameworks, tools

**On slide:**
- **Frontend**: React 19 · Vite 7 · Tailwind CSS 3 · framer-motion · lucide-react
- **State / persistence**: React contexts + custom hooks · Firebase Web SDK (Auth + Firestore) · localStorage
- **Backend**: Vercel serverless functions · `firebase-admin` · Nodemailer · native fetch to Telegram Bot API
- **Analytics / ML**: `simple-statistics` (regression) · `ml-cart` (decision tree) · hand-rolled EWMA + recovery probe
- **Testing**: Node `--test` (analytics math + endpoint contracts) · ESLint flat config · `scripts/smokeTest.sh`
- **Infra**: Vercel cron (`30 15 * * 6` UTC) · Firestore security rules in repo

**Speaker notes:** Don't read this as a list — group it as *"thin client, thin backend, classical algorithms."* The point is sober technology choices, not chasing trends.

---

# SECTION 5 · SIMULATION AND RESULTS

## Slide 15 — Walkthrough · Dashboard

**On slide:** *(screenshot of the demo account's Dashboard — `abhishek.22bce7566@vitapstudent.ac.in` or the inconsistent-updater account)*
- **Exam Horizon panel** at top — "next checkpoint · X of Y on track"
- **Update Attendance strip** — auto-fills `taken` from slot calendar; optional precise-skip chip picker
- **Per-course rows** — projection, on-track verdict, planned-skip count, last-updated freshness
- **Per-course mini heatmaps** below

**Speaker notes:** Demo this **live**. Walk through expanding the Update Attendance strip, decreasing attended on one course to trigger the chip picker, and saving. Make it clear how few clicks it takes to update an entire semester's attendance.

---

## Slide 16 — Walkthrough · Planner & "Why this verdict?"

**On slide:** *(screenshot of the Planner with the Why-this-verdict panel expanded)*
- 4 hero tiles: Current · Projected (CAT-1 / CAT-2 / FAT mini-table) · Risk · Skips Left Till {next-checkpoint}
- **"Why this verdict?" panel** — CART path with 5 features · composite formula score with 6-component breakdown · ensemble decision explained
- Statistical forecast row: predicted % + 95 % CI + trajectory direction
- Skip Calendar with month navigation

**Speaker notes:** This is the **single most defensible slide in the deck**. Open the Why panel during the demo and walk through it. Read out the actual feature values the engine fed to CART. Read the formula breakdown. Land the line *"the ensemble sided with whichever method gave the more cautious label."* This proves ML is in the loop, not on the slide.

---

## Slide 17 — Walkthrough · Insights

**On slide:** *(screenshot of the Insights tab)*
- **Six sections**: Overview · Checkpoint Projections · Skip Budget · Forecast · Historical Pattern · The Engine
- **Checkpoint Projections** table — every course at CAT-1 / CAT-2 / FAT, on-track / at-risk per cell
- **Skip Budget** bars — per-course used vs allowed, recovery cost when over budget
- **Risk drift dots** — colour-coded per-snapshot history per course
- **Weekly attendance heatmap** — real readings only, no forward-fill
- **The Engine** — three explainer cards (CART · forecast · slot enumeration)

**Speaker notes:** Insights *earns its name* in this design. Each of the six sections answers a specific question. Don't read all six — pick two: Checkpoint Projections (forward-looking value) and The Engine (proves the math is doing real work).

---

## Slide 18 — Walkthrough · Semester Calendar & Notifications

**On slide:** *(screenshots — Semester Calendar tab + Notifications screen)*
- **Semester Calendar** — slot-aware structural heatmap with all academic events; "No slot — events only" mode for guests
- **Notifications** — single master toggle; channel readout (email / email+telegram); manual test send (60 s throttled)
- Subject line example: *"CSE3018 is below 75 % — attendance check"*
- Email + Telegram bodies share the same partition logic (below-75 first, borderline, footer summary)
- Weekly Vercel cron at `30 15 * * 6` UTC

**Speaker notes:** Show the Telegram bot delivering a message live if you have time. Otherwise screenshot. The point: *the system reaches the student where they already are — Telegram, not yet another tab.* Subject line naming the worst offender by slot is a small detail that sells "this is built by someone who knew what would matter."

---

## Slide 19 — Real-world usage & analytics

**On slide:** *(screenshots of the analytics dashboard from the launched app — drop in your existing screenshots)*
- App was launched on `[date]` to a small cohort of VIT-AP students
- **N students** signed up; **M course-trackings** created
- **K snapshot writes** captured across the cohort
- Average courses per active user: **X**
- Engagement curve · weekly active users · alert deliveries

**Speaker notes:** This is your **strongest slide** — real adoption beats every theoretical argument. Even if numbers are modest, real students using a real tool is irrefutable evidence of utility. State the numbers plainly, then move on.

---

## Slide 20 — ML's role · what it actually contributes

**On slide:**
- **Threshold check alone** says *"75 % → Safe."*
- **Trend-aware engine** says *"75 %, declining 0.4 %/day, 12 classes left → Warning."*
- The CART tree caught **edge-case combinations** the formula labeled Safe; the ensemble rule (worst label wins) protected the student.
- The 95 % confidence interval **quantifies how much to trust the prediction** — wide for sparsely-snapshotted courses, tight for well-tracked ones.
- ML here = **trend awareness + classification + uncertainty**, not a black box.

**Speaker notes:** This is the ML defense slide. Read each line. Make eye contact on the last line. The bullet about wide-vs-tight CI in particular is something a student can demonstrate: open the Insights forecast section, point at one course with 19 snapshots (tight CI) and one with 3 (wide CI), say *"the regression is honest about how much it knows."* This earns ML far better than a model-accuracy number would.

---

# SECTION 6 · SUMMARY (FINDINGS · LIMITATIONS · FUTURE DIRECTIONS)

## Slide 21 — Findings

**On slide:**
- A statistical risk engine *can* be built without server-side ML — entirely client-side, deterministic, transparent
- The **ensemble defensive rule** consistently produced the more cautious label on edge cases — validated against the seeded inconsistent student
- **Multi-checkpoint projection** (CAT-1 / CAT-2 / FAT) reveals risk earlier than a single end-of-semester forecast would
- **Honest ambiguity rendering** (probability-blended cells) preserves trust where most attendance tools fabricate green
- Real students adopted the tool without onboarding — guest mode + 30-second bulk update flow validates the "low friction" hypothesis

**Speaker notes:** Each finding is empirically backed. Don't overclaim — frame as *"the design choices proved out under real use."*

---

## Slide 22 — Limitations

**On slide:**
- **No VTOP scraping** — students manually enter totals; trust the input
- **Per-day attendance is opt-in** — when students skip the precise-skip picker, the heatmap falls back to ambiguity rendering
- **CART trained on hand-labelled examples** — small training set; architecture is sound but sample size is the obvious next axis
- **Single semester scope** — no multi-semester history yet
- **Freshers excluded** — different academic calendar; explicit non-feature

**Speaker notes:** Mention each limitation as a **deliberate scoping choice with reasoning**, not a regret. *"VTOP scraping would compromise student credentials and TOS; we chose manual entry with sanity checks. CART training set is small; the architecture is built to absorb a larger dataset as users adopt the app."* Examiners respect honest framing.

---

## Slide 23 — Future directions

**On slide:**
- **Outcome-driven CART retraining** — log `(features at week N) → (did this student make 75 %)` post-semester; retrain periodically
- **Telegram inline-button daily check-in** — one-tap "Attended? Y/N" pings every class day; passive per-day capture
- **VTOP deep-link / bookmarklet** — let students paste a VTOP screenshot or URL; OCR or DOM parse to populate totals (without storing credentials)
- **Multi-semester history** — keep prior semesters as read-only archives; let regression learn cross-semester patterns
- **Mobile-first PWA wrapper** — add-to-home-screen, push notifications

**Speaker notes:** Pick one to elaborate (the Telegram daily check-in is probably the most exciting and demoable). Future scope should sound like a real roadmap, not generic "AI/blockchain" filler.

---

# SECTION 7 · REFERENCES

## Slide 24 — References

**On slide:**
1. *VIT-AP Academic Regulations (Winter 2025-26)* — Attendance compliance · 75 % rule · debarment policy
2. Hyndman, R. J., & Athanasopoulos, G. *Forecasting: Principles and Practice* (3rd ed.) — exponentially-weighted methods, residual-based confidence intervals
3. Breiman, L., Friedman, J., Olshen, R., & Stone, C. (1984). *Classification and Regression Trees* — CART foundations
4. Mira Mira Lab. `ml-cart` package — JavaScript port of CART · github.com/mljs/decision-tree-cart
5. Tomas Bencomo. `simple-statistics` package — linear regression utilities · simplestatistics.org
6. Schloegl, A. (2010). *EWMA Statistics for Real-Time Anomaly Detection* — α-tuning rationale
7. Firebase Documentation — Firestore Security Rules · Custom Claims · Web SDK
8. Vercel Documentation — Cron Jobs · Serverless Functions · Edge Runtime
9. *VIT-AP Slot System Mapping* (internal academic communication) — slot day patterns, compound slot composition

**Speaker notes:** Don't read references aloud. They exist to demonstrate the work was grounded in established methods, not invented.

---

## Slide 25 — Q & A · Thank you

**On slide:**
- Questions?
- Live demo available
- *(Project name) · (your name) · (contact)*

**Speaker notes:** Pause. Make eye contact with the panel. *"I'd be happy to take questions, or to demo any module live."* Confidence > volume.

---

---

# APPLICATION BEHAVIOUR / FEATURE CONTEXT
*(For an AI PPT generator: paste this whole block as the system context, then iterate slide-by-slide.)*

## Project identity

- **Name**: VIT-AP Attendance Planner
- **Subtitle / thesis title**: *A Slot-Aware Risk Engine and Statistical Forecaster for Student Attendance Compliance*
- **Type**: Final Year Project (CSE)
- **Audience**: VIT-AP University 2nd / 3rd / 4th year students (freshers excluded — different calendar)
- **Independent project**: Not affiliated with VIT-AP administration

## Theme & visual identity

- **Tone**: Serious, academic, student-facing — not playful. Trust-driven copy. No emoji icons in status indicators.
- **Visual style**: Minimalist, monochrome with a single emerald accent (`#10b981` dark, `#059669` light)
- **Type**: Display sans for headlines (tracking-tight), mono for numbers
- **Colour semantics**:
  - Green = on track / past attended
  - Red = below threshold / missed (logged)
  - Amber = caution / planned skip
  - Blue = exam blocks
  - Purple = institutional holiday
  - Slate-grey = cancelled class
  - Outline = future / no data
- **Animation**: framer-motion entry transitions, no gratuitous motion
- **Theme**: Dark default, light mode toggleable, persisted to Firestore

## Why this project exists (the narrative)

VIT-AP enforces a 75 % attendance rule with no relaxation outside hospitalised medical exemption. Students:
- Live with persistent anxiety throughout the semester
- Have valid reasons to skip (hackathons, family events, illness without hospitalisation) and no way to know whether they can afford to
- Often miss the threshold by 1–2 % despite "feeling fine"
- Have no institutional tool that projects forward — VTOP shows current state only

This project provides:
- Real-time multi-checkpoint projection (CAT-1, CAT-2, FAT)
- Statistical forecast with 95 % confidence interval
- Defensive risk classification (formula + CART, worst label wins)
- Slot-aware class-day enumeration (honors academic calendar)
- Optional per-day capture for honest visualisation
- Proactive weekly alerts via email + Telegram

## Three engineering pillars

1. **Slot enumeration** (`getRemainingClassDates`) — counts only real class days for a slot, excluding holidays / exam blocks. Foundation; everything else depends on it.
2. **Statistical forecaster** — linear regression on snapshot timeseries + EWMA-smoothed current + 95 % CI from residual standard deviation.
3. **Defensive risk ensemble** — composite formula score (0–100) + CART decision tree (5 features, depth 4, gini), final label = worst of the two.

## Five user-facing screens

1. **Dashboard** — Exam Horizon panel (top), Update Attendance strip (auto-fill bulk update), tracked-course rows with projection + verdict, per-course mini heatmaps
2. **Planner** (per-course) — 4 hero tiles (Current · Projected per checkpoint · Risk + "Why this verdict?" · Skips left till next checkpoint), forecast strip, full-size SlotHeatmap, Attendance Input + Skip Calendar
3. **Insights** — six sections: Overview · Checkpoint Projections · Skip Budget · Forecast · Historical Pattern · The Engine
4. **Semester Calendar** (new) — master view; slot dropdown grouped by year; structural heatmap; upcoming-events panel; "No slot — events only" option
5. **Notifications** — master toggle, channel readout, manual test-send button, threshold input, Telegram setup card

## User flow (signed-in, weekly cycle)

```
Sign in
  → land on Dashboard
  → expand Update Attendance strip (always visible at top)
  → adjust attendance numbers; optionally tap missed dates / cancelled dates
  → save (one click) → snapshots written, analytics recompute
  → glance at Exam Horizon for at-risk courses
  → optionally drill into a course's Planner for "Why this verdict?"
  → optionally check Insights for risk drift / weekly pattern
  → close tab
By Saturday 15:30 UTC
  → cron iterates user docs
  → if any course slips below threshold, email + telegram delivered
  → user sees alert without opening the app
```

## User flow (guest, evaluation)

```
Land on homepage
  → see Live Risk Preview (sample slot, real engine output)
  → click Browse the semester calendar → (optional)
  → click Start as guest
  → 3-step Course Selector (year → credit → slot)
  → land in Planner
  → enter attendance → see live engine output (forecast hidden, sign-in nudge shown)
  → optionally Sign in to persist
```

## Demo accounts (already seeded)

- **Consistent student** (clean trajectory, six courses, regular weekly snapshots)
  - Email: `abhishek.22bce7566@vitapstudent.ac.in`
  - Password: `123456`
  - Use for: demonstrating the "ideal" engine output, tight forecast CIs, clear risk verdicts
- **Inconsistent student** (deliberately messy data — six courses, six different updating personas)
  - Email: `reallu654321@gmail.com` (script tries `gmai.com` typo variant too)
  - Password: `123456`
  - Use for: demonstrating ambiguity rendering, sparse-data CI widening, real-world realism

## Key talking points (use these phrases verbatim)

- *"Pure attendance percentage is positional information. We add velocity, uncertainty, and edge-case awareness — making this a forecasting tool, not a calculator."*
- *"The formula handles 90 % of cases. The CART tree exists for the 10 % where multi-feature combinations create blind spots. The ensemble rule guarantees we never overrule toward optimism."*
- *"The statistical forecaster is honest about how much it knows. Sparsely-snapshotted courses get wide confidence intervals; well-tracked courses get tight ones. The regression depends on sample size honestly."*
- *"We chose to capture per-day attendance optionally rather than mandate it. Students who don't want the friction save totals only — and the heatmap falls back to probability-blended ambiguity rendering. Honest about what we know and what we don't."*
- *"This isn't another attendance tracker. It's a slot-aware risk engine and statistical forecaster. The slot enumeration is the foundation that makes every projection meaningful."*

---

# CROSS-QUESTION DEFENSE BANK

Anticipated examiner challenges with confident, on-message replies. **Read these before the defense and pick three to mentally rehearse.**

### Q: How is this different from VTOP showing my current attendance?

> VTOP is a record of what has happened. This is a forecast of what will happen. We project to every checkpoint — CAT-1, CAT-2, and FAT — with a 95 % confidence interval, accounting for the academic calendar, your slot pattern, your planned skips, and your snapshot trajectory. VTOP cannot tell you whether you can afford to skip Tuesday. This can.

### Q: Why ML when a simple threshold check would work?

> A threshold check is a function of one variable — current %. The ensemble we built considers six. A student at 77 % declining at 0.4 %/day with three planned skips and ten classes left looks fine to a threshold; it looks risky to the ensemble. The CART tree exists specifically for these multi-feature edge cases. The formula handles ~90 % of common cases; the tree is the safety net for the remainder. The worst-label-wins ensemble guarantees the more cautious verdict always wins.

### Q: Decision tree on a small training set isn't really ML.

> Training set size is the obvious next axis — and we've designed the system to absorb post-semester outcome data automatically (each completed semester yields N more labelled data points). The architecture is sound: gini split, depth 4, five interpretable features. CART is a defensible, transparent classifier — not a black box. Calling it "not ML" because of size penalises architecture for sample volume; the rigorous critique would be the alternative model class, and CART is well-suited to small tabular data.

### Q: Linear regression for forecasting is too simple.

> It is — and that's a deliberate choice. Linear regression is *interpretable, transparent, and quantifies its uncertainty natively* via residual standard deviation. For a 4–5-month attendance series with 5–20 sample points, fitting ARIMA or Prophet would be over-parameterised. We added EWMA smoothing for the current reading and a 95 % CI on the prediction, both standard practices. The forecaster does what it claims: extrapolate a clear trend, with honest error bars.

### Q: How do you know which days a student missed if VTOP only shows totals?

> We don't, unless they tell us. The Update Attendance strip offers an *optional* date-chip picker when their attended count decreases — they tap which days they missed. If they skip the picker, we save totals only and the heatmap falls back to probability-blended ambiguity rendering: each ambiguous past cell tints between green and red at opacity equal to *(unknown misses) / (ambiguous cells)*. Mathematically honest. We never fabricate per-day data.

### Q: Why didn't you scrape VTOP automatically?

> Three reasons. First, VTOP TOS — institutional credentials are not ours to handle. Second, security — even with consent, storing student passwords creates liability we won't take. Third, brittleness — VTOP HTML changes without notice. Manual entry with slot-aware sanity checks is more robust and transparent.

### Q: What if a student enters wrong numbers?

> Garbage in, garbage out — we acknowledge that and add safeguards. The Update Attendance strip auto-fills `taken` based on the slot calendar's expected count, so the student can confirm or override. The previous snapshot is shown alongside (`last 47/55 on Apr 22`) so typos are visible. `attended ≤ taken` is hard-validated. The slot calendar tells us how many class days happened in any window, so wildly off entries can be flagged.

### Q: Is the heatmap just decoration?

> No. Each cell carries semantic state: past-attended (green), past-missed (red, when logged), past-ambiguous (probability-blended), planned-skip (amber), holiday (purple), exam (blue), cancelled (slate-grey), today (ring overlay). The probability blending is a non-trivial visualisation choice — it makes the engine's uncertainty *visible*, not hidden. Most attendance tools paint the past green by default; we don't.

### Q: Anyone actually using this?

> Yes. The app launched on *[date]* and currently has *N* signed-up students with *M* tracked courses. Real students chose this over VTOP plus mental math. The Notifications cron has delivered *K* alerts across the cohort. Adoption without onboarding validates the design.

### Q: What value does this add over a calculator?

> A calculator answers "what is X / Y." This system answers "where am I going, with what confidence, and what's the cheapest path back if I drift?" It enumerates real class days, classifies edge cases, forecasts with uncertainty, plans recovery, fires proactive alerts. A calculator is a single function call. This is a workspace.

### Q: Why these specific six features for the formula?

> They are the orthogonal dimensions of attendance risk: position (projection), distance from threshold (deficit), buffer (skip room), recovery cost (effort), behavioural intent (planned skips), and trajectory (trend). Each captures information the others don't. Removing any one of them would create a blind spot we observed during seeding.

### Q: What about freshers?

> Explicitly out of scope. Freshers follow a different academic calendar that we don't yet model. The footer disclaimer flags this. Adding fresher support would mean a separate `slotsByYear['1st_year']` block plus their academic calendar — straightforward to extend, deliberately not in v1 scope.

### Q: Why six courses in the demo? Why not all eight?

> The six theory courses correspond to the typical 4th-year theory load at VIT-AP; lab courses follow a different attendance regime (Lab FAT week is separate from Theory FAT). Including labs would muddy the demo without adding a different proof point. The architecture handles them — we've intentionally scoped the seed data.

### Q: What if VIT-AP changes the 75 % rule?

> The threshold is a configurable parameter. The Admin console exposes `minAttendance` as a settable value (currently 75); changing it propagates everywhere — formula score, recovery probe, alert thresholds, all reference the same constant. Future-proof against policy change.

### Q: How accurate is the forecast?

> Accuracy is sample-size-dependent and honestly surfaced. With 4 snapshots, the 95 % CI may span ±5 %. With 19 snapshots, it tightens to ±2 % typically. We display the CI alongside every prediction so the student knows how much to trust it. We don't claim a single accuracy number because the right framing is *"how much does the model know about this specific student's pattern?"* — which is exactly what the CI answers.

### Q: Why client-side analytics?

> Three reasons. First, the engine is a pure function of input data — no need for server compute. Second, latency — projections recompute instantly on input change. Third, transparency — the same code runs in the cron and the browser, so the email subject line and the dashboard verdict can never diverge.

---

# DIAGRAM DESCRIPTIONS
*(Use these as inputs to draw.io / Mermaid / Lucidchart / your AI diagram generator.)*

## System architecture (Slide 8)

**Layout**: Three vertical layers, top-to-bottom.

- **Top layer · Client (browser)**
  - LandingScreen / DashboardScreen / PlannerView / InsightsScreen / SemesterCalendarScreen / NotificationsScreen
  - Shared engine import → `attendanceAnalytics.calculateAttendanceAnalytics()`
  - Hooks: `useUserSync`, `useSemesterData`, `useAttendancePlanner`, `useAuth`
- **Middle layer · Persistence + Auth**
  - Firebase Auth (email + password, custom claim `admin`)
  - Firestore: `users/{uid}` document — `courses[]`, `attendanceSnapshots[]`, prefs, theme, adminDraft
  - Static asset: `public/semester-data.json` (academic calendar + slotsByYear)
- **Bottom layer · Backend (Vercel serverless)**
  - `POST /api/admin/bootstrap` — admin self-bootstrap
  - `GET|POST /api/admin/semester|events|slots` — admin payload validation
  - `POST /api/send-alert-email` — manual review trigger (Firebase ID token gated)
  - `GET /api/attendance-review` — weekly cron (CRON_SECRET gated)
  - Outbound: Nodemailer (SMTP) → user email; native fetch → Telegram Bot API

**Arrows**:
- Client → Firestore (read on auth, debounced merge writes)
- Client → /api/* (admin actions, manual send)
- Vercel cron scheduler → /api/attendance-review every Saturday 15:30 UTC
- /api/attendance-review → Firestore (read all users) → engine compute → Nodemailer + Telegram → Firestore (bump `lastEmailSentAt`)

## Risk Classification Flow (Slide 16 supporting / or separate)

**Layout**: Top-to-bottom flowchart, single column.

1. **Course Data Input**: classesTaken · classesAttended · slotDays · semester-data.json
2. ↓
3. **Slot-Aware Enumeration**: remaining classes · safe skips · recovery probe (cap 300)
4. ↓ (split into two parallel branches)
5. **Branch A — Formula Engine**: weighted composite score (0–100); factors: projection gap, deficit from 75 %, skip buffer, recovery pressure, trend direction → Safe / Warning / Critical
6. **Branch B — CART Decision Tree**: trained on hand-labelled edge cases; catches multi-feature combinations formula misses → Safe / Warning / Critical
7. ↓ (branches converge)
8. **Take the More Cautious Label** (worst-label-wins ensemble): if Formula = Safe and Tree = Warning → output = Warning. Always.
9. ↓
10. **Final Risk Label + Forecast**: shown on dashboard · sent in weekly email & Telegram

## User flow / Workflow (Slide 9)

**Layout**: Two columns side-by-side.

- **Column 1 — Guest path**:
  Landing → Course Selector (3 steps) → Planner (in-memory state, no persistence) → optionally Sign in
- **Column 2 — Signed-in path**:
  Sign in → Dashboard (Exam Horizon + Update Attendance strip) → branches to Planner / Insights / Calendar / Notifications → snapshot writes auto-debounced to Firestore → weekly cron delivers alerts

Below both columns, a horizontal **Saturday cron pipeline** strip:
- Vercel scheduler triggers → /api/attendance-review → user iteration (batches of 6) → engine compute per user → email + Telegram delivery → bump `lastEmailSentAt`

## UML — class / module diagram (optional supplemental)

**Key entities** (rectangles with field lists):

- `User` (Firestore doc): uid · name · email · role · selectedYear · selectedCredit · selectedSlot · slotDays · courses · attendanceSnapshots · alertEnabled · alertThreshold · weeklySummaryEnabled · notificationChannels · adminDraft · theme
- `Course`: id · courseName · slotLabel · slotDays · credit · classesTaken · classesAttended · skippedDates · missedDates · cancelledDates · lastUpdated
- `AttendanceSnapshot`: id · courseId · attendancePercentage · classesTaken · classesAttended · riskScore · riskLabel · createdAt
- `Analytics` (computed): currentAttendance · projectedAttendance · remainingClasses · remainingSkips · recoveryClassesNeeded · isRecoveryImpossible · riskScore · riskLabel · formulaLabel · classifierLabel · classifierFeatures · riskBreakdown · trend · forecast · daysLeft · plannedSkipCount · recommendation
- `Forecast`: ready · sampleSize · smoothedCurrent · predicted · low · high · slopePerDay · stdError
- `RiskBreakdown`: projectionPenalty · thresholdDeficitPenalty · skipBufferPenalty · recoveryPenalty · plannedSkipPenalty · trendAdjustment

**Relations**:
- User 1—* Course
- User 1—* AttendanceSnapshot
- AttendanceSnapshot *—1 Course
- Analytics computed from (Course + Semester + AttendanceSnapshot[])

---

# CHEAT SHEET (the night before the defense)

- Open with the **problem**, not the title
- Land the line: *"VTOP shows what happened. This shows what will happen."*
- Demo Live: Dashboard → Update Attendance strip → Why this verdict panel → Forecast → Insights
- For ML defense: *trend awareness + classification + uncertainty*. Repeat verbatim if challenged.
- Acknowledge limitations openly — small training set, no VTOP scrape, opt-in per-day data — frame each as a *deliberate scoping choice with reasoning*
- Real-usage analytics > theoretical argument. Lead the Results section with adoption numbers
- Close with the Telegram alert demo if you have time — it's the most "this is real" moment

Good luck.
