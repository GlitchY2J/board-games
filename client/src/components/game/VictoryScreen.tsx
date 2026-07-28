import type { GameState } from '../../types/GameState';
import './VictoryScreen.css';

interface Props {
  gameState: GameState;
  onRestart(): void;
}

export default function VictoryScreen({ gameState, onRestart }: Props) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);

  if (!winner) return null;

  return (
    <div className="victory-overlay">
      <div className="victory-window">
        <div className="victory-crown">👑</div>
        <h1 className="victory-title">Victory!</h1>
        <div className="victory-player">{winner.name}</div>
        <div className="victory-text">ha ganado!</div>
        <button className="victory-button" onClick={onRestart}>
          Volver a Jugar
        </button>
      </div>
    </div>
  );
}
