import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, rankPlans, scorePlan, resolveChallenge, buildCooler } from '../src/recommend.js';

const plans = [
  { id: 'beach', vibe: 'playa', price: 1, time: 'dia' },
  { id: 'rooftop', vibe: 'fiesta', price: 3, time: 'noche' },
  { id: 'tacos', vibe: 'comida', price: 2, time: 'noche' },
  { id: 'museum', vibe: 'cultura', price: 2, time: 'dia' },
];

const person = (name, prefs) => ({
  name,
  prefs: { vibes: [], vetoes: [], times: [], budget: 3, drink: 'pepsi', ...prefs },
});

test('el plan ganador refleja lo que eligió la mayoría', () => {
  const group = [
    person('Ana', { vibes: ['playa'], budget: 1, times: ['dia'] }),
    person('Beto', { vibes: ['playa', 'comida'], budget: 2 }),
    person('Caro', { vibes: ['fiesta'], budget: 3, times: ['noche'] }),
  ];
  const out = recommend(plans, group);
  assert.equal(out.kind, 'decided');
  assert.equal(out.winner.planId, 'beach');
  assert.deepEqual(out.winner.vibeFans, ['Ana', 'Beto']);
  assert.ok(out.reasons.includes('2 de 3 querían playa / aire libre'));
  assert.ok(out.reasons.includes('Entra en el presupuesto de todos'));
});

test('un veto saca al plan aunque tenga más puntos', () => {
  const group = [
    person('Ana', { vibes: ['fiesta'] }),
    person('Beto', { vibes: ['fiesta'] }),
    person('Caro', { vibes: ['comida'], vetoes: ['fiesta'] }),
  ];
  const { ranking } = rankPlans(plans, group);
  assert.ok(!ranking.some((r) => r.planId === 'rooftop'));
  assert.equal(recommend(plans, group).winner.planId, 'tacos');
});

test('si todo está vetado, gana el menos vetado (nunca se queda sin resultado)', () => {
  const tiny = [plans[0], plans[1]];
  const group = [
    person('Ana', { vibes: ['comida'], vetoes: ['playa'] }),
    person('Beto', { vibes: ['comida'], vetoes: ['fiesta'] }),
    person('Caro', { vibes: ['comida'], vetoes: ['fiesta'] }),
  ];
  const out = recommend(tiny, group);
  assert.equal(out.kind, 'decided');
  assert.equal(out.winner.planId, 'beach');
  assert.ok(out.reasons.some((r) => r.includes('menos vetado')));
});

test('pasarse del presupuesto resta puntos por cada nivel', () => {
  const ana = person('Ana', { vibes: ['fiesta'], budget: 1 });
  const s = scorePlan(plans[1], [ana]); // rooftop $$$ vs presupuesto $
  // vibe +3, presupuesto -2*2, horario libre +1
  assert.equal(s.score, 3 - 4 + 1);
  assert.deepEqual(s.overBudget, ['Ana']);
});

test('empate cerrado entre los dos primeros activa el Pepsi Challenge', () => {
  const group = [person('Ana', { vibes: ['playa'] }), person('Beto', { vibes: ['cultura'] })];
  const out = recommend(plans, group);
  assert.equal(out.kind, 'tie');
  assert.deepEqual(out.candidates.map((c) => c.planId).sort(), ['beach', 'museum']);
});

test('con una sola persona no hay challenge', () => {
  const out = recommend(plans, [person('Ana', { vibes: ['playa', 'cultura'] })]);
  assert.equal(out.kind, 'decided');
});

test('el resultado es determinista: mismo input, mismo orden', () => {
  const group = [person('Ana', { vibes: ['comida'] }), person('Beto', { vibes: ['cultura'] })];
  const a = rankPlans(plans, group).ranking.map((r) => r.planId);
  const b = rankPlans([...plans].reverse(), [...group].reverse()).ranking.map((r) => r.planId);
  assert.deepEqual(a, b);
});

test('participantes sin respuesta no cuentan', () => {
  const group = [person('Ana', { vibes: ['playa'] }), { name: 'Tarde', prefs: null }];
  const out = recommend(plans, group);
  assert.ok(out.reasons.includes('1 de 1 querían playa / aire libre'));
  assert.equal(recommend(plans, [{ name: 'X', prefs: null }]).kind, 'empty');
});

test('challenge: gana la mayoría; si empatan gana A', () => {
  assert.equal(resolveChallenge([], { p1: 'b', p2: 'b', p3: 'a' }).winnerIndex, 1);
  assert.equal(resolveChallenge([], { p1: 'a', p2: 'b' }).winnerIndex, 0);
  assert.equal(resolveChallenge([], {}).winnerIndex, 0);
});

test('la hielera suma la Pepsi de cada quien', () => {
  const cooler = buildCooler([
    person('Ana', { drink: 'zero' }),
    person('Beto', { drink: 'zero' }),
    person('Caro', { drink: 'cherry' }),
    { name: 'Sin voto', prefs: null },
  ]);
  assert.deepEqual(cooler, { pepsi: 0, zero: 2, cherry: 1 });
});
