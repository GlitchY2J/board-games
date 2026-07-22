import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import type { GameState } from '../types/GameState';
import AlluringNarwhalAction from '../components/actions/AlluringNarwhalAction';
import Card from '../components/Card';

export default function Game() {
  const location = useLocation();

  const [gameState, setGameState] = useState<GameState>(
    location.state.gameState,
  );

  const isMyTurn =
    gameState.players[gameState.currentPlayer].socketId === socket.id;

  useEffect(() => {
    socket.on('game-updated', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.off('game-updated');
    };
  }, []);

  const currentPlayer = gameState.players[gameState.currentPlayer];

  function play(cardId: string) {
    socket.emit('play-card', {
      roomCode: location.state.room.code,
      playerId: currentPlayer.id,
      cardId,
    });
  }

  function endTurn() {
    socket.emit('end-turn');
  }

  return (
    <div>
      <h1>Partida</h1>
      <h2>Turno de {currentPlayer.name}</h2>
      <hr />
      <h2>Establos</h2>
      {gameState.players.map((player) => (
        <div key={player.id}>
          <h3>{player.name}</h3>
          <p>Unicorns: {player.stable.length}</p>
          <p>Upgrades: {player.upgrades.length}</p>
          <p>Downgrades: {player.downgrades.length}</p>
        </div>
      ))}

      <hr />
      <h2>Mi mano</h2>
      {currentPlayer.hand.map((card) => (
        <Card
          key={card.id}
          name={card.name}
          image={card.image}
          onClick={() => play(card.id)}
          // disabled={!isMyTurn}
        />
      ))}
      <br />
      <br />
      <button onClick={endTurn}>Terminar turno</button>
      {gameState.pendingAction?.type === 'alluring_narwhal' &&
        gameState.pendingAction.playerId === currentPlayer.id && (
          <AlluringNarwhalAction
            gameState={gameState}
            playerId={currentPlayer.id}
          />
        )}
    </div>
  );
}
