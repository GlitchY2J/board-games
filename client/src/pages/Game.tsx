import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../services/socket';
import { useGame } from '../context/GameContext';
import type { GameState } from '../types/GameState';
import BoardLayout from '../layouts/BoardLayout';
import VictoryScreen from '../components/game/VictoryScreen';
import TurnAnnouncement from '../components/game/TurnAnnouncement';
import CardDrawEffect from '../components/effects/CardDrawEffect';
import CardDiscardEffect from '../components/effects/CardDiscardEffect';
import CardRemovalAnimation from '../components/effects/CardRemovalAnimation';
import NeighAnnouncement from '../components/game/NeighAnnouncement';
import type { CardAnimation, NeighAnimation, DrawAnimation, DiscardAnimation } from '../../../shared/types/SocketEvents.ts';
import { Loader2 } from 'lucide-react';

interface TurnAnnounce {
  name: string;
  isActivePlayer: boolean;
  turn: number;
  currentPlayer: number;
}

export default function Game() {
  const location = useLocation();
  const { gameState: contextGameState, isHost: contextIsHost, room: roomFromContext, deactivate } = useGame();

  const [gameState, setGameState] = useState<GameState | null>(
    contextGameState ?? location.state?.gameState ?? null,
  );

  const [turnAnnounce, setTurnAnnounce] = useState<TurnAnnounce | null>(null);

  const [removalAnims, setRemovalAnims] = useState<
    { animation: CardAnimation; rect: { left: number; top: number; width: number; height: number } }[]
  >([]);
  const [neighAnims, setNeighAnims] = useState<NeighAnimation[]>([]);
  const [drawAnims, setDrawAnims] = useState<DrawAnimation[]>([]);
  const [discardAnims, setDiscardAnims] = useState<DiscardAnimation[]>([]);

  const pendingGameStateRef = useRef<GameState | null>(null);
  const activeAnimationsCountRef = useRef(0);

  const prevTurnRef = useRef<{ turn: number; currentPlayer: number } | null>(
    null,
  );

  const applyGameState = (state: GameState) => {
    setGameState(state);

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
        activeAnimationsCountRef.current += found.length;
        setRemovalAnims((prev) => [...prev, ...found]);
      }
    };

    const onNeighAnimations = (animations: NeighAnimation[]) => {
      if (animations.length > 0) {
        activeAnimationsCountRef.current += animations.length;
        setNeighAnims((prev) => [...prev, ...animations]);
      }
    };

    const onDrawAnimations = (animations: DrawAnimation[]) => {
      if (animations.length > 0) {
        activeAnimationsCountRef.current += animations.length;
        setDrawAnims((prev) => [...prev, ...animations]);
      }
    };

    const onDiscardAnimations = (animations: DiscardAnimation[]) => {
      if (animations.length > 0) {
        activeAnimationsCountRef.current += animations.length;
        setDiscardAnims((prev) => [...prev, ...animations]);
      }
    };

    socket.on('card-animations', onCardAnimations);
    socket.on('neigh-animations', onNeighAnimations);
    socket.on('draw-animations', onDrawAnimations);
    socket.on('discard-animations', onDiscardAnimations);

    return () => {
      socket.off('game-updated');
      socket.off('card-animations');
      socket.off('neigh-animations');
      socket.off('draw-animations');
      socket.off('discard-animations');
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

  const isHost = contextIsHost || localPlayer.id === roomFromContext?.hostId;

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
      activeAnimationsCountRef.current = Math.max(0, activeAnimationsCountRef.current - 1);

      if (activeAnimationsCountRef.current === 0 && pendingGameStateRef.current) {
        const pendingState = pendingGameStateRef.current;
        pendingGameStateRef.current = null;
        applyGameState(pendingState);
      }

      return next;
    });
  }

  function removeNeighAnim(animId: string) {
    setNeighAnims((prev) => {
      const next = prev.filter((a) => a.animId !== animId);
      activeAnimationsCountRef.current = Math.max(0, activeAnimationsCountRef.current - 1);

      if (activeAnimationsCountRef.current === 0 && pendingGameStateRef.current) {
        const pendingState = pendingGameStateRef.current;
        pendingGameStateRef.current = null;
        applyGameState(pendingState);
      }

      return next;
    });
  }

  function removeDrawAnim(animId: string) {
    setDrawAnims((prev) => {
      const next = prev.filter((a) => a.animId !== animId);
      activeAnimationsCountRef.current = Math.max(0, activeAnimationsCountRef.current - 1);

      if (activeAnimationsCountRef.current === 0 && pendingGameStateRef.current) {
        const pendingState = pendingGameStateRef.current;
        pendingGameStateRef.current = null;
        applyGameState(pendingState);
      }

      return next;
    });
  }

  function removeDiscardAnim(animId: string) {
    setDiscardAnims((prev) => {
      const next = prev.filter((a) => a.animId !== animId);
      activeAnimationsCountRef.current = Math.max(0, activeAnimationsCountRef.current - 1);

      if (activeAnimationsCountRef.current === 0 && pendingGameStateRef.current) {
        const pendingState = pendingGameStateRef.current;
        pendingGameStateRef.current = null;
        applyGameState(pendingState);
      }

      return next;
    });
  }

  const hasActiveAnims =
    removalAnims.length > 0 ||
    neighAnims.length > 0 ||
    drawAnims.length > 0 ||
    discardAnims.length > 0;

  return (
    <>
      <BoardLayout
        gameState={gameState}
        isMyTurn={isMyTurn}
        isHost={isHost}
        onPlay={play}
        hidePendingPlay={hasActiveAnims}
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
      {removalAnims.map(({ animation, rect }) => (
        <CardRemovalAnimation
          key={animation.animId}
          animation={animation}
          rect={rect}
          onDone={() => removeRemovalAnim(animation.animId)}
        />
      ))}
      {neighAnims.map((animation) => (
        <NeighAnnouncement
          key={animation.animId}
          animation={animation}
          onDone={() => removeNeighAnim(animation.animId)}
        />
      ))}
      {drawAnims.map((animation) => (
        <CardDrawEffect
          key={animation.animId}
          animation={animation}
          localPlayerId={localPlayer.id}
          onDone={() => removeDrawAnim(animation.animId)}
        />
      ))}
      {discardAnims.map((animation) => (
        <CardDiscardEffect
          key={animation.animId}
          animation={animation}
          localPlayerId={localPlayer.id}
          onDone={() => removeDiscardAnim(animation.animId)}
        />
      ))}
    </>
  );
}
