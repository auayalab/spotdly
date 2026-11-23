// Almacenamiento en memoria. Node ejecuta un solo hilo, así que cada `update`
// (leer -> aplicar regla -> guardar) es atómico: no hay carreras entre dos
// peticiones a la misma sala. Para escalar se reemplaza por Redis/Postgres
// manteniendo esta misma interfaz (ver README, sección "Escala").

import { DomainError } from './errors.js';
import { LIMITS } from './constants.js';

export class MemoryStore {
  constructor({ ttlMs = LIMITS.roomTtlMs, now = () => Date.now() } = {}) {
    this.rooms = new Map();
    this.ttlMs = ttlMs;
    this.now = now;
  }

  insert(room) {
    if (this.rooms.has(room.id)) throw new Error('room id collision');
    this.rooms.set(room.id, room);
    return room;
  }

  has(id) {
    return this.rooms.has(id);
  }

  get(id) {
    const room = this.rooms.get(id);
    if (!room) throw new DomainError(404, 'room_not_found', 'Este plan no existe o ya expiró');
    return room;
  }

  /** Aplica `fn` a la sala y devuelve lo que regrese `fn`. */
  update(id, fn) {
    const room = this.get(id);
    return fn(room);
  }

  /** Borra salas sin actividad por más de ttlMs. */
  sweep() {
    const cutoff = this.now() - this.ttlMs;
    let removed = 0;
    for (const [id, room] of this.rooms) {
      if (room.updatedAt < cutoff) {
        this.rooms.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}
