import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { useGame } from '../context/useGame';
import type { GameState } from '../types/GameState';
import BoardLayout from '../layouts/BoardLayout';
import VictoryScreen from '../components/game/VictoryScreen';
import TurnAnnouncement from '../components/game/TurnAnnouncement';
import CardDrawEffect from '../components/effects/CardDrawEffect';
import CardDiscardEffect from '../components/effects/CardDiscardEffect';
import CardPlayEffect from '../components/effects/CardPlayEffect';
import CardRemovalAnimation from '../components/effects/CardRemovalAnimation';
import CardStealEffect from '../components/effects/CardStealEffect';
import ShuffleDeckEffect from '../components/effects/ShuffleDeckEffect';
import NeighAnnouncement from '../components/game/NeighAnnouncement';
import type { CardAnimation, NeighAnimation, DrawAnimation, DiscardAnimation, PlayAnimation, StealAnimation, ShuffleAnimation } from '../../../shared/types/SocketEvents.ts';
import { Loader2 } from 'lucide-react';

interface TurnAnnounce {
  name: string;
  isActivePlayer: boolean;
  turn: number;
  currentPlayer: number;
}

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameState: contextGameState, playerId: contextPlayerId, isHost: contextIsHost, room: roomFromContext, deactivate } = useGame();
  const locationGameState = location.state?.gameState as GameState | undefined;

  const [gameState, setGameState] = useState<GameState | null>(
    locationGameState ?? contextGameState ?? null,
  );
  const skippedInitialContextStateRef = useRef(Boolean(locationGameState));

  const [turnAnnounce, setTurnAnnounce] = useState<TurnAnnounce | null>(null);
  const [sortHandMode, setSortHandMode] = useState<
    'alphabetical' | 'type' | null
  >(null);
  const gameId = roomFromContext?.settings?.gameId ?? roomFromContext?.game;

  useEffect(() => {
    const onSortHand = (event: KeyboardEvent) => {
      if (gameId !== 'unstable-unicorns' && gameId !== 'exploding-kittens') return;
      if (event.code !== 'KeyS' && event.key.toLowerCase() !== 's') return;
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      event.preventDefault();
      setSortHandMode((mode) => (mode === 'alphabetical' ? 'type' : 'alphabetical'));
    };

    window.addEventListener('keydown', onSortHand, true);
    return () => {
      window.removeEventListener('keydown', onSortHand, true);
    };
  }, [gameId]);

  const [removalAnims, setRemovalAnims] = useState<
    { animation: CardAnimation; rect: { left: number; top: number; width: number; height: number } }[]
  >([]);
  const [neighAnims, setNeighAnims] = useState<NeighAnimation[]>([]);
  const [drawAnims, setDrawAnims] = useState<DrawAnimation[]>([]);
  const [stealAnims, setStealAnims] = useState<StealAnimation[]>([]);
  const [discardAnims, setDiscardAnims] = useState<DiscardAnimation[]>([]);
  const [playAnims, setPlayAnims] = useState<PlayAnimation[]>([]);
  const [shuffleAnims, setShuffleAnims] = useState<ShuffleAnimation[]>([]);

  const pendingGameStateRef = useRef<GameState | null>(null);
  const activeAnimationsCountRef = useRef(0);
  const leavingToLobbyRef = useRef(false);

  const prevTurnRef = useRef<{ turn: number; currentPlayer: number } | null>(
    null,
  );

  const announcedInitialRef = useRef(false);

  const announceGameState = useCallback((state: GameState) => {
    const prev = prevTurnRef.current;
    const active = state.players[state.currentPlayer];
    if (!active) {
      prevTurnRef.current = {
        turn: state.turn,
        currentPlayer: state.currentPlayer,
      };
      return;
    }

    // Al iniciar por primera vez o tras un reinicio (el turno vuelve a bajar)
    // siempre se anuncia el turno, aunque coincidan turn/currentPlayer con el
    // estado anterior.
    const isFirst = !prev;
    const isRestart = !!prev && state.turn < prev.turn;

    if (
      isFirst ||
      isRestart ||
      state.turn !== prev.turn ||
      state.currentPlayer !== prev.currentPlayer
    ) {
      setTurnAnnounce({
        name: active.name,
        isActivePlayer: active.socketId === socket.id,
        turn: state.turn,
        currentPlayer: state.currentPlayer,
      });
    }
    prevTurnRef.current = { turn: state.turn, currentPlayer: state.currentPlayer };
  }, []);

  const isSpectatorState = useCallback((state: GameState) => {
    return (
      !state.players.some((player) => player.socketId === socket.id) &&
      state.eliminatedPlayers?.some((player) => player.id === contextPlayerId) === true
    );
  }, [contextPlayerId]);

  const applyGameState = useCallback((state: GameState) => {
    setGameState(state);
    announceGameState(state);
  }, [announceGameState]);

  useEffect(() => {
    if (contextGameState) {
      if (skippedInitialContextStateRef.current) {
        skippedInitialContextStateRef.current = false;
        return;
      }

      if (activeAnimationsCountRef.current > 0) {
        pendingGameStateRef.current = contextGameState;
      } else {
        setGameState(contextGameState);
      }
    }
  }, [contextGameState]);

  // El estado inicial llega vía location.state (Lobby) o contexto. Hay que
  // pasarlo por applyGameState para que el anuncio del primer turno se muestre
  // inmediatamente, sin esperar al primer game-updated (primer draw).
  useEffect(() => {
    if (announcedInitialRef.current) return;
    if (!gameState) return;
    announcedInitialRef.current = true;
    announceGameState(gameState);
  }, [gameState, announceGameState]);

  useEffect(() => {
    if (!turnAnnounce) return;
    const timer = setTimeout(() => setTurnAnnounce(null), 2200);
    return () => clearTimeout(timer);
  }, [turnAnnounce]);

  useEffect(() => {
    const onTurnOrderAssigned = (players: { id: string; name: string; avatar?: string }[]) => {
      navigate('/starting', {
        state: {
          restart: true,
          turnOrder: players,
        },
      });
    };
    const onKickedFromRoom = () => {
      deactivate();
      navigate('/');
    };
    const onGameTerminated = () => {
      navigate('/lobby');
    };

    const onGameUpdated = (state: GameState) => {
      if (isSpectatorState(state)) {
        activeAnimationsCountRef.current = 0;
        pendingGameStateRef.current = null;
        applyGameState(state);
        return;
      }
      if (activeAnimationsCountRef.current > 0) {
        pendingGameStateRef.current = state;
      } else {
        applyGameState(state);
      }
    };

    const onGameRestarted = (state: GameState) => {
      // Reinicio: forzar que el anuncio de turno se muestre de nuevo.
      prevTurnRef.current = null;
      pendingGameStateRef.current = null;
      activeAnimationsCountRef.current = 0;
      applyGameState(state);
    };

    socket.on('game-updated', onGameUpdated);
    socket.on('game-restarted', onGameRestarted);
    socket.on('turn-order-assigned', onTurnOrderAssigned);
    socket.on('kicked-from-room', onKickedFromRoom);
    socket.on('game-terminated', onGameTerminated);

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
      if (animations.length === 0) return;

      // De una cadena de Neighs solo importa el último (el que gana).
      const last = animations[animations.length - 1];
      setNeighAnims((prev) => {
        activeAnimationsCountRef.current = Math.max(
          0,
          activeAnimationsCountRef.current - prev.length + 1,
        );
        return [last];
      });
    };

    const onDrawAnimations = (animations: DrawAnimation[]) => {
      if (animations.length > 0) {
        activeAnimationsCountRef.current += animations.length;
        setDrawAnims((prev) => [...prev, ...animations]);
      }
    };

    const onStealAnimations = (animations: StealAnimation[]) => {
      if (animations.length > 0) {
        activeAnimationsCountRef.current += animations.length;
        setStealAnims((prev) => [...prev, ...animations]);
      }
    };

    const onDiscardAnimations = (animations: DiscardAnimation[]) => {
      if (animations.length > 0) {
        activeAnimationsCountRef.current += animations.length;
        setDiscardAnims((prev) => [...prev, ...animations]);
      }
    };

    const onPlayAnimations = (animations: PlayAnimation[]) => {
      if (animations.length > 0) {
        setPlayAnims((prev) => [...prev, ...animations]);
      }
    };

    const onShuffleAnimations = (animations: ShuffleAnimation[]) => {
      setShuffleAnims((prev) => [...prev, ...animations]);
    };

    socket.on('card-animations', onCardAnimations);
    socket.on('neigh-animations', onNeighAnimations);
    socket.on('draw-animations', onDrawAnimations);
    socket.on('steal-animations', onStealAnimations);
    socket.on('discard-animations', onDiscardAnimations);
    socket.on('play-animations', onPlayAnimations);
    socket.on('shuffle-animations', onShuffleAnimations);

    return () => {
      socket.off('game-updated', onGameUpdated);
      socket.off('game-restarted', onGameRestarted);
      socket.off('turn-order-assigned', onTurnOrderAssigned);
      socket.off('kicked-from-room', onKickedFromRoom);
      socket.off('game-terminated', onGameTerminated);
      socket.off('card-animations');
      socket.off('neigh-animations');
      socket.off('draw-animations');
      socket.off('steal-animations');
      socket.off('discard-animations');
      socket.off('play-animations');
      socket.off('shuffle-animations', onShuffleAnimations);
    };
  }, [applyGameState, deactivate, isSpectatorState, navigate]);

  const activePlayer = gameState?.players[gameState.currentPlayer];
  const localPlayer = gameState?.players.find((p) => p.socketId === socket.id);
  const isMyTurn = !!activePlayer && activePlayer.socketId === socket.id;
  const isSpectatorPlayer = roomFromContext?.players.some(
    (player) => player.id === contextPlayerId && player.isSpectator,
  ) ?? false;

  useEffect(() => {
    if (!gameState) return;
    const local = gameState.players.find((p) => p.socketId === socket.id);
    const isEliminated = gameState.eliminatedPlayers?.some(
      (player) => player.id === contextPlayerId,
    );
    if (!local && !isEliminated && !isSpectatorPlayer && !leavingToLobbyRef.current) {
      deactivate();
    }
  }, [contextPlayerId, gameState, deactivate, isSpectatorPlayer]);

  // Ejecutar automáticamente los efectos de inicio de turno después del anuncio de turno
  useEffect(() => {
    if (!gameState || !isMyTurn) return;
    if (gameState.phase !== 'BEGINNING') return;
    if (turnAnnounce) return; // Esperar a que termine la animación de anuncio de turno
    if (gameState.pendingAction || gameState.pendingPlay) return;

    socket.emit('next-phase', gameState.roomCode);
  }, [
    gameState,
    isMyTurn,
    turnAnnounce,
  ]);

  if (!gameState) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-emerald-400" size={40} />
        <p className="text-sm text-slate-400 font-medium">Cargando partida...</p>
      </div>
    );
  }

  const victoryPlayerIds = new Set([
    ...gameState.players.map((player) => player.id),
    ...(gameState.eliminatedPlayers?.map((player) => player.id) ?? []),
  ]);
  const restartTotalPlayers = roomFromContext
    ? roomFromContext.players.filter((player) => victoryPlayerIds.has(player.id)).length
    : victoryPlayerIds.size;
  const effectViewerId = localPlayer?.id ?? contextPlayerId ?? '';
  const renderTransientEffects = () => (
    <>
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
      {neighAnims.length > 0 && (
        <NeighAnnouncement
          key={neighAnims[0].animId}
          animation={neighAnims[0]}
          onDone={() => removeNeighAnim(neighAnims[0].animId)}
        />
      )}
      {drawAnims.map((animation) => (
        <CardDrawEffect
          key={animation.animId}
          animation={animation}
          localPlayerId={effectViewerId}
          onDone={() => removeDrawAnim(animation.animId)}
        />
      ))}
      {stealAnims.map((animation) => (
        <CardStealEffect
          key={animation.animId}
          animation={animation}
          localPlayerId={effectViewerId}
          onDone={() => removeStealAnim(animation.animId)}
        />
      ))}
      {discardAnims.map((animation) => (
        <CardDiscardEffect
          key={animation.animId}
          animation={animation}
          localPlayerId={effectViewerId}
          onDone={() => removeDiscardAnim(animation.animId)}
        />
      ))}
      {playAnims.map((animation) => (
        <CardPlayEffect
          key={animation.animId}
          animation={animation}
          localPlayerId={effectViewerId}
          onDone={() => removePlayAnim(animation.animId)}
        />
      ))}
      {shuffleAnims.map((animation) => (
        <ShuffleDeckEffect
          key={animation.animId}
          animation={animation}
          onDone={() => setShuffleAnims((prev) => prev.filter((item) => item.animId !== animation.animId))}
        />
      ))}
    </>
  );

  if (!localPlayer) {
    if (isSpectatorPlayer) {
      return (
        <>
          <BoardLayout
            gameState={gameState}
            gameId={gameId}
            isMyTurn={false}
            isHost={false}
            onPlay={() => undefined}
            spectator
            onLeaveLobby={leaveToLobby}
          />
          {renderTransientEffects()}
        </>
      );
    }

    const eliminated = gameState.eliminatedPlayers?.find(
      (player) => player.id === contextPlayerId,
    );
    if (eliminated) {
      if (gameState.winnerId) {
        return (
          <VictoryScreen
            gameState={gameState}
            localPlayerId={contextPlayerId ?? ''}
            onReadyRestart={() => socket.emit('ready-restart', gameState.roomCode)}
            onLeaveLobby={leaveToLobby}
            restartReadyCount={gameState.restartReadyPlayerIds?.length ?? 0}
            restartTotalPlayers={restartTotalPlayers}
            isRestartReady={contextPlayerId ? gameState.restartReadyPlayerIds?.includes(contextPlayerId) ?? false : false}
          />
        );
      }

      return (
        <div className="relative min-h-screen">
          <BoardLayout
            gameState={gameState}
            gameId={gameId}
            isMyTurn={false}
            isHost={false}
            onPlay={() => undefined}
            spectator
          />
          <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-rose-400/30 bg-slate-950/85 px-4 py-2 text-center text-xs font-bold text-rose-200 shadow-xl backdrop-blur">
            Espectador · Eliminado en {eliminated.placement}° lugar
          </div>
          {shuffleAnims.map((animation) => (
            <ShuffleDeckEffect
              key={animation.animId}
              animation={animation}
              onDone={() => setShuffleAnims((prev) => prev.filter((item) => item.animId !== animation.animId))}
            />
          ))}
        </div>
      );
    }
    return <h2>Jugador no encontrado.</h2>;
  }

  const isHost = contextIsHost || localPlayer.id === roomFromContext?.hostId;
  const gs: GameState = gameState;

  function play(cardId: string, cardIds?: string[]) {
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
      cardIds,
    });
  }

  function restartGame() {
    console.log('Solicitando reinicio...');
    socket.emit('ready-restart', gs.roomCode);
  }

  function leaveToLobby() {
    const roomCode = gameState?.roomCode ?? roomFromContext?.code;
    if (!roomCode) return;
    leavingToLobbyRef.current = true;
    socket.emit('leave-game', { roomCode });
    navigate('/lobby');
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

  function removeStealAnim(animId: string) {
    setStealAnims((prev) => {
      const next = prev.filter((animation) => animation.animId !== animId);
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

  function removePlayAnim(animId: string) {
    setPlayAnims((prev) => prev.filter((a) => a.animId !== animId));
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
        gameId={gameId}
        isMyTurn={isMyTurn}
        isHost={isHost}
        onPlay={play}
        sortHandMode={sortHandMode}
        hidePendingPlay={hasActiveAnims}
        onLeaveLobby={leaveToLobby}
      />
      {gameState.winnerId && (
        <VictoryScreen
          gameState={gameState}
          localPlayerId={localPlayer.id}
          onReadyRestart={restartGame}
          onLeaveLobby={leaveToLobby}
          restartReadyCount={gs.restartReadyPlayerIds?.length ?? 0}
          restartTotalPlayers={restartTotalPlayers}
          isRestartReady={gs.restartReadyPlayerIds?.includes(localPlayer.id) ?? false}
        />
      )}
      {renderTransientEffects()}
    </>
  );
}
