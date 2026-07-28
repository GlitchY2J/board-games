import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';

interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  localPlayerId: string;
}

export default function Deck({ gameState, isMyTurn, localPlayerId }: Props) {
  // Draw Card
  function drawActionCard() {
    if (!isMyTurn) return;

    if (gameState.phase !== 'ACTION') return;

    if (gameState.actionUsed) return;

    socket.emit('draw-action-card', {
      roomCode: gameState.roomCode,
      playerId: localPlayerId,
    });
  }

  return (
    <div
      onClick={drawActionCard}
      style={{ cursor: isMyTurn ? 'pointer' : 'default' }}
    >
      <PlayingCard name="Deck" image="" hidden size="medium" />
    </div>
  );
}
