import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import type { GameState } from '../types/GameState';
import BoardLayout from '../layouts/BoardLayout';
import VictoryScreen from '../components/game/VictoryScreen';
import TurnAnnouncement from '../components/game/TurnAnnouncement';
import CardMoveEffect from '../components/effects/CardMoveEffect';

interface DrawnCard {
  id: string;
  name: string;
  image: string;
}

interface TurnAnnounce {
  name: string;
  isActivePlayer: boolean;
  turn: number;
  currentPlayer: number;
}

export default function Game() {
  const location = useLocation();

  const [gameState, setGameState] = useState<GameState>(
    location.state.gameState,
  );

  const host = gameState.players[0];
  const isHost = host.socketId === socket.id;

  const activePlayer = gameState.players[gameState.currentPlayer];
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);

  const [drawnCard, setDrawnCard] = useState<DrawnCard | null>(null);
  const prevHandRef = useRef<string[]>(
    localPlayer ? localPlayer.hand.map((card) => card.id) : [],
  );

  const [turnAnnounce, setTurnAnnounce] = useState<TurnAnnounce | null>(null);
  const prevTurnRef = useRef<{ turn: number; currentPlayer: number } | null>(
    null,
  );

  useEffect(() => {
    if (!turnAnnounce) return;
    const timer = setTimeout(() => setTurnAnnounce(null), 2200);
    return () => clearTimeout(timer);
  }, [turnAnnounce]);

  useEffect(() => {
    socket.on('game-updated', (state: GameState) => {
      setGameState(state);

      const local = state.players.find((p) => p.socketId === socket.id);
      if (!local) return;

      const newIds = local.hand.map((card) => card.id);
      const prevIds = prevHandRef.current;
      const gained = newIds.filter((id) => !prevIds.includes(id));
      prevHandRef.current = newIds;

      if (gained.length >= 1 && gained.length <= 3) {
        const card = local.hand.find((c) => c.id === gained[0]);
        if (card) {
          setDrawnCard({ id: card.id, name: card.name, image: card.image });
        }
      }

      const prev = prevTurnRef.current;
      const active = state.players[state.currentPlayer];
      if (
        prev &&
        (state.turn !== prev.turn ||
          state.currentPlayer !== prev.currentPlayer) &&
        active
      ) {
        setTurnAnnounce({
          name: active.name,
          isActivePlayer: active.socketId === socket.id,
          turn: state.turn,
          currentPlayer: state.currentPlayer,
        });
      }
      prevTurnRef.current = { turn: state.turn, currentPlayer: state.currentPlayer };
    });

    return () => {
      socket.off('game-updated');
    };
  }, []);

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
      <BoardLayout
        gameState={gameState}
        isMyTurn={isMyTurn}
        isHost={isHost}
        onPlay={play}
      />
      {gameState.winnerId && (
        <VictoryScreen
          gameState={gameState}
          onRestart={restartGame}
          isHost={isHost}
        />
      )}
      {turnAnnounce && (
        <TurnAnnouncement
          key={`${turnAnnounce.turn}-${turnAnnounce.currentPlayer}`}
          playerName={turnAnnounce.name}
          isActivePlayer={turnAnnounce.isActivePlayer}
        />
      )}
      {drawnCard && (
        <CardMoveEffect
          key={drawnCard.id}
          card={drawnCard}
          onDone={() => setDrawnCard(null)}
        />
      )}
    </>
  );
}
