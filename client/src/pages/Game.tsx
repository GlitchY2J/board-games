import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import type { GameState } from '../types/GameState';
import BoardLayout from '../layouts/BoardLayout';
import VictoryScreen from '../components/game/VictoryScreen';

export default function Game() {
  const location = useLocation();

  const [gameState, setGameState] = useState<GameState>(
    location.state.gameState,
  );

  const host = gameState.players[0];
  const isHost = host.socketId === socket.id;

  useEffect(() => {
    socket.on('game-updated', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.off('game-updated');
    };
  }, []);

  const activePlayer = gameState.players[gameState.currentPlayer];
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);

  if (!localPlayer) {
    return <h2>Jugador no encontrado.</h2>;
  }

  const isMyTurn = activePlayer.socketId === socket.id;

  function play(cardId: string) {
    if (!localPlayer) {
      console.error(
        'No se puede jugar una carta: jugador local no encontrado.',
      );
      return;
    }

    socket.emit('play-card', {
      roomCode: gameState.roomCode,
      playerId: localPlayer.id,
      cardId,
    });
  }

  function restartGame() {
    console.log('Solicitando reinicio...');
    socket.emit('restart-game', gameState.roomCode);
  }

  // function endTurn() {
  //   socket.emit('end-turn');
  // }

  return (
    <>
      <BoardLayout gameState={gameState} isMyTurn={isMyTurn} onPlay={play} />
      {gameState.winnerId && (
        <VictoryScreen
          gameState={gameState}
          onRestart={restartGame}
          isHost={isHost}
        />
      )}
    </>
  );
}
