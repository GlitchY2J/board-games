import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import type { GameState } from '../types/GameState';
import AlluringNarwhalAction from '../components/actions/AlluringNarwhalAction';
import Card from '../components/Card';
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
    <BoardLayout gameState={gameState} />
    // <div>
    //   <h1>Partida</h1>
    //   <h2>Turno de {activePlayer.name}</h2>
    //   <hr />
    //   <h2>Establos</h2>
    //   {gameState.players.map((player) => (
    //     <div key={player.id}>
    //       <h3>{player.name}</h3>
    //       <p>Unicorns: {player.stable.length}</p>
    //       <p>Upgrades: {player.upgrades.length}</p>
    //       <p>Downgrades: {player.downgrades.length}</p>
    //     </div>
    //   ))}

    //   <hr />
    //   <h2>Mi mano</h2>
    //   {localPlayer.hand.map((card) => (
    //     <Card
    //       key={card.id}
    //       name={card.name}
    //       image={card.image}
    //       onClick={() => play(card.id)}
    //       disabled={!isMyTurn}
    //     />
    //   ))}
    //   <br />
    //   <br />
    //   <button onClick={endTurn}>Terminar turno</button>
    //   {gameState.pendingAction?.type === 'alluring_narwhal' &&
    //     gameState.pendingAction.playerId === localPlayer.id && (
    //       <AlluringNarwhalAction
    //         gameState={gameState}
    //         playerId={localPlayer.id}
    //       />
    //     )}
    // </div>
  );
}
