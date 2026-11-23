import { useState } from 'react';
import { api } from '../lib/api.js';
import { saveSession } from '../lib/session.js';
import { timeLabel, priceLabel } from '../lib/labels.js';
import { Button, ErrorMsg, Eyebrow } from './ui.jsx';

// Pepsi Challenge: cuando los dos mejores planes quedan casi empatados,
// el grupo decide A o B "a ciegas" (sin ver puntos ni votos de los demás).
export default function Challenge({ room, me, session, onSession, onRoom }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const myVote = room.challenge.voted.includes(me.id) ? session.vote : null;
  const votedCount = room.challenge.voted.length;
  const total = room.participants.length;

  async function vote(choice) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.voteChallenge(room.id, session.token, choice);
      onSession(saveSession(room.id, { vote: choice }));
      onRoom(data.room);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resolve() {
    setBusy(true);
    try {
      const data = await api.resolveChallenge(room.id, session.token);
      onRoom(data.room);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3.5">
      <div className="text-center text-white">
        <Eyebrow>Empate técnico</Eyebrow>
        <h2 className="mt-1 mb-2 text-[40px] leading-none font-black tracking-tight">Pepsi Challenge</h2>
        <p className="m-0 text-white/85">
          Como en la prueba a ciegas de siempre: dos opciones, sin ver puntos ni lo que votan los demás. ¿A o B?
        </p>
      </div>

      <div className="grid gap-3">
        {room.challenge.options.map((plan, i) => {
          const choice = i === 0 ? 'a' : 'b';
          const isMine = myVote === choice;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => vote(choice)}
              disabled={busy}
              className={`relative flex flex-col gap-1 rounded-[18px] border-3 bg-white py-[18px] pr-4 pl-[70px] text-left text-ink shadow-card transition active:scale-[0.99] ${
                isMine ? 'border-pred' : 'border-transparent'
              }`}
            >
              <span
                className={`absolute top-4 left-3.5 grid size-[42px] place-items-center rounded-full text-xl font-black text-white ${
                  isMine ? 'bg-pred' : 'bg-pblue'
                }`}
              >
                {choice.toUpperCase()}
              </span>
              <span className="text-[26px]">{plan.emoji}</span>
              <b className="text-[17px]">{plan.name}</b>
              <small className="text-muted">
                {plan.area} · {timeLabel(plan.time)} · {priceLabel(plan.price)}
              </small>
              <span className="text-sm text-[#3a4170]">{plan.description}</span>
              {isMine && (
                <span className="mt-1 self-start rounded-full bg-pred px-2.5 py-0.5 text-xs font-extrabold text-white">
                  Tu voto
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      <p className="m-0 text-center text-white/80">
        {votedCount} de {total} ya votaron{myVote ? ' · puedes cambiar tu voto' : ''}
      </p>
      {me.isHost && (
        <Button variant="light" onClick={resolve} disabled={busy || votedCount === 0} type="button">
          Revelar ganador ya
        </Button>
      )}
    </section>
  );
}
