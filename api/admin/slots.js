import { readJsonBody, requireMethod } from '../lib/http.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST'])) {
    return;
  }

  if (request.method === 'GET') {
    return response.status(200).json({
      ok: true,
      message: 'Use POST to validate slot mappings before saving them in Firestore.',
    });
  }

  const body = await readJsonBody(request);
  const slotMapping = {
    id: body.id || `slot-map-${Date.now()}`,
    year: body.year || '',
    credit: body.credit || '',
    slots: Array.isArray(body.slots) ? body.slots : [],
    slotDays: body.slotDays && typeof body.slotDays === 'object' ? body.slotDays : {},
    updatedAt: new Date().toISOString(),
  };

  return response.status(200).json({ ok: true, slotMapping });
}
