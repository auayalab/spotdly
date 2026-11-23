// Reglas de una sala ("plan"). Funciones síncronas que validan primero y luego
// modifican la sala; cada cambio sube `version` para que los clientes puedan
// descartar estados viejos que lleguen fuera de orden.

import crypto from 'node:crypto';
import { LIMITS } from './constants.js';
import { DomainError } from './errors.js';
import { cleanName, cleanText, validatePrefs } from './validate.js';
import { recommend, resolveChallenge, explain, buildCooler } from './recommend.js';

const defaults = {
  now: () => Date.now(),
  roomId: () => crypto.randomBytes(6).toString('base64url'), // 8 caracteres, ~2.8e14 combinaciones
  participantId: () => crypto.randomUUID(),
  token: () => crypto.randomBytes(24).toString('base64url'), // secreto, nunca se publica
};

function touch(room, env) {
  room.version += 1;
  room.updatedAt = env.now();
}

/** Encuentra al participante dueño del token o lanza 401. */
export function authenticate(room, token) {
  if (typeof token !== 'string' || !token) throw new DomainError(401, 'no_token', 'Únete al plan primero');
  const participant = Object.values(room.participants).find((p) => p.token === token);
  if (!participant) throw new DomainError(401, 'bad_token', 'No reconocemos tu sesión en este plan');
  return participant;
}

function requireHost(room, token) {
  const participant = authenticate(room, token);
  if (participant.id !== room.hostId) throw new DomainError(403, 'not_host', 'Solo quien creó el plan puede hacer esto');
  return participant;
}

/** Crea una sala con su anfitrión ya dentro. */
export function createRoom({ title, hostName }, env = defaults) {
  env = { ...defaults, ...env };
  const name = cleanName(hostName);
  const cleanTitle = title ? cleanText(title, LIMITS.maxTitleLength, 'El nombre del plan') : `El plan de ${name}`;
  const now = env.now();
  const host = { id: env.participantId(), name, token: env.token(), joinedAt: now, prefs: null, prefsAt: null };

  const room = {
    id: env.roomId(),
    title: cleanTitle,
    hostId: host.id,
    status: 'voting', // voting -> (challenge) -> decided
    createdAt: now,
    updatedAt: now,
    version: 1,
    participants: { [host.id]: host },
    challenge: null,
    result: null,
  };
  return { room, participant: host };
}

/**
 * Unirse o volver a entrar.
 * - Con un token válido es la misma persona que regresa (recargó, cambió de pestaña):
 *   no se duplica, solo se actualiza el nombre si cambió.
 * - Sin token se crea un participante nuevo. Se permite en cualquier estado:
 *   quien llega tarde a un plan ya decidido puede ver el resultado y apuntarse.
 */
export function joinRoom(room, { name, token }, env = defaults) {
  env = { ...defaults, ...env };

  if (token) {
    const existing = Object.values(room.participants).find((p) => p.token === token);
    if (existing) {
      if (name) {
        const clean = cleanName(name);
        if (clean !== existing.name) {
          existing.name = clean;
          touch(room, env);
        }
      }
      return { participant: existing, rejoined: true };
    }
  }

  const clean = cleanName(name);
  if (Object.keys(room.participants).length >= LIMITS.maxParticipants) {
    throw new DomainError(409, 'room_full', 'Este plan ya está lleno');
  }
  const participant = {
    id: env.participantId(),
    name: clean,
    token: env.token(),
    joinedAt: env.now(),
    prefs: null,
    prefsAt: null,
  };
  room.participants[participant.id] = participant;
  touch(room, env);
  return { participant, rejoined: false };
}

/**
 * Guardar preferencias. Es un upsert por participante: enviar dos veces
 * (doble tap, reintento por mala señal) reemplaza la respuesta, no la suma.
 */
export function submitPrefs(room, { token, prefs }, env = defaults) {
  env = { ...defaults, ...env };
  const participant = authenticate(room, token);
  if (room.status !== 'voting') {
    throw new DomainError(409, 'voting_closed', 'La votación ya cerró. Pide al anfitrión que la reabra.');
  }
  const clean = validatePrefs(prefs);
  const same = participant.prefs && JSON.stringify(participant.prefs) === JSON.stringify(clean);
  if (!same) {
    participant.prefs = clean;
    participant.prefsAt = env.now();
    touch(room, env);
  }
  return participant;
}

