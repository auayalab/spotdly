// Catálogos compartidos por la validación y el algoritmo de recomendación.

export const VIBES = ['playa', 'fiesta', 'comida', 'cultura', 'deporte', 'chill'];

export const VIBE_LABELS = {
  playa: 'playa / aire libre',
  fiesta: 'fiesta',
  comida: 'comida',
  cultura: 'arte y cultura',
  deporte: 'deporte',
  chill: 'algo chill',
};

export const TIMES = ['dia', 'tarde', 'noche'];

// Presupuesto máximo por persona: 1 = $, 2 = $$, 3 = $$$
export const BUDGETS = [1, 2, 3];

export const DRINKS = ['pepsi', 'zero', 'cherry'];

export const DRINK_LABELS = {
  pepsi: 'Pepsi',
  zero: 'Pepsi Zero Sugar',
  cherry: 'Pepsi Wild Cherry',
};

export const LIMITS = {
  maxParticipants: 20,
  maxNameLength: 30,
  maxTitleLength: 60,
  maxVibes: 2,
  maxVetoes: 1,
  roomTtlMs: 48 * 60 * 60 * 1000,
};

// Diferencia máxima de puntos entre el 1.º y 2.º lugar para considerarlo empate
// y activar el "Pepsi Challenge" (votación a ciegas entre los dos finalistas).
export const TIE_THRESHOLD = 1;
