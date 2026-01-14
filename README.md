# VIT AP Attendance Planner

A smart attendance tracking tool built for VIT-AP students to stay on top of the 75% attendance requirement without the mental math.

Planning your bunk days has never been easier.

## What It Does

This planner helps you track attendance across all your courses and shows you exactly how many classes you can afford to skip (or need to attend) to stay above the 75% threshold. It handles VIT-AP's unique slot-based scheduling system with 47 different course combinations and automatically accounts for holidays, exams, and other non-class days.

No more guessing. No more manual calculations. Just honest numbers.

## Features

- **Real-time attendance tracking** – Enter your current attendance and see your percentage instantly
- **Smart projections** – Calculates how many more classes you need to hit 75% or how many you can safely skip
- **Academic calendar integration** – Automatically excludes holidays, exam days, and breaks from calculations
- **Interactive calendar view** – Visual month-by-month breakdown showing class days, skipped dates, and important events
- **Slot-based scheduling** – Supports all 47 VIT-AP course slot combinations from the official timetable
- **Dark mode** – Because we're all coding (or bunking) late at night anyway
- **Responsive design** – Works on your phone when you're deciding whether to attend that 8 AM class

## Tech Stack

- React with Vite for fast builds
- Tailwind CSS for styling
- Vercel for hosting
- Vanilla JavaScript for calculations

## Project Structure

```
vit-ap-attendance-planner/
├── src/
│   ├── components/
│   │   ├── LiveClock.jsx
│   │   ├── ThemeToggle.jsx
│   │   ├── InfoCard.jsx
│   │   ├── AttendanceGauge.jsx
│   │   ├── CalendarPlanner.jsx
│   │   ├── PlannerView.jsx
│   │   └── DashboardView.jsx
│   ├── data/
│   │   ├── academicCalendar.js
│   │   ├── slotTimings.js
│   │   └── constants.js
│   ├── utils/
│   │   ├── dateUtils.js
│   │   └── calculationUtils.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Getting Started

Clone the repo and install dependencies:

```bash
git clone https://github.com/Ralblast/vit-ap-attendance-planner
cd vit-ap-attendance-planner
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## How to Use

1. Add your courses with their respective slots
2. Enter current attendance (classes attended / total classes)
3. View your attendance percentage and projections
4. Check the calendar to plan which days you can skip
5. Stay above 75% and avoid that awkward conversation with your faculty advisor

## Why I Built This

During my time at VIT-AP, I got tired of manually calculating whether I could skip another class without dropping below 75%. The slot system made it even more confusing because different courses have different schedules.

So I built this tool to solve my own problem. Turns out 1,000+ other students had the same problem.

## Lessons Learned

- Handling edge cases in date calculations is harder than it looks
- Users will always find ways to break your assumptions about "valid input"
- A clean UI matters more than fancy features
- Testing with real semester data caught bugs that unit tests missed

## Upcoming Features:

- Browser extension for auto-fetching attendance from VTOP
- Multi-semester tracking
- Attendance trend analysis
- WhatsApp/email notifications when attendance drops near 75%

## Contributing

Found a bug or have a feature idea? Open an issue or submit a PR. This project is for students, by students.

## Disclaimer

This tool is not affiliated with VIT-AP University. Attendance data is stored locally in your browser. Always verify your official attendance on VTOP before making any decisions.

Use at your own risk. I'm not responsible if you miscalculate and get debarred.

## License

MIT License - do whatever you want with this code, just don't blame me if things go wrong.

---

Built with passion by a fellow VIT-AP student who had semesters with too many classes.
