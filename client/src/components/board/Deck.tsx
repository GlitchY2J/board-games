import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';

interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  localPlayerId: string;
}

export default function Deck({ gameState, isMyTurn, localPlayerId }: Props) {
  const canDraw =
    isMyTurn &&
    (gameState.phase === 'DRAW' || gameState.phase === 'ACTION') &&
    !gameState.actionUsed &&
    !gameState.pendingPlay;

  // Draw Card
  function drawActionCard() {
    if (!canDraw) return;

    socket.emit('draw-action-card', {
      roomCode: gameState.roomCode,
      playerId: localPlayerId,
    });
  }

  return (
    <div
      onClick={drawActionCard}
      style={{ cursor: canDraw ? 'pointer' : 'default' }}
      className="relative"
    >
      <PlayingCard name="Deck" image="" hidden size="medium" />
      <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500 text-slate-950 text-xs font-black shadow-lg border-2 border-slate-900 select-none">
        <span className="px-0.5">{gameState.deck.length}</span>
      </span>
    </div>
  );
}
