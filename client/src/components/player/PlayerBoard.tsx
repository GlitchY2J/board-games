import type { GameState } from '../../types/GameState';
import HiddenHand from './HiddenHand';
import LocalHand from './LocalHand';
import './PlayerBoard.css';
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

export default function PlayerBoard({
  player,
  isLocalPlayer,
  position,
  isMyTurn,
  gamePhase,
  onPlay,
}: Props) {
  return (
    <div className={`player-board ${position}`}>
      {position === 'top' ? (
        <>
          <div className="hand">
            {isLocalPlayer ? (
              <LocalHand
                player={player}
                isMyTurn={isMyTurn}
                gamePhase={gamePhase}
                onPlay={onPlay}
              />
            ) : (
              <HiddenHand cardCount={player.hand.length} />
            )}
          </div>
          <div className="stable">
            <Stable player={player} />
          </div>
          <PlayerInfo player={player} />
        </>
      ) : (
        <>
          <PlayerInfo player={player} />
          <div className="stable">
            <Stable player={player} />
          </div>
          <div className="hand">
            {isLocalPlayer ? (
              <LocalHand
                player={player}
                isMyTurn={isMyTurn}
                gamePhase=""
                onPlay={onPlay}
              />
            ) : (
              <HiddenHand cardCount={player.hand.length} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
