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
  socketId: string;
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
  const isMyTurn =
    gameState.players[gameState.currentPlayer].socketId === socket.id;

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

  // const player = gameState.players[0];
  const player = gameState.players.find((p) => p.socketId === socket.id);

  if (!player) {
    return <h2>Esperando información del jugador...</h2>;
  }

  function play(cardId: string) {
    socket.emit('play-card', {
      roomCode: gameState.roomCode,
      playerId: player?.id,
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
            disabled={!isMyTurn}
            onClick={() => play(card.id)}
            style={{
              width: 140,
              height: 180,
              opacity: isMyTurn ? 1 : 0.5,
              cursor: isMyTurn ? 'pointer' : 'not-allowed',
            }}
          >
            <b>{card.name}</b>
            <br />
            {card.type}
          </button>
        ))}
      </div>

      <h2>Establo</h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          marginTop: 20,
        }}
      >
        {gameState.players.map((p) => (
          <div key={p.id} style={{ border: '1px solid gray', padding: 10 }}>
            <h3>{p.name}</h3>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {p.stable.length === 0 ? (
                <span>Vacio</span>
              ) : (
                p.stable.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      width: 120,
                      height: 160,
                      border: '1px solid white',
                      padding: 5,
                    }}
                  >
                    {card.name}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
