import type { GameState } from '../../types/GameState';

interface Props {
  gameState: GameState;
  playerId: string;
}

export default function AlluringNarwhalAction({ gameState, playerId }: Props) {
  return (
    <div className="action-modal">
      <h2>Selecciona un Upgrade para robar</h2>
      {gameState.players
        .filter((p) => p.id! == playerId)
        .map((player) => (
          <div key={player.id}>
            <h3>{player.name}</h3>
            {player.upgrades.map((card) => (
              <div key={card.id}>{card.name}</div>
            ))}
          </div>
        ))}
    </div>
  );
}
