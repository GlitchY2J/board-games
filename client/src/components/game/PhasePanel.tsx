import './PhasePanel.css';

import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';

interface Props {
  gameState: GameState;
}

export default function PhasePanel({ gameState }: Props) {
  function nextPhase() {
    socket.emit('next-phase', gameState.roomCode);
  }

  return (
    <div className="phase-panel">
      <h3>Turno</h3>
      <div>{gameState.players[gameState.currentPlayer].name}</div>
      <h3>Fase</h3>
      <div className="phase">{gameState.phase}</div>
      <button onClick={nextPhase}>Siguiente fase</button>
    </div>
  );
}
