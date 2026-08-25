import type { GameState } from '../../types/GameState';
import './VictoryScreen.css';

interface Props {
  gameState: GameState;
  onRestart(): void;
  onLeaveLobby(): void;
  isHost: boolean;
}

export default function VictoryScreen({ gameState, onRestart, onLeaveLobby, isHost }: Props) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);

  if (!winner) return null;

  return (
    <div className="victory-overlay">
      <div className="victory-window">
        <div className="victory-crown">👑</div>
        <h1 className="victory-title">¡Victoria!</h1>
        <div className="victory-player">{winner.name}</div>
        <div className="victory-text">ha ganado!</div>
        {isHost ? (
          <div className="victory-actions">
            <button className="victory-button" onClick={onRestart}>
              Volver a Jugar
            </button>
            <button className="victory-button victory-button-secondary" onClick={onLeaveLobby}>
              Volver al lobby
            </button>
          </div>
        ) : (
          <div className="victory-actions">
            <div className="victory-waiting">
              Esperando al anfitrión para iniciar un juego nuevo...
            </div>
            <button className="victory-button victory-button-secondary" onClick={onLeaveLobby}>
              Volver al lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
