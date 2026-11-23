// Grupo de opciones tipo "chip". Soporta selección múltiple con máximo,
// y opciones deshabilitadas (p. ej. no vetar lo que ya elegiste).

const tones = {
  blue: {
    on: 'border-pblue bg-pblue text-white',
    hintOn: 'text-white/80',
  },
  red: {
    on: 'border-pred bg-blush text-pred line-through',
    hintOn: 'text-pred/70',
  },
};
const OFF = 'border-line bg-white text-ink';

export default function ChipGroup({ options, value, onChange, max = 1, disabled = [], tone = 'blue' }) {
  const selected = Array.isArray(value) ? value : [value];
  const colors = tones[tone];

  function toggle(id) {
    if (max === 1 && !Array.isArray(value)) return onChange(id);
    if (selected.includes(id)) return onChange(selected.filter((v) => v !== id));
    if (max === 1) return onChange([id]);
    if (selected.length >= max) return onChange([...selected.slice(1), id]); // reemplaza el más viejo
    onChange([...selected, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const isOn = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={isOn}
            disabled={disabled.includes(o.id)}
            onClick={() => toggle(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-[14px] border-2 px-3 py-2.5 font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${isOn ? colors.on : OFF}`}
          >
            {o.emoji && <span className="text-lg">{o.emoji}</span>}
            <span>{o.label}</span>
            {o.hint && <small className={`text-xs font-medium ${isOn ? colors.hintOn : 'text-muted'}`}>{o.hint}</small>}
          </button>
        );
      })}
    </div>
  );
}
