import { useState } from 'react';
import ChipGroup from './ChipGroup.jsx';
import { api } from '../lib/api.js';
import { saveSession } from '../lib/session.js';
import { VIBES, TIMES, BUDGETS, DRINKS } from '../lib/labels.js';
import { Button, Card, CardTitle, ErrorMsg } from './ui.jsx';

const EMPTY = { vibes: [], budget: 2, times: [], vetoes: [], drink: '' };

export default function PrefsForm({ room, session, onSaved, onCancel }) {
  const [prefs, setPrefs] = useState({ ...EMPTY, ...(session.prefs ?? {}) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (value) =>
    setPrefs((p) => {
      const next = { ...p, [field]: value };
      // no se puede vetar lo que elegiste
      if (field === 'vibes') next.vetoes = next.vetoes.filter((v) => !value.includes(v));
      return next;
    });

  const missing = !prefs.vibes.length ? 'Elige al menos un vibe' : !prefs.drink ? 'Elige tu Pepsi' : '';

  async function onSubmit(e) {
    e.preventDefault();
    if (busy || missing) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.savePrefs(room.id, session.token, prefs);
      const next = saveSession(room.id, { prefs });
      onSaved(next, data.room);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <Card>
        <CardTitle hint="hasta 2">¿Qué se te antoja?</CardTitle>
        <ChipGroup options={VIBES} value={prefs.vibes} onChange={set('vibes')} max={2} />
      </Card>

      <Card>
        <CardTitle>Presupuesto por persona</CardTitle>
        <ChipGroup options={BUDGETS} value={prefs.budget} onChange={set('budget')} />
      </Card>

      <Card>
        <CardTitle hint="si no marcas nada, te da igual">¿Cuándo?</CardTitle>
        <ChipGroup options={TIMES} value={prefs.times} onChange={set('times')} max={3} />
      </Card>

      <Card>
        <CardTitle hint="opcional · 1 veto">Ni de broma</CardTitle>
        <ChipGroup
          options={VIBES}
          value={prefs.vetoes}
          onChange={set('vetoes')}
          max={1}
          disabled={prefs.vibes}
          tone="red"
        />
      </Card>

      <Card>
        <CardTitle>Tu Pepsi para el plan</CardTitle>
        <p className="m-0 text-sm text-muted">Con esto armamos la hielera del grupo.</p>
        <div className="grid grid-cols-3 gap-2">
          {DRINKS.map((d) => {
            const isOn = prefs.drink === d.id;
            return (
              <button
                type="button"
                key={d.id}
                aria-pressed={isOn}
                onClick={() => set('drink')(d.id)}
                className={`flex flex-col items-center gap-1.5 rounded-[14px] border-2 bg-white px-1.5 py-3 text-center text-ink transition ${
                  isOn ? 'border-pred ring-3 ring-pred/15' : 'border-line'
                }`}
              >
                <span className={`can ${d.className}`} aria-hidden="true" />
                <b className="text-[13px] leading-tight">{d.label}</b>
                <small className="text-[11px] text-muted">{d.hint}</small>
              </button>
            );
          })}
        </div>
      </Card>

      <ErrorMsg>{error}</ErrorMsg>
      <div className="sticky bottom-0 flex gap-2.5 bg-linear-to-b from-transparent to-navy to-40% pt-3 pb-[calc(4px+env(safe-area-inset-bottom))]">
        {onCancel && (
          <Button type="button" variant="ghost" className="flex-none" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button big disabled={busy || Boolean(missing)}>
          {busy ? 'Guardando…' : missing || 'Listo ✓'}
        </Button>
      </div>
    </form>
  );
}
