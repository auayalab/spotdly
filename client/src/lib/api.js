// Cliente de la API. Las operaciones idempotentes (guardar preferencias, votar)
// se reintentan una vez si falla la red: como el servidor hace upsert, repetirlas es seguro.

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, url, body, { retry = false } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (retry) {
      await new Promise((r) => setTimeout(r, 800));
      return request(method, url, body, { retry: false });
    }
    throw new ApiError('Sin conexión. Revisa tu señal e intenta de nuevo.', { status: 0, code: 'network' });
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  if (!res.ok) {
    throw new ApiError(data?.message || 'Algo salió mal', { status: res.status, code: data?.error });
  }
  return data;
}

const room = (id) => `/api/rooms/${encodeURIComponent(id)}`;

export const api = {
  createRoom: (title, name) => request('POST', '/api/rooms', { title, name }),
  getRoom: (id) => request('GET', room(id)),
  join: (id, name, token) => request('POST', `${room(id)}/join`, { name, token }),
  savePrefs: (id, token, prefs) => request('PUT', `${room(id)}/prefs`, { token, prefs }, { retry: true }),
  close: (id, token) => request('POST', `${room(id)}/close`, { token }),
  voteChallenge: (id, token, choice) => request('POST', `${room(id)}/challenge`, { token, choice }, { retry: true }),
  resolveChallenge: (id, token) => request('POST', `${room(id)}/challenge/resolve`, { token }),
  reopen: (id, token) => request('POST', `${room(id)}/reopen`, { token }),
};
