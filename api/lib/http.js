export const readJsonBody = request =>
  new Promise(resolve => {
    if (request.body && typeof request.body === 'object') {
      resolve(request.body);
      return;
    }

    if (typeof request.body === 'string') {
      try {
        resolve(JSON.parse(request.body));
      } catch {
        resolve({});
      }
      return;
    }

    let rawBody = '';
    request.on('data', chunk => {
      rawBody += chunk;
    });
    request.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        resolve({});
      }
    });
  });

export const sendMethodNotAllowed = (response, methods = ['POST']) => {
  response.setHeader('Allow', methods.join(', '));
  return response.status(405).json({ ok: false, error: 'Method not allowed.' });
};

export const requireMethod = (request, response, methods = ['POST']) => {
  if (!methods.includes(request.method)) {
    sendMethodNotAllowed(response, methods);
    return false;
  }

  return true;
};

export const verifyFirebaseToken = async (idToken) => {
  if (!idToken) return null;
  try {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) return null;
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) {
      return data.users[0];
    }
  } catch (e) {
    console.error('Token verification failed:', e);
  }
  return null;
};
