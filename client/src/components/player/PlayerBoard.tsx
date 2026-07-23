import type { GameState } from '../../types/GameState';
import LocalHand from './LocalHand';
import './PlayerBoard.css';
import Stable from './Stable';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isLocalPlayer: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  isMyTurn: boolean;
  onPlay(cardId: string): void;
}

export default function PlayerBoard({
  player,
  isLocalPlayer,
  position,
  isMyTurn,
  onPlay,
}: Props) {
  return (
    <div className={`player-board ${position}`}>
      {position === 'top' ? (
        <>
          <div className="hand">
            {isLocalPlayer ? 'MI MANO' : `🀄 ${player.hand.length} cartas`}
          </div>
          <div className="stable">
            <Stable player={player} />
          </div>
          <div className="player-header">
            <h3>{player.name}</h3>
          </div>
        </>
      ) : (
        <>
          <div className="player-header">
            <h3>{player.name}</h3>
          </div>
          <div className="stable">
            <Stable player={player} />
          </div>
          <div className="hand">
            {isLocalPlayer ? (
              <LocalHand player={player} isMyTurn={isMyTurn} onPlay={onPlay} />
            ) : (
              `🀄 ${player.hand.length} cartas`
            )}
          </div>
        </>
      )}
    </div>
  );
}