/** El anfitrión cierra la votación: se decide o se pasa al Pepsi Challenge. */
export function closeVoting(room, { token, plans }, env = defaults) {
  env = { ...defaults, ...env };
  requireHost(room, token);
  if (room.status !== 'voting') throw new DomainError(409, 'not_voting', 'La votación no está abierta');

  const participants = Object.values(room.participants);
  const outcome = recommend(plans, participants);

  if (outcome.kind === 'empty') {
    throw new DomainError(409, 'no_votes', 'Todavía nadie ha respondido');
  }

  if (outcome.kind === 'tie') {
    room.status = 'challenge';
    room.challenge = {
      candidates: outcome.candidates,
      voterCount: participants.filter((p) => p.prefs).length,
      votes: {},
    };
  } else {
    room.status = 'decided';
    room.result = {
      winner: outcome.winner,
      runnerUp: outcome.runnerUp,
      reasons: outcome.reasons,
      cooler: outcome.cooler,
      decidedBy: 'votes',
      tally: null,
    };
  }
  touch(room, env);
  return room;
}

/** Voto a ciegas en el Pepsi Challenge. Upsert: se puede cambiar el voto. */
export function voteChallenge(room, { token, choice, plans }, env = defaults) {
  env = { ...defaults, ...env };
  const participant = authenticate(room, token);
  if (room.status !== 'challenge') throw new DomainError(409, 'no_challenge', 'No hay un Pepsi Challenge activo');
  if (choice !== 'a' && choice !== 'b') throw new DomainError(400, 'invalid_choice', 'Elige A o B');

  if (room.challenge.votes[participant.id] !== choice) {
    room.challenge.votes[participant.id] = choice;
    touch(room, env);
  }

  // Si ya votaron todos los que están en la sala, se resuelve solo.
  const everyone = Object.keys(room.participants);
  if (everyone.every((id) => room.challenge.votes[id])) {
    finishChallenge(room, plans, env);
  }
  return room;
}

/** El anfitrión puede resolver el challenge sin esperar a todos. */
export function forceResolveChallenge(room, { token, plans }, env = defaults) {
  env = { ...defaults, ...env };
  requireHost(room, token);
  if (room.status !== 'challenge') throw new DomainError(409, 'no_challenge', 'No hay un Pepsi Challenge activo');
  finishChallenge(room, plans, env);
  return room;
}

function finishChallenge(room, plans, env) {
  const { candidates, votes, voterCount } = room.challenge;
  const { winnerIndex, tally } = resolveChallenge(candidates, votes);
  const winner = candidates[winnerIndex];
  const runnerUp = candidates[1 - winnerIndex];
  const plan = plans.find((p) => p.id === winner.planId);
  const winnerVotes = winnerIndex === 0 ? tally.a : tally.b;
  const loserVotes = winnerIndex === 0 ? tally.b : tally.a;

  room.status = 'decided';
  room.result = {
    winner,
    runnerUp,
    reasons: [
      winnerVotes === loserVotes
        ? `Empate ${winnerVotes}-${loserVotes} en el Pepsi Challenge: gana el que iba arriba en puntos`
        : `Ganó el Pepsi Challenge ${winnerVotes}-${loserVotes}`,
      ...explain(winner, plan, voterCount, false),
    ],
    cooler: buildCooler(Object.values(room.participants)),
    decidedBy: 'challenge',
    tally,
  };
  touch(room, env);
}

/** El anfitrión reabre la votación (p. ej. llegó alguien tarde y quiere opinar). */
export function reopenVoting(room, { token }, env = defaults) {
  env = { ...defaults, ...env };
  requireHost(room, token);
  if (room.status === 'voting') return room;
  room.status = 'voting';
  room.challenge = null;
  room.result = null;
  touch(room, env);
  return room;
}

/**
 * Lo que ve cualquiera que tenga el enlace. Nunca incluye tokens ni las
 * respuestas individuales (solo si cada quien ya respondió).
 */
export function publicView(room, plans) {
  const planById = (id) => plans.find((p) => p.id === id) ?? null;
  const withPlan = (entry) => (entry ? { ...entry, plan: planById(entry.planId) } : null);

  const participants = Object.values(room.participants)
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({ id: p.id, name: p.name, ready: Boolean(p.prefs), isHost: p.id === room.hostId }));

  return {
    id: room.id,
    title: room.title,
    status: room.status,
    version: room.version,
    hostId: room.hostId,
    createdAt: room.createdAt,
    participants,
    challenge: room.challenge
      ? {
          // A y B se muestran sin puntos: es una votación a ciegas
          options: room.challenge.candidates.map((c) => planById(c.planId)),
          voted: Object.keys(room.challenge.votes),
        }
      : null,
    result: room.result
      ? {
          ...room.result,
          winner: withPlan(room.result.winner),
          runnerUp: withPlan(room.result.runnerUp),
        }
      : null,
  };
}
