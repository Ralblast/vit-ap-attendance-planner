import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cached = null;

export const loadSemesterData = () => {
  if (cached) {
    return cached;
  }

  const candidatePaths = [
    path.resolve(__dirname, '../../public/semester-data.json'),
    path.resolve(process.cwd(), 'public/semester-data.json'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, 'utf8');
      cached = JSON.parse(raw);
      return cached;
    }
  }

  console.warn('Semester data file not found, using empty fallback.');
  cached = { academicCalendar: [], lastInstructionalDay: '', slotsByYear: {} };
  return cached;
};
