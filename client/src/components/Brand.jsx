// Marca del prototipo. No usa el logotipo oficial: solo nombre y colores.
export default function Brand({ onClick }) {
  return (
    <header
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className="flex cursor-pointer items-center gap-2 pt-1 pb-2 font-extrabold tracking-wide text-white select-none"
    >
      <span className="brand-dot" aria-hidden="true" />
      <span className="text-lg">Pepsi</span>
      <span className="opacity-60">×</span>
      <span className="text-sm font-semibold opacity-85">Moment Planner</span>
    </header>
  );
}
