import { readJsonBody, requireAdmin, requireMethod } from '../lib/http.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST'])) {
    return;
  }

  const admin = await requireAdmin(request, response);
  if (!admin) {
    return;
  }

  if (request.method === 'GET') {
    response.status(200).json({
      ok: true,
      message: 'Use POST to validate and preview semester updates before saving them in Firestore.',
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    response.status(413).json({ ok: false, error: 'Payload too large.' });
    return;
  }

  const semester = {
    id: body.id || `semester-${Date.now()}`,
    name: String(body.name || 'Active Semester').slice(0, 120),
    startDate: body.startDate || '',
    lastInstructionalDay: body.lastInstructionalDay || '',
    minAttendance: Number(body.minAttendance || 75),
    isActive: body.isActive !== false,
    updatedAt: new Date().toISOString(),
  };

  response.status(200).json({ ok: true, semester });
}
