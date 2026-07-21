import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';

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
  roomCode: string;
  players: Player[];
  currentPlayer: number;
  turn: number;
}

export default function Game() {
  const location = useLocation();

  const [gameState, setGameState] = useState<GameState>(
    location.state.gameState,
  );

  // const gameState = location.state?.gameState as GameState;

  // if (!gameState) {
  //   return <h2>No hay partida cargada.</h2>;
  // }

  useEffect(() => {
    const update = (state: GameState) => {
      setGameState(state);
    };

    socket.on('game-updated', update);

    return () => {
      socket.off('game-updated', update);
    };
  }, []);

  const player = gameState.players[0];

  function play(cardId: string) {
    socket.emit('play-card', {
      roomCode: gameState.roomCode,
      playerId: player.id,
      cardId,
    });
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Unstable Unicorns</h1>

      <h2>Turno {gameState.turn}</h2>

      <h3>{player.name}</h3>

      <h3>Mano</h3>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {player.hand.map((card) => (
          <button
            key={card.id}
            onClick={() => play(card.id)}
            style={{
              width: 140,
              height: 180,
            }}
          >
            <b>{card.name}</b>
            <br />
            {card.type}
          </button>
        ))}
      </div>

      <h3>Establo</h3>
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          gap: 10,
        }}
      >
        {player.stable.map((card) => (
          <div
            key={card.id}
            style={{ width: 140, height: 180, border: '1px solid white' }}
          >
            {card.name}
          </div>
        ))}
      </div>
    </div>
  );
}
