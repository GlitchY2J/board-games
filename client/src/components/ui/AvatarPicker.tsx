export const AVATAR_OPTIONS: { id: string; label: string }[] = [
  { id: 'bear', label: 'Oso' },
  { id: 'bunny', label: 'Conejo' },
  { id: 'cat', label: 'Gato' },
  { id: 'dog', label: 'Perro' },
  { id: 'fox', label: 'Zorro' },
  { id: 'koala', label: 'Koala' },
  { id: 'owl', label: 'Búho' },
  { id: 'panda', label: 'Panda' },
  { id: 'raccoon', label: 'Mapache' },
  { id: 'red_raccoon', label: 'Mapache Rojo' },
  { id: 'unicorn', label: 'Unicornio' },
  { id: 'wolf', label: 'Lobo' },
];

interface Props {
  value: string;
  onChange: (id: string) => void;
  accent?: string;
}

export default function AvatarPicker({ value, onChange, accent = 'cyan' }: Props) {
  const focusClasses =
    accent === 'emerald'
      ? 'focus:border-emerald-400/60 focus:ring-emerald-400/30'
      : 'focus:border-cyan-400/60 focus:ring-cyan-400/30';

  return (
    <div className={`w-full rounded-2xl bg-slate-950/50 border border-slate-800 p-3 transition-all ${focusClasses}`}>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Elige tu Avatar
      </label>
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_OPTIONS.map(({ id, label }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              aria-pressed={selected}
              onClick={() => onChange(id)}
              className={`flex items-center justify-center aspect-square rounded-xl border transition-all cursor-pointer overflow-hidden ${
                selected
                  ? accent === 'emerald'
                    ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105 ring-2 ring-emerald-400/40'
                    : 'bg-cyan-500/20 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105 ring-2 ring-cyan-400/40'
                  : 'bg-slate-900/50 border-2 border-slate-800 hover:border-slate-600'
              }`}
            >
              <img
                src={`/avatars/${id}.png`}
                alt={label}
                className="w-full h-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}