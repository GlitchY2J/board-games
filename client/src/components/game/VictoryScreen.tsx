import type { GameState } from '../../types/GameState';
import type { CSSProperties } from 'react';
import './VictoryScreen.css';

interface Props {
  gameState: GameState;
  localPlayerId: string;
  onLeaveLobby(): void;
  onReadyRestart(): void;
  restartReadyCount: number;
  restartTotalPlayers: number;
  isRestartReady: boolean;
}

export default function VictoryScreen({ gameState, localPlayerId, onLeaveLobby, onReadyRestart, restartReadyCount, restartTotalPlayers, isRestartReady }: Props) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId)
    ?? (gameState.winnerId && gameState.winnerName
      ? { id: gameState.winnerId, name: gameState.winnerName }
      : undefined);
  const restartProgress = restartTotalPlayers > 0
    ? Math.min(100, (restartReadyCount / restartTotalPlayers) * 100)
    : 0;

  if (!winner) return null;

  const isWinner = localPlayerId === winner.id;

  return (
    <div className="victory-overlay">
      <div className={`victory-window${isWinner ? '' : ' victory-defeat'}`}>
        <div className="victory-crown">{isWinner ? '👑' : '💀'}</div>
        <h1 className="victory-title">{isWinner ? '¡Victoria!' : '¡Derrota!'}</h1>
        <div className="victory-player">{winner.name}</div>
        <div className="victory-text">{isWinner ? 'ha ganado!' : 'ha ganado la partida.'}</div>
        <div className="victory-actions">
          <button
            className="victory-button"
            onClick={onReadyRestart}
            style={{ '--restart-progress': `${restartProgress}%` } as CSSProperties}
          >
            {isRestartReady ? 'Cancelar preparación' : 'Volver a jugar'}
          </button>
          <div className="victory-waiting">
            <strong>{restartReadyCount}/{restartTotalPlayers}</strong>{' '}
            jugadores listos para volver a jugar.
            {isRestartReady && <span>Esperando a los demás jugadores...</span>}
          </div>
          <button className="victory-button victory-button-secondary" onClick={onLeaveLobby}>
            Volver al lobby
          </button>
        </div>
      </div>
    </div>
  );
}
