import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import type { GameState } from '../types/GameState';

import BoardLayout from '../layouts/BoardLayout';

export default function Game() {
  const location = useLocation();

  const [gameState, setGameState] = useState<GameState>(
    location.state.gameState,
  );

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
    socket.emit('play-card', {
      roomCode: gameState.roomCode,
      playerId: localPlayer?.id,
      cardId,
    });
  }

  function endTurn() {
    socket.emit('end-turn');
  }

  return (
    <BoardLayout gameState={gameState} isMyTurn={isMyTurn} onPlay={play} />
  );
}
