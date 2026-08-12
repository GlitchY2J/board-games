import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import { useGame } from '../context/GameContext';
import type { GameState } from '../types/GameState';
import BoardLayout from '../layouts/BoardLayout';
import VictoryScreen from '../components/game/VictoryScreen';
import TurnAnnouncement from '../components/game/TurnAnnouncement';
import CardMoveEffect from '../components/effects/CardMoveEffect';
import CardRemovalAnimation from '../components/effects/CardRemovalAnimation';
import type { CardAnimation } from '../../../shared/types/SocketEvents.ts';
import { Loader2 } from 'lucide-react';

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
  const { gameState: contextGameState, isHost: contextIsHost, deactivate } = useGame();

  const [gameState, setGameState] = useState<GameState | null>(
    contextGameState ?? location.state?.gameState ?? null,
  );

  const [drawnCard, setDrawnCard] = useState<DrawnCard | null>(null);
  const [turnAnnounce, setTurnAnnounce] = useState<TurnAnnounce | null>(null);

  const [removalAnims, setRemovalAnims] = useState<
    { animation: CardAnimation; rect: { left: number; top: number; width: number; height: number } }[]
  >([]);

  const pendingGameStateRef = useRef<GameState | null>(null);
  const activeAnimationsCountRef = useRef(0);

  const initialGameState =
    contextGameState ?? (location.state?.gameState as GameState | undefined) ?? null;
  const prevHandRef = useRef<string[]>(
    initialGameState?.players
      .find((p) => p.socketId === socket.id)
      ?.hand.map((card) => card.uid) ?? [],
  );
  const prevTurnRef = useRef<{ turn: number; currentPlayer: number } | null>(
    null,
  );

  const applyGameState = (state: GameState) => {
    setGameState(state);

    const local = state.players.find((p) => p.socketId === socket.id);
    if (!local) return;

    const newIds = local.hand.map((card) => card.uid);
    const prevIds = prevHandRef.current;
    const gained = newIds.filter((id) => !prevIds.includes(id));
    prevHandRef.current = newIds;

    if (gained.length >= 1 && gained.length <= 3) {
      const card = local.hand.find((c) => c.uid === gained[0]);
      if (card) {
        setDrawnCard({ id: card.uid, name: card.name, image: card.image });
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
  };

  useEffect(() => {
    if (contextGameState) {
      if (activeAnimationsCountRef.current > 0) {
        pendingGameStateRef.current = contextGameState;
      } else {
        setGameState(contextGameState);
      }
    }
  }, [contextGameState]);

  useEffect(() => {
    if (!turnAnnounce) return;
    const timer = setTimeout(() => setTurnAnnounce(null), 2200);
    return () => clearTimeout(timer);
  }, [turnAnnounce]);

  useEffect(() => {
    socket.on('game-updated', (state: GameState) => {
      if (activeAnimationsCountRef.current > 0) {
        pendingGameStateRef.current = state;
      } else {
        applyGameState(state);
      }
    });

    const onCardAnimations = (animations: CardAnimation[]) => {
      const found = animations
        .map((animation) => {
          const el = document.querySelector(
            `[data-card-uid="${animation.card.uid}"]`,
          );
          if (!el) return null;
          el.classList.add('card-animating-out');
          const rect = el.getBoundingClientRect();
          return { animation, rect };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (found.length > 0) {
        activeAnimationsCountRef.current = found.length;
        setRemovalAnims(found);
      }
    };

    socket.on('card-animations', onCardAnimations);

    return () => {
      socket.off('game-updated');
      socket.off('card-animations');
    };
  }, []);

  if (!gameState) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-emerald-400" size={40} />
        <p className="text-sm text-slate-400 font-medium">Cargando partida...</p>
      </div>
    );
  }

  useEffect(() => {
    if (!gameState) return;
    const local = gameState.players.find((p) => p.socketId === socket.id);
    if (!local) {
      deactivate();
    }
  }, [gameState, deactivate]);

  const activePlayer = gameState.players[gameState.currentPlayer];
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);

  if (!localPlayer) {
    return <h2>Jugador no encontrado.</h2>;
  }

  const isHost = contextIsHost || localPlayer.id === gameState.players[0].id;

  const gs: GameState = gameState;
  const isMyTurn = activePlayer.socketId === socket.id;

  function play(cardId: string) {
    if (!localPlayer) {
      console.error(
        'No se puede jugar una carta: jugador local no encontrado.',
      );
      return;
    }

    socket.emit('play-card', {
      roomCode: gs.roomCode,
      playerId: localPlayer.id,
      cardId,
    });
  }

  function restartGame() {
    console.log('Solicitando reinicio...');
    socket.emit('restart-game', gs.roomCode);
  }

  function removeRemovalAnim(animId: string) {
    setRemovalAnims((prev) => {
      const next = prev.filter((a) => a.animation.animId !== animId);
      activeAnimationsCountRef.current = next.length;

      if (next.length === 0 && pendingGameStateRef.current) {
        const pendingState = pendingGameStateRef.current;
        pendingGameStateRef.current = null;
        applyGameState(pendingState);
      }

      return next;
    });
  }

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
      {removalAnims.map(({ animation, rect }) => (
        <CardRemovalAnimation
          key={animation.animId}
          animation={animation}
          rect={rect}
          onDone={() => removeRemovalAnim(animation.animId)}
        />
      ))}
    </>
  );
}
