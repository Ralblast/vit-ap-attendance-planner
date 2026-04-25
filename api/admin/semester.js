import { readJsonBody, requireMethod } from '../lib/http.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST'])) {
    return;
  }

  if (request.method === 'GET') {
    return response.status(200).json({
      ok: true,
      message: 'Use POST to validate and preview semester updates before saving them in Firestore.',
    });
  }

  const body = await readJsonBody(request);
  const semester = {
    id: body.id || `semester-${Date.now()}`,
    name: body.name || 'Active Semester',
    startDate: body.startDate || '',
    lastInstructionalDay: body.lastInstructionalDay || '',
    minAttendance: Number(body.minAttendance || 75),
    isActive: body.isActive !== false,
    updatedAt: new Date().toISOString(),
  };

  return response.status(200).json({ ok: true, semester });
}
