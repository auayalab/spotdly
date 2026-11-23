import { VIBES, TIMES, BUDGETS, DRINKS, LIMITS } from './constants.js';
import { DomainError } from './errors.js';

const unique = (arr) => [...new Set(arr)];

export function cleanText(value, maxLength, field) {
  if (typeof value !== 'string') throw new DomainError(400, 'invalid_input', `${field} es obligatorio`);
  // colapsa espacios y quita caracteres de control
  const text = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) throw new DomainError(400, 'invalid_input', `${field} es obligatorio`);
  return text.slice(0, maxLength);
}

export function cleanName(value) {
  return cleanText(value, LIMITS.maxNameLength, 'El nombre');
}

function subset(value, allowed, field, { min = 0, max = allowed.length } = {}) {
  if (!Array.isArray(value)) throw new DomainError(400, 'invalid_prefs', `${field} debe ser una lista`);
  const items = unique(value);
  if (items.some((v) => !allowed.includes(v))) {
    throw new DomainError(400, 'invalid_prefs', `${field} tiene un valor no válido`);
  }
  if (items.length < min || items.length > max) {
    throw new DomainError(400, 'invalid_prefs', `${field}: elige entre ${min} y ${max}`);
  }
  return items;
}

/** Valida y normaliza las preferencias. Devuelve un objeto nuevo y limpio. */
export function validatePrefs(raw) {
  if (!raw || typeof raw !== 'object') throw new DomainError(400, 'invalid_prefs', 'Faltan las preferencias');

  const vibes = subset(raw.vibes, VIBES, 'Vibe', { min: 1, max: LIMITS.maxVibes });
  const vetoes = subset(raw.vetoes ?? [], VIBES, 'Veto', { max: LIMITS.maxVetoes });
  const times = subset(raw.times ?? [], TIMES, 'Horario');

  if (vetoes.some((v) => vibes.includes(v))) {
    throw new DomainError(400, 'invalid_prefs', 'No puedes vetar algo que también elegiste');
  }

  const budget = Number(raw.budget);
  if (!BUDGETS.includes(budget)) throw new DomainError(400, 'invalid_prefs', 'Presupuesto no válido');

  if (!DRINKS.includes(raw.drink)) throw new DomainError(400, 'invalid_prefs', 'Elige tu Pepsi');

  return { vibes, vetoes, times, budget, drink: raw.drink };
}
