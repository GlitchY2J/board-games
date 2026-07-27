import './PhasePanel.css';

import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';

interface Props {
  gameState: GameState;
}

export default function PhasePanel({ gameState }: Props) {
  const isActivePlayer =
    gameState.players[gameState.currentPlayer].socketId === socket.id;

  function nextPhase() {
    if (!isActivePlayer) return;
    socket.emit('next-phase', gameState.roomCode);
  }

  function getButtonText() {
    switch (gameState.phase) {
      case 'BEGINNING':
        return 'Comenzar turno';

      case 'DRAW':
        return 'Robar carta';

      case 'ACTION':
        return 'Finalizar acciones';

      case 'END':
        return 'Terminar turno';

      default:
        return 'Siguiente turno';
    }
  }

  return (
    <div className="phase-panel">
      <h3>Turno</h3>
      <div>{gameState.players[gameState.currentPlayer].name}</div>
      <h3>Fase</h3>
      <div className="phase">{gameState.phase}</div>
      {isActivePlayer && <button onClick={nextPhase}>{getButtonText()}</button>}
    </div>
  );
}
