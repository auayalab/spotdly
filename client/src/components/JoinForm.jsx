import { useState } from 'react';
import { api } from '../lib/api.js';
import { saveSession, lastName, rememberName, loadSession } from '../lib/session.js';
import { Button, Card, ErrorMsg, Eyebrow, Field } from './ui.jsx';

export default function JoinForm({ room, onJoined }) {
  const [name, setName] = useState(lastName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const host = room.participants.find((p) => p.isHost);
  const count = room.participants.length;

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // Si había un token viejo para esta sala, se manda: el servidor lo reconoce y no duplica
      const previous = loadSession(room.id);
      const data = await api.join(room.id, name.trim(), previous?.token);
      rememberName(name.trim());
      const session = saveSession(room.id, { id: data.me.id, token: data.me.token, name: name.trim() });
      onJoined(session, data.room);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card as="form" onSubmit={onSubmit}>
      <Eyebrow tone="blue">{host ? `${host.name} te invitó` : 'Te invitaron'}</Eyebrow>
      <h2 className="m-0 text-[26px] leading-tight font-black">{room.title}</h2>
      <p className="m-0 text-muted">
        {count === 1 ? 'Ya hay 1 persona' : `Ya hay ${count} personas`} en el plan.
        {room.status === 'decided' && ' El grupo ya eligió: únete para ver qué salió.'}
      </p>
      <Field
        label="¿Cómo te dicen?"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre o apodo"
        maxLength={30}
        autoComplete="given-name"
        autoFocus
        required
      />
      <ErrorMsg>{error}</ErrorMsg>
      <Button big disabled={busy || !name.trim()}>
        {busy ? 'Entrando…' : 'Entrar al plan'}
      </Button>
    </Card>
  );
}
