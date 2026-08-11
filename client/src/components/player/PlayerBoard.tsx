import type { GameState } from '../../types/GameState';
import PlayerInfo from './PlayerInfo';
import Stable from './Stable';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isLocalPlayer: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  isMyTurn: boolean;
  gamePhase: string;
  onPlay(cardId: string): void;
}

export default function PlayerBoard({ player, position, isMyTurn }: Props) {
  const isTopOrLeft = position === 'top' || position === 'left';

  return (
    <div
      className={`player-board relative rounded-2xl glass-panel bg-slate-950/30 border p-3 transition-all duration-300 ${
        isTopOrLeft ? 'flex-col items-center gap-2.5' : 'flex-col items-center gap-2.5'
      }`}
      style={{
        width: '100%',
        minWidth: '340px',
        maxWidth: '480px',
        opacity: isMyTurn ? 1 : 0.9,
        boxShadow: isMyTurn
          ? '0 0 30px rgba(16, 185, 129, 0.15)'
          : '0 10px 30px rgba(0, 0, 0, 0.3)',
        borderColor: isMyTurn
          ? 'rgba(16, 185, 129, 0.3)'
          : 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {isTopOrLeft ? (
        <>
          <div className="w-full flex justify-center">
            <Stable player={player} />
          </div>
          <PlayerInfo player={player} isActive={isMyTurn} />
        </>
      ) : (
        <>
          <PlayerInfo player={player} isActive={isMyTurn} />
          <div className="w-full flex justify-center">
            <Stable player={player} />
          </div>
        </>
      )}
    </div>
  );
}
