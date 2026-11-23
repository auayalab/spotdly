// API HTTP + Socket.io.
// - Las acciones (crear, unirse, votar) van por REST: fáciles de probar y de reintentar.
// - Socket.io solo empuja el estado nuevo a todos los que miran la sala.
// - Si un socket se reconecta, vuelve a pedir el estado completo (no depende de eventos perdidos).

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import { Server } from 'socket.io';
import { DomainError } from './errors.js';
import {
  createRoom,
  joinRoom,
  submitPrefs,
  closeVoting,
  voteChallenge,
  forceResolveChallenge,
  reopenVoting,
  publicView,
} from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const ROOM_ID = /^[A-Za-z0-9_-]{6,16}$/;

/** Límite simple por IP en memoria (suficiente para un prototipo). */
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'rate_limited', message: 'Demasiadas peticiones, intenta en un momento' });
    }
    next();
  };
}

export function createServer({ store, plans }) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: false } });

  app.set('trust proxy', 1); // detrás del proxy de Railway, para req.ip
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  const view = (room) => publicView(room, plans);
  const broadcast = (room) => io.to(room.id).emit('room:state', view(room));

  /** Ejecuta una acción sobre una sala, responde y avisa a todos. */
  const roomAction = (fn) => (req, res, next) => {
    try {
      const { id } = req.params;
      if (!ROOM_ID.test(id)) throw new DomainError(404, 'room_not_found', 'Este plan no existe');
      const before = store.get(id).version;
      const extra = store.update(id, (room) => fn(room, req.body ?? {}));
      const room = store.get(id);
      if (room.version !== before) broadcast(room);
      res.json({ room: view(room), ...(extra ?? {}) });
    } catch (err) {
      next(err);
    }
  };

  // --- API ---
  app.get('/healthz', (req, res) => res.json({ ok: true }));

  app.get('/api/plans', (req, res) => res.json({ plans }));

  app.post('/api/rooms', rateLimit({ windowMs: 10 * 60 * 1000, max: 30 }), (req, res, next) => {
    try {
      const { room, participant } = createRoom({ title: req.body?.title, hostName: req.body?.name });
      store.insert(room);
      res.status(201).json({ room: view(room), me: { id: participant.id, token: participant.token } });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/rooms/:id', (req, res, next) => {
    try {
      if (!ROOM_ID.test(req.params.id)) throw new DomainError(404, 'room_not_found', 'Este plan no existe');
      res.json({ room: view(store.get(req.params.id)) });
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/api/rooms/:id/join',
    rateLimit({ windowMs: 60 * 1000, max: 60 }),
    roomAction((room, body) => {
      const { participant, rejoined } = joinRoom(room, { name: body.name, token: body.token });
      return { me: { id: participant.id, token: participant.token }, rejoined };
    }),
  );

  app.put(
    '/api/rooms/:id/prefs',
    roomAction((room, body) => {
      submitPrefs(room, { token: body.token, prefs: body.prefs });
    }),
  );

  app.post(
    '/api/rooms/:id/close',
    roomAction((room, body) => {
      closeVoting(room, { token: body.token, plans });
    }),
  );

  app.post(
    '/api/rooms/:id/challenge',
    roomAction((room, body) => {
      voteChallenge(room, { token: body.token, choice: body.choice, plans });
    }),
  );

  app.post(
    '/api/rooms/:id/challenge/resolve',
    roomAction((room, body) => {
      forceResolveChallenge(room, { token: body.token, plans });
    }),
  );

  app.post(
    '/api/rooms/:id/reopen',
    roomAction((room, body) => {
      reopenVoting(room, { token: body.token });
    }),
  );

  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found', message: 'Ruta no encontrada' }));

  // --- Frontend (build de React) ---
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
    // Cualquier otra ruta (/, /p/abc123) la resuelve React
    app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  }

  // --- Errores ---
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'bad_request', message: 'Petición no válida' });
    }
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Algo salió mal, intenta de nuevo' });
  });

  // --- Tiempo real ---
  io.on('connection', (socket) => {
    socket.on('room:watch', (id) => {
      if (typeof id !== 'string' || !ROOM_ID.test(id) || !store.has(id)) {
        socket.emit('room:missing', id);
        return;
      }
      for (const joined of socket.rooms) if (joined !== socket.id) socket.leave(joined);
      socket.join(id);
      // estado completo al (re)conectar: así nadie depende de eventos que se perdió
      socket.emit('room:state', view(store.get(id)));
    });
  });

  return { app, server, io };
}
