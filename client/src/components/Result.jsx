import { useState } from 'react';
import { api } from '../lib/api.js';
import { DRINKS, timeLabel, priceLabel } from '../lib/labels.js';
import { Button, Card, CardTitle, ErrorMsg, Eyebrow } from './ui.jsx';
import { shareOrCopy } from '../lib/share.js';

export default function Result({ room, me, session, onRoom }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { winner, runnerUp, reasons, cooler } = room.result;
  const plan = winner.plan;
  const going = room.participants.map((p) => p.name);
  const host = room.participants.find((p) => p.isHost);
  const cans = DRINKS.filter((d) => cooler[d.id] > 0);
  const lateArrival = !room.participants.find((p) => p.id === me.id)?.ready;

  const [copied, setCopied] = useState(false);
  const shareText =
    `🥤 Plan decidido para "${room.title}": ${plan.emoji} ${plan.name} (${plan.area}, ${timeLabel(plan.time).toLowerCase()}).\n` +
    `Hielera: ${cans.map((d) => `${cooler[d.id]} ${d.label}`).join(', ')}.\n`;

  async function share() {
    const result = await shareOrCopy({ title: room.title, text: shareText, url: `${window.location.origin}/p/${room.id}` });
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function reopen() {
    setBusy(true);
    setError('');
    try {
      const data = await api.reopen(room.id, session.token);
      onRoom(data.room);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3.5">
      {/* Tarjeta principal: es la que la gente ve y comparte */}
      <div className="relative flex flex-col gap-2 overflow-hidden rounded-3xl bg-linear-160 from-white to-[#eef3ff] px-5 pt-7 pb-[22px] text-center shadow-card">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,var(--color-pred)_0_33%,#fff_33%_66%,var(--color-pblue2)_66%)]"
        />
        <Eyebrow tone="red">El plan del grupo es</Eyebrow>
        <div className="animate-pop text-[64px] leading-none">{plan.emoji}</div>
        <h2 className="m-0 text-[28px] leading-tight font-black text-pblue">{plan.name}</h2>
        <p className="m-0 font-bold text-muted">
          {plan.area} · {timeLabel(plan.time)} · {priceLabel(plan.price)}
        </p>
        <p className="m-0">{plan.description}</p>

        <div className="mt-1.5 rounded-2xl bg-pblue p-3.5 text-left text-white">
          <span className="text-[11px] font-extrabold tracking-[0.14em] text-sky uppercase">Momento Pepsi</span>
          <p className="mt-1.5 mb-0">{plan.pepsi.moment}</p>
        </div>

        <div>
          <h4 className="mt-2 mb-2.5 text-sm font-bold tracking-[0.08em] text-muted uppercase">
            La hielera del grupo
          </h4>
          <div className="flex flex-wrap justify-center gap-[18px]">
            {cans.map((d) => (
              <div key={d.id} className="flex flex-col items-center gap-1">
                <span className={`can ${d.className}`} aria-hidden="true" />
                <b className="text-lg">×{cooler[d.id]}</b>
                <small className="max-w-20 text-[11px] text-muted">{d.label}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardTitle>¿Por qué este plan?</CardTitle>
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {reasons.map((r) => (
            <li key={r}>
              <span className="font-black text-green-700">✓</span> {r}
            </li>
          ))}
        </ul>
        {runnerUp?.plan && (
          <p className="m-0 text-sm text-muted">
            Plan B: {runnerUp.plan.emoji} {runnerUp.plan.name}
          </p>
        )}
        <p className="m-0 text-sm text-muted">Van: {going.join(', ')}</p>
      </Card>

      <Button big onClick={share} type="button">
        {copied ? '¡Copiado! Pégalo en tu grupo' : 'Compartir el plan'}
      </Button>

      {lateArrival && !me.isHost && (
        <p className="m-0 text-center text-sm text-white/80">
          Llegaste después de la votación. Si quieres opinar, pídele a {host?.name ?? 'el anfitrión'} que la reabra.
        </p>
      )}
      <ErrorMsg>{error}</ErrorMsg>
      {me.isHost && (
        <Button variant="light" onClick={reopen} disabled={busy} type="button">
          Reabrir votación
        </Button>
      )}
    </section>
  );
}
