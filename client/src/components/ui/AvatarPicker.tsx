import { AVATAR_OPTIONS } from './avatarOptions';

interface Props {
  value: string;
  onChange: (id: string) => void;
  accent?: string;
  takenAvatars?: string[];
}

export default function AvatarPicker({
  value,
  onChange,
  accent = 'cyan',
  takenAvatars = [],
}: Props) {
  const focusClasses =
    accent === 'emerald'
      ? 'focus:border-emerald-400/60 focus:ring-emerald-400/30'
      : 'focus:border-cyan-400/60 focus:ring-cyan-400/30';

  return (
    <div className={`platform-avatar-picker w-full rounded-2xl bg-slate-950/50 border border-slate-800 p-3 transition-all ${focusClasses}`}>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Elige tu Avatar
        </label>
        {takenAvatars.length > 0 && (
          <span className="text-[10px] font-bold text-slate-500">
            {takenAvatars.length} en uso
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_OPTIONS.map(({ id, label }) => {
          const selected = value === id;
          const isTaken = takenAvatars.includes(id);

          return (
            <button
              key={id}
              type="button"
              title={isTaken ? `${label} (No disponible: ya elegido)` : label}
              aria-pressed={selected}
              disabled={isTaken}
              onClick={() => !isTaken && onChange(id)}
              className={`relative flex items-center justify-center aspect-square rounded-xl border transition-all overflow-hidden ${
                isTaken
                  ? 'bg-slate-950/80 border-slate-900 opacity-25 grayscale cursor-not-allowed pointer-events-none'
                  : selected
                    ? accent === 'emerald'
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105 ring-2 ring-emerald-400/40 cursor-pointer'
                      : 'bg-cyan-500/20 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105 ring-2 ring-cyan-400/40 cursor-pointer'
                    : 'bg-slate-900/50 border-2 border-slate-800 hover:border-slate-600 cursor-pointer'
              }`}
            >
              <img
                src={`/avatars/${id}.png`}
                alt={label}
                className="w-full h-full object-cover"
              />
              {isTaken && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] flex items-center justify-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                    Ocupado
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
