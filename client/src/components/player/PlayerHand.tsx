import HiddenHand from './HiddenHand';
import LocalHand from './LocalHand';
import './PlayerHand.css';

import type { GameState } from '../../types/GameState';
type Player = GameState['players'][number];

interface Props {
  player: Player;
  isLocalPlayer: boolean;
  isMyTurn: boolean;
  gamePhase: string;
  onPlay(cardId: string): void;
}

export default function PlayerHand({
  player,
  isLocalPlayer,
  isMyTurn,
  gamePhase,
  onPlay,
}: Props) {
  return (
    <div className="player-hand">
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
  );
}
