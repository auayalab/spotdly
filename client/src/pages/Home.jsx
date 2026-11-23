import { useState } from 'react';
import { api } from '../lib/api.js';
import { saveSession, lastName, rememberName } from '../lib/session.js';
import Brand from '../components/Brand.jsx';
import { Button, Card, ErrorMsg, Eyebrow, Field, Screen } from '../components/ui.jsx';

const STEPS = [
  'Comparte el link con tu grupo',
  'Cada quien elige vibe, presupuesto y su Pepsi',
  'Sale el plan que mejor le queda a todos',
];

export default function Home({ navigate }) {
  const [name, setName] = useState(lastName);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return; // evita crear dos salas con doble tap
    setBusy(true);
    setError('');
    try {
      const { room, me } = await api.createRoom(title.trim(), name.trim());
      rememberName(name.trim());
      saveSession(room.id, { id: me.id, token: me.token, name: name.trim() });
      navigate(`/p/${room.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Brand />
      <section>
        <Eyebrow>Miami · este fin</Eyebrow>
        <h1 className="mt-1 mb-3 text-[clamp(54px,17vw,76px)] leading-none font-black tracking-[-0.03em] text-white">
          ¿Qué
          <br />
          hacemos?
        </h1>
        <p className="m-0 text-[17px] leading-relaxed text-white/90">
          Deja de mandar 80 mensajes. Crea el plan, comparte el link y cada quien vota desde su teléfono. En dos
          minutos el grupo tiene plan… y Pepsi pone la hielera.
        </p>
      </section>

      <Card as="form" onSubmit={onSubmit}>
        <Field
          label="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Alan"
          maxLength={30}
          autoComplete="given-name"
          required
        />
        <Field
          label="Nombre del plan"
          hint="(opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Sábado con los panas"
          maxLength={60}
        />
        <ErrorMsg>{error}</ErrorMsg>
        <Button big disabled={busy || !name.trim()}>
          {busy ? 'Creando…' : 'Crear plan y compartir'}
        </Button>
      </Card>

      <ol className="m-0 mt-1 grid list-none gap-2 p-0">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2.5 font-semibold text-white">
            <b className="grid size-7 flex-none place-items-center rounded-full bg-white/15">{i + 1}</b>
            {step}
          </li>
        ))}
      </ol>
      <p className="m-0 mt-1 text-center text-xs text-white/60">
        Prototipo de concepto. Sin cuentas ni datos personales: solo un nombre o apodo.
      </p>
    </Screen>
  );
}
