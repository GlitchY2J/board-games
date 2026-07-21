import { useLocation } from 'react-router-dom';

interface Card {
  id: string;
  name: string;
  type: string;
  description: string;
  image: string;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}

interface GameState {
  players: Player[];
  currentPlayer: number;
  turn: number;
}

export default function Game() {
  const location = useLocation();

  const gameState = location.state?.gameState as GameState;

  if (!gameState) {
    return <h2>No hay partida cargada.</h2>;
  }

  const player = gameState.players[0];

  return (
    <div style={{ padding: 20 }}>
      <h1>Unstable Unicorns</h1>

      <h2>Turno {gameState.turn}</h2>

      <h3>Jugador: {player.name}</h3>

      <h3>Tu mano</h3>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {player.hand.map((card) => (
          <div
            key={card.id}
            style={{
              width: 140,
              border: '1px solid white',
              borderRadius: 8,
              padding: 10,
            }}
          >
            <h4>{card.name}</h4>
            <p>{card.type}</p>
          </div>
        ))}
      </div>

      <h3>Establo</h3>
      <div
        style={{
          minHeight: 120,
          border: '1px dashed gray',
          marginTop: 20,
          padding: 10,
        }}
      >
        {player.stable.length === 0
          ? 'No hay unicornios.'
          : player.stable.map((card) => <div key={card.id}>{card.name}</div>)}
      </div>
    </div>
  );
}
