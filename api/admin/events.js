import { readJsonBody, requireMethod } from '../lib/http.js';

const VALID_EVENT_TYPES = new Set(['academic', 'holiday', 'exam', 'other']);

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST'])) {
    return;
  }

  if (request.method === 'GET') {
    return response.status(200).json({
      ok: true,
      validTypes: Array.from(VALID_EVENT_TYPES),
      message: 'Use POST to validate academic calendar events.',
    });
  }

  const body = await readJsonBody(request);
  const events = Array.isArray(body.events) ? body.events : [body];
  const normalizedEvents = events.map(event => ({
    id: event.id || `event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    semesterId: event.semesterId || body.semesterId || 'active',
    name: event.name || 'Academic event',
    type: VALID_EVENT_TYPES.has(event.type) ? event.type : 'other',
    date: event.date || '',
    startDate: event.startDate || '',
    endDate: event.endDate || '',
    updatedAt: new Date().toISOString(),
  }));

  return response.status(200).json({ ok: true, events: normalizedEvents });
}
