export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  return response.status(200).json({
    ok: true,
    skipped: true,
    message: 'Weekly attendance review route is scaffolded but not wired yet.',
  });
}

