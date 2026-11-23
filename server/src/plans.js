// Catálogo de planes de ejemplo (simula un servicio externo de eventos/lugares).
import { readFileSync } from 'node:fs';

const url = new URL('../data/plans.json', import.meta.url);
export const plans = JSON.parse(readFileSync(url, 'utf8'));
