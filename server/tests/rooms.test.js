import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoom,
  joinRoom,
  submitPrefs,
  closeVoting,
  voteChallenge,
  forceResolveChallenge,
  reopenVoting,
  publicView,
} from '../src/rooms.js';
import { MemoryStore } from '../src/store.js';
import { plans } from '../src/plans.js';

const prefs = (over = {}) => ({ vibes: ['playa'], vetoes: [], times: [], budget: 2, drink: 'pepsi', ...over });

function setup() {
  const { room, participant: host } = createRoom({ title: 'Sábado', hostName: 'Ana' });
  return { room, host };
}

test('recargar con el mismo token no duplica al participante', () => {
  const { room } = setup();
  const first = joinRoom(room, { name: 'Beto' });
  const again = joinRoom(room, { name: 'Beto', token: first.participant.token });
  assert.equal(again.rejoined, true);
  assert.equal(again.participant.id, first.participant.id);
  assert.equal(Object.keys(room.participants).length, 2);
});

test('enviar preferencias dos veces reemplaza, no suma', () => {
  const { room, host } = setup();
  submitPrefs(room, { token: host.token, prefs: prefs() });
  const v = room.version;
  submitPrefs(room, { token: host.token, prefs: prefs() }); // doble tap idéntico
  assert.equal(room.version, v, 'un envío idéntico no genera cambio');
  submitPrefs(room, { token: host.token, prefs: prefs({ vibes: ['fiesta'] }) });
  assert.deepEqual(room.participants[host.id].prefs.vibes, ['fiesta']);
  const ready = publicView(room, plans).participants.filter((p) => p.ready);
  assert.equal(ready.length, 1);
});

test('solo el anfitrión cierra la votación', () => {
  const { room, host } = setup();
  const { participant: beto } = joinRoom(room, { name: 'Beto' });
  submitPrefs(room, { token: beto.token, prefs: prefs() });
  assert.throws(() => closeVoting(room, { token: beto.token, plans }), { code: 'not_host' });
  closeVoting(room, { token: host.token, plans });
  assert.equal(room.status, 'decided');
});

test('no se puede cerrar si nadie respondió', () => {
  const { room, host } = setup();
  assert.throws(() => closeVoting(room, { token: host.token, plans }), { code: 'no_votes' });
});

test('quien llega tarde puede entrar y ver el resultado, pero no votar', () => {
  const { room, host } = setup();
  submitPrefs(room, { token: host.token, prefs: prefs() });
  closeVoting(room, { token: host.token, plans });
  const { participant: late } = joinRoom(room, { name: 'Tardío' });
  assert.throws(() => submitPrefs(room, { token: late.token, prefs: prefs() }), { code: 'voting_closed' });
  assert.ok(publicView(room, plans).result.winner.plan.name);
  // el anfitrión reabre y ya puede votar
  reopenVoting(room, { token: host.token });
  submitPrefs(room, { token: late.token, prefs: prefs() });
  assert.equal(room.status, 'voting');
});

test('Pepsi Challenge: se resuelve solo cuando votan todos', () => {
  const { room, host } = setup();
  const { participant: beto } = joinRoom(room, { name: 'Beto' });
  submitPrefs(room, { token: host.token, prefs: prefs({ vibes: ['playa'], budget: 1 }) });
  submitPrefs(room, { token: beto.token, prefs: prefs({ vibes: ['cultura'], budget: 1 }) });
  closeVoting(room, { token: host.token, plans });
  assert.equal(room.status, 'challenge');
  const optionB = room.challenge.candidates[1].planId;

  voteChallenge(room, { token: host.token, choice: 'b', plans });
  assert.equal(room.status, 'challenge');
  voteChallenge(room, { token: host.token, choice: 'b', plans }); // repetido: sin efecto
  voteChallenge(room, { token: beto.token, choice: 'b', plans });
  assert.equal(room.status, 'decided');
  assert.equal(room.result.decidedBy, 'challenge');
  assert.deepEqual(room.result.tally, { a: 0, b: 2 });
  assert.equal(room.result.winner.planId, optionB);
});

test('el anfitrión puede resolver el challenge sin esperar', () => {
  const { room, host } = setup();
  const { participant: beto } = joinRoom(room, { name: 'Beto' });
  submitPrefs(room, { token: host.token, prefs: prefs({ vibes: ['playa'], budget: 1 }) });
  submitPrefs(room, { token: beto.token, prefs: prefs({ vibes: ['cultura'], budget: 1 }) });
  closeVoting(room, { token: host.token, plans });
  voteChallenge(room, { token: beto.token, choice: 'a', plans });
  forceResolveChallenge(room, { token: host.token, plans });
  assert.equal(room.status, 'decided');
});

test('la vista pública nunca expone tokens ni respuestas individuales', () => {
  const { room, host } = setup();
  submitPrefs(room, { token: host.token, prefs: prefs({ drink: 'zero' }) });
  const json = JSON.stringify(publicView(room, plans));
  assert.ok(!json.includes(host.token));
  assert.ok(!json.includes('"vetoes"'));
});

test('valida entradas: vibe vacío, veto que contradice, bebida inválida', () => {
  const { room, host } = setup();
  const bad = [prefs({ vibes: [] }), prefs({ vetoes: ['playa'] }), prefs({ drink: 'cola' }), prefs({ budget: 9 })];
  for (const p of bad) {
    assert.throws(() => submitPrefs(room, { token: host.token, prefs: p }), { status: 400 });
  }
  assert.throws(() => submitPrefs(room, { token: 'falso', prefs: prefs() }), { status: 401 });
});

test('el store borra salas inactivas', () => {
  let now = 0;
  const store = new MemoryStore({ ttlMs: 1000, now: () => now });
  const { room } = createRoom({ hostName: 'Ana' }, { now: () => now });
  store.insert(room);
  now = 2000;
  assert.equal(store.sweep(), 1);
  assert.throws(() => store.get(room.id), { status: 404 });
});
