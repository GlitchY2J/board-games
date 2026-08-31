import type { GameState } from '../../types/GameState';
import type { Card } from '../../../../shared/types/Card.ts';
import Stable from './Stable';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isLocalPlayer: boolean;
  isMyTurn: boolean;
  debugMode?: boolean;
}

export default function PlayerBoard({
  player,
  isMyTurn,
  debugMode = false,
}: Props) {
  const debugUnicorns: Card[] = Array.from({ length: 7 }, (_, index) => ({
    uid: `debug-unicorn-${player.id}-${index}`,
    id: 'rainbow_unicorn',
    name: 'Debug Unicorn',
    cardType: 'unicorn',
    unicornClass: 'basic',
    image: '/cards/base/rainbow_unicorn.png',
    description: '',
    effect: null,
    copies: 0,
    expansion: 'debug',
  }));
  const debugUpgrade: Card = {
    uid: `debug-upgrade-${player.id}`,
    id: 'debug_upgrade',
    name: 'Debug Upgrade',
    cardType: 'upgrade',
    image: '/cards/base/rainbow_aura.png',
    description: '',
    effect: null,
    copies: 0,
    expansion: 'debug',
  };
  const debugDowngrade: Card = {
    uid: `debug-downgrade-${player.id}`,
    id: 'broken_stable',
    name: 'Debug Downgrade',
    cardType: 'downgrade',
    image: '/cards/base/broken_stable.png',
    description: '',
    effect: null,
    copies: 0,
    expansion: 'debug',
  };
  const displayedPlayer = debugMode
    ? {
        ...player,
        stable: [...player.stable, ...debugUnicorns],
        upgrades: [...player.upgrades, debugUpgrade],
        downgrades: [...player.downgrades, debugDowngrade],
      }
    : player;
  return (
    <div
      data-player-id={player.id}
      className={`player-board relative rounded-2xl glass-panel border p-3 transition-all duration-300 flex-col items-center gap-4`}
      style={{
        width: 'max-content',
        minWidth: '0',
        maxWidth: 'none',
        opacity: isMyTurn ? 1 : 0.85,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="w-full flex justify-center">
        <Stable player={displayedPlayer} />
      </div>
    </div>
  );
}
