import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import Card from '../components/Card';

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

    // socket.on('game-updated', update);
    socket.on('game-updated', (gameState) => {
      setGameState(gameState);
    });

    // return () => {
    //   socket.off('game-updated', update);
    // };
    return () => {
      socket.off('game-updated');
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

  function endTurn() {
    socket.emit('end-turn', gameState.roomCode);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Unstable Unicorns</h1>
      <h2>Turno {gameState.turn}</h2>
      <h3>{player.name}</h3>
      <h3>Jugador actual: {gameState.players[gameState.currentPlayer].name}</h3>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {player.hand.map((card) => (
          <Card
            key={card.id}
            name={card.name}
            image={card.image}
            onClick={() => play(card.id)}
            disabled={!isMyTurn}
          />
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <button disabled={!isMyTurn} onClick={endTurn}>
          Terminar turno
        </button>
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
                  <Card
                    key={card.id}
                    name={card.name}
                    image={card.image}
                    disabled
                  />
                  // <div
                  //   key={card.id}
                  //   style={{
                  //     width: 120,
                  //     height: 160,
                  //     border: '1px solid white',
                  //     padding: 5,
                  //   }}
                  // >
                  //   {card.name}
                  // </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
