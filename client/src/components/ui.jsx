// Piezas de UI reutilizables. Centralizan las clases de Tailwind que se repiten
// para que los componentes de pantalla se lean fácil.

const buttonVariants = {
  primary: 'bg-pred text-white shadow-cta',
  ghost: 'bg-soft text-pblue',
  light: 'border border-white/30 bg-white/15 text-white',
};

export function Button({ variant = 'primary', big = false, as: As = 'button', className = '', ...props }) {
  const size = big ? 'w-full px-5 py-4 text-[17px]' : 'px-[18px] py-3';
  return (
    <As
      className={`inline-flex items-center justify-center gap-1.5 rounded-full text-center font-extrabold no-underline transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${size} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ as: As = 'section', compact = false, className = '', ...props }) {
  return (
    <As
      className={`flex flex-col gap-3 rounded-[18px] bg-white shadow-card ${compact ? 'p-2.5' : 'p-[18px]'} ${className}`}
      {...props}
    />
  );
}

export function CardTitle({ children, hint }) {
  return (
    <h3 className="m-0 flex flex-wrap items-baseline gap-2 text-lg leading-tight font-extrabold">
      {children}
      {hint && <small className="text-xs font-semibold text-muted">{hint}</small>}
    </h3>
  );
}

const eyebrowTones = { sky: 'text-sky', blue: 'text-pblue2', red: 'text-pred' };

export function Eyebrow({ tone = 'sky', className = '', children }) {
  return (
    <p className={`m-0 text-xs font-extrabold tracking-[0.14em] uppercase ${eyebrowTones[tone]} ${className}`}>
      {children}
    </p>
  );
}

export function ErrorMsg({ children }) {
  if (!children) return null;
  return <p className="m-0 rounded-xl bg-blush px-3 py-2.5 text-sm text-[#9b0020]">{children}</p>;
}

export function Field({ label, hint, ...inputProps }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold">
      <span>
        {label}
        {hint && <em className="font-medium text-muted not-italic"> {hint}</em>}
      </span>
      {/* 17px evita el zoom automático de iOS al enfocar */}
      <input
        className="rounded-xl border-2 border-line p-3.5 text-[17px] font-normal outline-none transition-colors focus:border-pblue2"
        {...inputProps}
      />
    </label>
  );
}

export function Screen({ children }) {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-3.5 px-4 pt-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
