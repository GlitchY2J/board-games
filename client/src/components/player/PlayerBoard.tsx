import type { GameState } from '../../types/GameState';
import Stable from './Stable';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isLocalPlayer: boolean;
  isMyTurn: boolean;
}

export default function PlayerBoard({
  player,
  isMyTurn,
}: Props) {
  return (
    <div
      data-player-id={player.id}
      className={`player-board relative rounded-2xl glass-panel border p-3 transition-all duration-300 flex-col items-center gap-4`}
      style={{
        width: '100%',
        minWidth: '0',
        maxWidth: '480px',
        opacity: isMyTurn ? 1 : 0.85,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="w-full flex justify-center">
        <Stable player={player} />
      </div>
    </div>
  );
}
