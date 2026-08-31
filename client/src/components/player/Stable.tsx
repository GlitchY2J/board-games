import type { GameState } from '../../types/GameState';
import PlayingCard from '../card/PlayingCard';
import './Stable.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
}

export default function Stable({ player }: Props) {
  const hasUnicorns = player.stable.length > 0;
  const hasUpgrades = player.upgrades.length > 0;
  const hasDowngrades = player.downgrades.length > 0;

  return (
    <div
      className="stable stable-compact flex flex-col gap-2 w-max max-w-none"
      data-stable-id={player.id}
    >
      {/* Fila 1: Unicornios */}
      <div className="flex items-center gap-2 flex-nowrap rounded-2xl bg-slate-950/40 border border-slate-900/60 px-3 py-2 min-h-[76px] overflow-visible">
        {hasUnicorns ? (
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {player.stable.map((card) => (
              <div
                key={card.uid}
                data-card-uid={card.uid}
                className="relative group transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
              >
                <div className="absolute inset-0 bg-amber-500/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <PlayingCard name={card.name} image={card.image} size="small" />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider select-none whitespace-nowrap">
            Sin unicornios
          </span>
        )}
      </div>

      {/* Fila 2: Modificadores (Upgrades + Downgrades) */}
      {(hasUpgrades || hasDowngrades) && (
        <div className="flex items-center gap-2 rounded-2xl bg-slate-950/40 border border-slate-900/60 px-3 py-2 min-h-[76px] overflow-visible">
          {hasUpgrades && (
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              {player.upgrades.map((card) => (
                <div key={card.uid} data-card-uid={card.uid}>
                  <PlayingCard
                    name={card.name}
                    image={card.image}
                    size="small"
                  />
                </div>
              ))}
            </div>
          )}

          {hasDowngrades && (
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              {player.downgrades.map((card) => (
                <div key={card.uid} data-card-uid={card.uid}>
                  <PlayingCard
                    name={card.name}
                    image={card.image}
                    size="small"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
