import { useState } from 'react';
import { api } from '../lib/api.js';
import { Button, Card, CardTitle, ErrorMsg } from './ui.jsx';

export default function Waiting({ room, me, session, onEdit, onRoom }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const ready = room.participants.filter((p) => p.ready).length;
  const total = room.participants.length;
  const pending = total - ready;

  async function close() {
    if (pending > 0 && !confirm) return setConfirm(true);
    setBusy(true);
    setError('');
    try {
      const data = await api.close(room.id, session.token);
      onRoom(data.room);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>
        {ready} de {total} listos
      </CardTitle>
      <div className="h-2.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
        <span
          className="block h-full bg-linear-to-r from-pblue2 to-pred transition-[width] duration-500"
          style={{ width: `${total ? (ready / total) * 100 : 0}%` }}
        />
      </div>

      <ul className="m-0 grid list-none gap-2 p-0">
        {room.participants.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5">
            <span
              className={`grid size-[34px] flex-none place-items-center rounded-full font-black ${
                p.ready ? 'bg-pblue text-white' : 'bg-soft text-pblue'
              }`}
            >
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 font-bold">
              {p.name}
              {p.id === me.id && ' (tú)'}
              {p.isHost && <em className="text-[13px] font-medium text-muted not-italic"> · anfitrión</em>}
            </span>
            <span className={`text-[13px] ${p.ready ? 'font-bold text-green-700' : 'text-muted'}`}>
              {p.ready ? '✓ listo' : 'pensando…'}
            </span>
          </li>
        ))}
      </ul>

      <Button variant="ghost" onClick={onEdit} type="button">
        Cambiar mis respuestas
      </Button>

      {me.isHost ? (
        <div className="flex flex-col gap-2.5 border-t border-line pt-3">
          {confirm && pending > 0 && (
            <p className="m-0 text-sm text-muted">
              {pending === 1 ? 'Falta 1 persona' : `Faltan ${pending} personas`}. Si cierras ahora, se decide con lo
              que hay.
            </p>
          )}
          <ErrorMsg>{error}</ErrorMsg>
          <Button big onClick={close} disabled={busy || ready === 0} type="button">
            {busy ? 'Calculando…' : confirm && pending > 0 ? 'Sí, elegir el plan ya' : 'Elegir el plan del grupo'}
          </Button>
        </div>
      ) : (
        <p className="m-0 text-center text-sm text-muted">Cuando todos estén listos, el anfitrión revela el plan.</p>
      )}
    </Card>
  );
}
