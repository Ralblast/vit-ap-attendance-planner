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
      message: 'Use POST to validate slot mappings before saving them in Firestore.',
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

  const slotMapping = {
    id: body.id || `slot-map-${Date.now()}`,
    year: String(body.year || '').slice(0, 40),
    credit: String(body.credit || '').slice(0, 40),
    slots: Array.isArray(body.slots) ? body.slots.slice(0, 200) : [],
    slotDays: body.slotDays && typeof body.slotDays === 'object' ? body.slotDays : {},
    updatedAt: new Date().toISOString(),
  };

  response.status(200).json({ ok: true, slotMapping });
}
