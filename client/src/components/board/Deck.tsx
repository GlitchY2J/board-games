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
    !gameState.pendingPlay &&
    // Double Dutch: tras jugar una carta (remaining === 1) ya no se puede robar.
    (gameState.actionPlaysRemaining === undefined ||
      gameState.actionPlaysRemaining === 2);

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
      <PlayingCard name="Deck" image="" hidden size="medium" plain />
      <span className="absolute -top-2 -right-2 z-40 flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-slate-900/80 backdrop-blur-sm text-slate-300 text-[11px] font-bold shadow-inner border border-slate-600/40 select-none pointer-events-none">
        <span>{gameState.deck.length}</span>
      </span>
    </div>
  );
}
