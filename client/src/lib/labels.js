export const VIBES = [
  { id: 'playa', label: 'Playa / aire libre', emoji: '🏖️' },
  { id: 'fiesta', label: 'Fiesta', emoji: '🪩' },
  { id: 'comida', label: 'Comida', emoji: '🌮' },
  { id: 'cultura', label: 'Arte y cultura', emoji: '🎨' },
  { id: 'deporte', label: 'Deporte', emoji: '🏀' },
  { id: 'chill', label: 'Algo chill', emoji: '🎲' },
];

export const TIMES = [
  { id: 'dia', label: 'De día', emoji: '☀️' },
  { id: 'tarde', label: 'En la tarde', emoji: '🌇' },
  { id: 'noche', label: 'De noche', emoji: '🌙' },
];

export const BUDGETS = [
  { id: 1, label: '$', hint: 'Gratis o casi' },
  { id: 2, label: '$$', hint: 'Normalito' },
  { id: 3, label: '$$$', hint: 'Vale la pena' },
];

export const DRINKS = [
  { id: 'pepsi', label: 'Pepsi', hint: 'La clásica', className: 'can-pepsi' },
  { id: 'zero', label: 'Pepsi Zero Sugar', hint: 'Todo el sabor, cero azúcar', className: 'can-zero' },
  { id: 'cherry', label: 'Pepsi Wild Cherry', hint: 'Con un toque de cereza', className: 'can-cherry' },
];

export const drinkLabel = (id) => DRINKS.find((d) => d.id === id)?.label ?? id;
export const timeLabel = (id) => TIMES.find((t) => t.id === id)?.label ?? id;
export const priceLabel = (n) => '$'.repeat(n);
