import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from './api.js';

/**
 * Estado compartido de una sala.
 * - Carga inicial por REST.
 * - Socket.io empuja cada cambio ("room:state").
 * - Al reconectar o al volver a la pestaña se pide el estado completo otra vez,
 *   así un teléfono que se durmió no se queda con datos viejos.
 * - `version` evita que una respuesta vieja que llegue tarde pise una más nueva.
 */
export function useRoom(id) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(true);
  const versionRef = useRef(0);

  const apply = useCallback((next) => {
    if (!next || next.version < versionRef.current) return;
    versionRef.current = next.version;
    setRoom(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getRoom(id);
      apply(data.room);
      setError(null);
    } catch (err) {
      setError(err.status === 404 ? 'not_found' : 'network');
    }
  }, [id, apply]);

  useEffect(() => {
    refresh();

    const socket = io({ reconnectionDelayMax: 5000 });
    socket.on('connect', () => {
      setOnline(true);
      socket.emit('room:watch', id);
    });
    socket.on('disconnect', () => setOnline(false));
    socket.on('room:state', apply);
    socket.on('room:missing', () => setError('not_found'));

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      socket.disconnect();
    };
  }, [id, apply, refresh]);

  return { room, error, online, apply, refresh };
}
