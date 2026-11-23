// Lógica pura de recomendación: recibe planes y participantes, devuelve un resultado.
// No toca red, base de datos ni sockets, para poder probarla de forma aislada.

import { VIBE_LABELS, TIE_THRESHOLD, DRINKS } from './constants.js';

export const WEIGHTS = {
  vibe: 3, // el plan es del "vibe" que la persona eligió
  budgetOk: 2, // el plan entra en su presupuesto
  budgetOverPerLevel: -2, // por cada nivel de $ que se pasa
  time: 1, // el horario le queda
};

/** Puntúa un plan contra las preferencias de un grupo. */
export function scorePlan(plan, voters) {
  let score = 0;
  const vibeFans = [];
  const overBudget = [];
  const vetoedBy = [];
  let timeOk = 0;

  for (const voter of voters) {
    const prefs = voter.prefs;
    if (prefs.vetoes.includes(plan.vibe)) vetoedBy.push(voter.name);

    if (prefs.vibes.includes(plan.vibe)) {
      score += WEIGHTS.vibe;
      vibeFans.push(voter.name);
    }

    if (plan.price <= prefs.budget) {
      score += WEIGHTS.budgetOk;
    } else {
      score += WEIGHTS.budgetOverPerLevel * (plan.price - prefs.budget);
      overBudget.push(voter.name);
    }

    // Sin horario marcado = "me da igual"
    if (prefs.times.length === 0 || prefs.times.includes(plan.time)) {
      score += WEIGHTS.time;
      timeOk += 1;
    }
  }

  return { planId: plan.id, score, vibeFans, overBudget, vetoedBy, timeOk };
}

/**
 * Ordena los planes de mejor a peor.
 * - Un veto excluye el plan. Si TODOS los planes tienen veto, se usan todos
 *   y gana el menos vetado (el grupo nunca se queda sin resultado).
 * - Desempates deterministas: puntos > menos gente fuera de presupuesto >
 *   más fans del vibe > id del plan (orden alfabético).
 */
export function rankPlans(plans, participants) {
  const voters = participants.filter((p) => p.prefs);
  const scored = plans.map((plan) => scorePlan(plan, voters));
  const allVetoed = scored.length > 0 && scored.every((s) => s.vetoedBy.length > 0);
  const eligible = allVetoed ? scored : scored.filter((s) => s.vetoedBy.length === 0);

  eligible.sort(
    (a, b) =>
      (allVetoed ? a.vetoedBy.length - b.vetoedBy.length : 0) ||
      b.score - a.score ||
      a.overBudget.length - b.overBudget.length ||
      b.vibeFans.length - a.vibeFans.length ||
      a.planId.localeCompare(b.planId),
  );

  return { ranking: eligible, allVetoed, voterCount: voters.length };
}

/** Cuántas latas de cada Pepsi pidió el grupo. */
export function buildCooler(participants) {
  const cooler = Object.fromEntries(DRINKS.map((d) => [d, 0]));
  for (const p of participants) {
    if (p.prefs && cooler[p.prefs.drink] !== undefined) cooler[p.prefs.drink] += 1;
  }
  return cooler;
}

/** Frases que explican por qué ganó un plan. */
export function explain(entry, plan, voterCount, allVetoed) {
  const reasons = [];
  if (entry.vibeFans.length > 0) {
    reasons.push(`${entry.vibeFans.length} de ${voterCount} querían ${VIBE_LABELS[plan.vibe]}`);
  }
  if (entry.overBudget.length === 0) {
    reasons.push('Entra en el presupuesto de todos');
  } else {
    reasons.push(`Se pasa un poco del presupuesto de ${entry.overBudget.join(', ')}`);
  }
  if (entry.timeOk === voterCount) reasons.push('El horario le queda a todo el grupo');
  if (allVetoed) {
    reasons.push('Todos los planes tenían algún veto; este fue el menos vetado');
  } else {
    reasons.push('Nadie lo vetó');
  }
  return reasons;
}

/**
 * Resultado de la votación.
 * - { kind: 'empty' } si nadie ha respondido.
 * - { kind: 'tie', candidates: [a, b] } si los dos primeros están a TIE_THRESHOLD
 *   puntos o menos (y hay al menos 2 votantes): se resuelve con el Pepsi Challenge.
 * - { kind: 'decided', winner, runnerUp, reasons, cooler } en otro caso.
 */
export function recommend(plans, participants, { tieThreshold = TIE_THRESHOLD } = {}) {
  const { ranking, allVetoed, voterCount } = rankPlans(plans, participants);
  if (voterCount === 0 || ranking.length === 0) return { kind: 'empty' };

  const [first, second] = ranking;
  const byId = (id) => plans.find((p) => p.id === id);

  if (second && voterCount >= 2 && !allVetoed && first.score - second.score <= tieThreshold) {
    return { kind: 'tie', candidates: [first, second] };
  }

  return decided(first, second, byId, voterCount, allVetoed, participants);
}

export function decided(first, second, byId, voterCount, allVetoed, participants) {
  return {
    kind: 'decided',
    winner: first,
    runnerUp: second ?? null,
    reasons: explain(first, byId(first.planId), voterCount, allVetoed),
    cooler: buildCooler(participants),
  };
}

/**
 * Resuelve el Pepsi Challenge. votes: { [participantId]: 'a' | 'b' }.
 * Gana la mayoría; si empatan, gana el candidato A (el que iba arriba en puntos).
 */
export function resolveChallenge(candidates, votes) {
  let a = 0;
  let b = 0;
  for (const choice of Object.values(votes)) {
    if (choice === 'a') a += 1;
    else if (choice === 'b') b += 1;
  }
  const winnerIndex = b > a ? 1 : 0;
  return { winnerIndex, tally: { a, b } };
}
