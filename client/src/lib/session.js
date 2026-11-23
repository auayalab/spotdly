// Sesión por sala en localStorage: { id, token, name, prefs, vote }.
// Es lo que permite recargar la página o volver más tarde sin duplicarse.
// Envuelto en try/catch: en modo privado de algunos navegadores localStorage falla.

const key = (roomId) => `spotdly:room:${roomId}`;
const memory = new Map(); // respaldo si localStorage no está disponible

export function loadSession(roomId) {
  try {
    const raw = window.localStorage.getItem(key(roomId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* sin acceso a storage */
  }
  return memory.get(roomId) ?? null;
}

export function saveSession(roomId, patch) {
  const next = { ...(loadSession(roomId) ?? {}), ...patch };
  memory.set(roomId, next);
  try {
    window.localStorage.setItem(key(roomId), JSON.stringify(next));
  } catch {
    /* se queda solo en memoria */
  }
  return next;
}

// Recordar el último nombre usado para no pedirlo en cada plan
export function lastName() {
  try {
    return window.localStorage.getItem('spotdly:name') ?? '';
  } catch {
    return '';
  }
}

export function rememberName(name) {
  try {
    window.localStorage.setItem('spotdly:name', name);
  } catch {
    /* ignorar */
  }
}
