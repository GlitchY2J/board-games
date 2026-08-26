import type { GameState } from '../types/GameState';
import PlayerBoard from '../components/player/PlayerBoard';
import { socket } from '../services/socket';
import './BoardLayout.css';
import CenterArea from '../components/board/CenterArea';
import PhasePanel from '../components/game/PhasePanel';
import Chat from '../components/game/Chat';
import TurnOrder from '../components/game/TurnOrder';
import PhaseActionButton from '../components/game/PhaseActionButton';
import PlayerHand from '../components/player/PlayerHand';
import GameOverlay from '../components/overlay/GameOverlay';
import PendingPlayOverlay from '../components/overlay/PendingPlayOverlay';
import { getPlayerStatus } from '../lib/playerStatus';
import PlayerInfo from '../components/player/PlayerInfo';
import PlayerNotification from '../components/player/PlayerNotification';
import { RotateCcw, LogOut, Bot, Bug, MessageSquare, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeaveConfirm from '../components/overlay/LeaveConfirm';
import { useState, useEffect, useRef } from 'react';

interface Props {
  gameState: GameState;
  gameId?: string;
  isMyTurn: boolean;
  isHost: boolean;
  onPlay(cardId: string, cardIds?: string[]): void;
  hidePendingPlay?: boolean;
  sortHandMode?: 'alphabetical' | 'type' | null;
  spectator?: boolean;
  onLeaveLobby?(): void;
}

export default function BoardLayout({
  gameState,
  gameId,
  isMyTurn,
  isHost,
  onPlay,
  hidePendingPlay = false,
  sortHandMode = null,
  spectator = false,
  onLeaveLobby,
}: Props) {
  const navigate = useNavigate();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [wideTableLayout, setWideTableLayout] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  const [playerNotification, setPlayerNotification] = useState<string | null>(
    null,
  );
  const localPlayer = spectator
    ? undefined
    : gameState.players.find((p) => p.socketId === socket.id);
  const cardSelectedRef = useRef(false);
  const notificationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setWideTableLayout(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function showPlayerNotification(message: string) {
    setPlayerNotification(message);

    if (notificationTimerRef.current !== null) {
      window.clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = window.setTimeout(() => {
      setPlayerNotification(null);
      notificationTimerRef.current = null;
    }, 2200);
  }

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(gameState.roomCode);
      setRoomCodeCopied(true);
      window.setTimeout(() => setRoomCodeCopied(false), 1600);
    } catch {
      setRoomCodeCopied(false);
    }
  }

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current !== null) {
        window.clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onMobileChatShortcut = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.code !== 'Enter') return;
      if (window.innerWidth > 640 || mobileChatOpen) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
      ) {
        return;
      }

      event.preventDefault();
      setMobileChatOpen(true);
    };

    window.addEventListener('keydown', onMobileChatShortcut);
    return () => window.removeEventListener('keydown', onMobileChatShortcut);
  }, [mobileChatOpen]);

  // Keep the same seat map as a regular player. For spectators, the last
  // participant occupies the local seat visually, while remaining passive.
  const layoutLocalPlayer = spectator
    ? gameState.players[gameState.players.length - 1]
    : localPlayer;
  const opponents = gameState.players.filter((P) => P.id !== layoutLocalPlayer?.id);
  const totalPlayers = gameState.players.length;
  const activePlayer = gameState.players[gameState.currentPlayer];
  const isActivePlayer = activePlayer?.socketId === socket.id;
  const showPlayerBoards = gameId !== 'exploding-kittens';
  const showPhases = gameId !== 'exploding-kittens';

  useEffect(() => {
    if (gameId === 'exploding-kittens' || !autoEnabled || !isActivePlayer) return;
    if (gameState.pendingAction || gameState.pendingPlay) return;

    const canAutoAdvance =
      gameState.phase === 'END' ||
      (gameState.phase === 'ACTION' && gameState.actionUsed);

    if (!canAutoAdvance) return;

    const timer = setTimeout(() => {
      socket.emit('next-phase', gameState.roomCode);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    autoEnabled,
    isActivePlayer,
    gameState.phase,
    gameState.actionUsed,
    gameState.pendingAction,
    gameState.pendingPlay,
    gameState.roomCode,
    gameId,
  ]);

  type SeatPosition = 'top' | 'bottom' | 'left' | 'right';
  const positions: SeatPosition[] = wideTableLayout
    ? totalPlayers === 5
      ? ['top', 'top', 'left', 'bottom']
      : totalPlayers === 6
        ? ['top', 'top', 'top', 'left', 'bottom']
        : totalPlayers === 7
          ? ['top', 'top', 'top', 'top', 'left', 'bottom']
          : totalPlayers >= 8
            ? ['top', 'top', 'top', 'top', 'left', 'right', 'bottom']
            : totalPlayers === 4
              ? ['top', 'top', 'bottom']
              : ['top', 'top']
    : totalPlayers === 5
      ? ['top', 'top', 'left', 'right']
      : totalPlayers === 6
        ? ['top', 'top', 'top', 'left', 'right']
        : totalPlayers === 7
          ? ['top', 'top', 'top', 'top', 'left', 'right']
          : totalPlayers >= 8
            ? ['top', 'top', 'top', 'top', 'left', 'left', 'right']
            : totalPlayers === 4
              ? ['top', 'top', 'bottom']
              : ['top', 'top'];
  const seatPositions = positions;
  const localPlayerId = localPlayer?.id ?? '';

  const renderOpponent = (opp: (typeof opponents)[number]) => (
    <div
      key={opp.id}
      data-player-id={opp.id}
      className="player-slot flex-col items-center gap-2"
    >
      <PlayerInfo
        player={opp}
        isActive={opp.id === activePlayer.id}
        status={getPlayerStatus(gameState, opp.id, gameId)}
        localPlayerId={localPlayerId}
        gameId={gameId}
        turnsRemaining={opp.id === activePlayer.id ? gameState.turnsRemaining : 0}
        isHost={isHost}
        roomCode={gameState.roomCode}
      />
      {showPlayerBoards && (
        <PlayerBoard
          player={opp}
          isLocalPlayer={false}
          isMyTurn={opp.id === activePlayer.id}
        />
      )}
    </div>
  );

  const queenBeeOwner = gameState.players.find((p) =>
    p.stable.some((c) => c.id === 'queen_bee_unicorn'),
  );

  const queenBeeOwnerId =
    queenBeeOwner &&
    !queenBeeOwner.downgrades.some((c) => c.id === 'blinding_light')
      ? queenBeeOwner.id
      : undefined;

  const blockedBasicUnicornIds = new Set(
    queenBeeOwnerId !== undefined && queenBeeOwnerId !== localPlayer?.id
        ? (localPlayer?.hand ?? [])
          .filter((c) => c.cardType === 'unicorn' && c.unicornClass === 'basic')
          .map((c) => c.uid)
      : [],
  );

  const hasBrokenStable =
    localPlayer?.downgrades.some((c) => c.id === 'broken_stable') ?? false;

  const blockedUpgradeIds = hasBrokenStable
    ? new Set(
        (localPlayer?.hand ?? [])
          .filter((c) => c.cardType === 'upgrade')
          .map((c) => c.uid),
      )
    : new Set<string>();

  const blockedCardIds = new Set<string>([
    ...blockedBasicUnicornIds,
    ...blockedUpgradeIds,
  ]);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }

      if (e.isComposing) return;
      if (e.code !== 'Space') return;

      const canDraw =
        isMyTurn &&
        (gameState.phase === 'DRAW' || gameState.phase === 'ACTION') &&
        !gameState.actionUsed &&
        !gameState.pendingAction &&
        !gameState.pendingPlay &&
        (gameState.actionPlaysRemaining === undefined ||
          gameState.actionPlaysRemaining === 2);

      if (!canDraw || cardSelectedRef.current) return;

      e.preventDefault();
      socket.emit('draw-action-card', {
        roomCode: gameState.roomCode,
        playerId: localPlayerId,
      });
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMyTurn, gameState, localPlayerId]);

  if (!localPlayer && !spectator) return null;
  const winner = gameState.winnerId
    ? gameState.players.find((player) => player.id === gameState.winnerId)
      ?? (gameState.winnerName ? { name: gameState.winnerName } : undefined)
    : undefined;

  return (
    <div className={`board-layout players-${Math.min(totalPlayers, 8)} ${gameId === 'exploding-kittens' ? 'game-exploding-kittens' : ''}`}>
      <div className="game-area">
        <div className="player-top">
          {opponents.filter((opp) => seatPositions[opponents.indexOf(opp)] === 'top').map(renderOpponent)}
        </div>

        <div className="middle">
          <div className="turn-order-side">
            <TurnOrder gameState={gameState} localPlayerId={localPlayerId} />
          </div>

          <div className="player-side player-side-left">
             {opponents.filter((opp) => seatPositions[opponents.indexOf(opp)] === 'left').map(renderOpponent)}
          </div>

          <div className="player-side player-side-right">
             {opponents.filter((opp) => seatPositions[opponents.indexOf(opp)] === 'right').map(renderOpponent)}
          </div>

          <div className="center-wrap">
            <div className="center">
              <div className="center-column" data-center-area>
                <div className="center-stack">
                  <CenterArea
                    gameState={gameState}
                    isMyTurn={isMyTurn}
                    localPlayerId={localPlayerId}
                    gameId={gameId}
                  />

                  {showPhases && isMyTurn && gameState.phase === 'DRAW' && (
                    <span className="draw-hint">
                      Presiona <kbd className="space-key">Space</kbd> para robar una carta
                    </span>
                  )}

                  {gameId === 'exploding-kittens' &&
                    isMyTurn &&
                    !gameState.pendingAction &&
                    !gameState.pendingPlay && (
                      <span className="draw-hint">
                        Presiona <kbd className="space-key">Space</kbd> para robar una carta y terminar tu turno
                      </span>
                    )}

                  {showPhases && isMyTurn &&
                    gameState.phase === 'ACTION' &&
                    !gameState.actionUsed &&
                    !gameState.pendingPlay && (
                      <span className="draw-hint">
                        Juega una carta o presiona <kbd className="space-key">Space</kbd> para robar
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="chat-side">
            <Chat gameState={gameState} />
          </div>
        </div>

        <div className="player-bottom">
          {layoutLocalPlayer && <div
            className="player-slot local-player-slot flex-col items-center gap-2"
            data-player-id={layoutLocalPlayer.id}
          >
            {playerNotification && (
              <PlayerNotification message={playerNotification} />
            )}

            <PlayerInfo
              player={layoutLocalPlayer}
              isActive={layoutLocalPlayer.id === activePlayer?.id}
              status={getPlayerStatus(gameState, layoutLocalPlayer.id, gameId)}
              localPlayerId={localPlayerId}
              gameId={gameId}
              turnsRemaining={layoutLocalPlayer.id === activePlayer?.id ? gameState.turnsRemaining : 0}
              isHost={isHost}
              roomCode={gameState.roomCode}
            />

            {showPlayerBoards && (
                <PlayerBoard
                  player={layoutLocalPlayer}
                  isLocalPlayer={!spectator}
                  isMyTurn={layoutLocalPlayer.id === activePlayer?.id && !spectator}
              />
            )}
          </div>}

          {opponents.map((opp) => {
             const position = seatPositions[opponents.indexOf(opp)];
            if (position !== 'bottom') return null;
            return renderOpponent(opp);
          })}
        </div>
      </div>

      {spectator && winner && (
        <div className="spectator-result" role="status">
          <span>Partida terminada</span>
          <strong>{winner.name} ganó</strong>
        </div>
      )}

      {!spectator && (
        <GameOverlay
          gameState={gameState}
          localPlayerId={localPlayerId}
          hide={hidePendingPlay}
        />
      )}

      <PendingPlayOverlay
        gameState={gameState}
        localPlayerId={spectator ? '' : localPlayerId}
        gameId={gameId}
        hide={hidePendingPlay}
        spectator={spectator}
      />

      <div className="corner-controls">
        {!spectator && (
          <button
            className="room-code-display"
            title="Copiar código de sala"
            onClick={copyRoomCode}
          >
            <span className="room-code-label">Sala</span>
            <strong>{gameState.roomCode}</strong>
            {roomCodeCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}

        {gameId !== 'exploding-kittens' && (
          <button
            className={`ctrl-button ctrl-neutral${autoEnabled ? ' auto-on' : ''}`}
            title={
              autoEnabled ? 'Desactivar modo automático' : 'Activar modo automático'
            }
            onClick={() => setAutoEnabled((v) => !v)}
          >
            <Bot size={16} />
          </button>
        )}

        {isHost && (
          <button
            className={`ctrl-button ctrl-neutral${
              gameState.debugMode ? ' auto-on' : ''
            }`}
            title={
              gameState.debugMode
                ? 'Desactivar modo debug'
                : 'Activar modo debug (elegir carta del mazo en la fase de robo)'
            }
            onClick={() =>
              socket.emit('toggle-debug-mode', gameState.roomCode)
            }
          >
            <Bug size={16} />
          </button>
        )}

        {isHost && (
          <button
            className="ctrl-button ctrl-reset"
            title="Reiniciar partida"
            onClick={() => {
              socket.emit('restart-game', gameState.roomCode);
            }}
          >
            <RotateCcw size={16} />
          </button>
        )}

        <button
          className="ctrl-button ctrl-leave"
          title="Salir de la partida"
          onClick={() => setLeaveOpen(true)}
        >
          <LogOut size={16} />
        </button>
      </div>

      {leaveOpen && (
        <LeaveConfirm
          onCancel={() => setLeaveOpen(false)}
          onConfirm={() => {
            if (onLeaveLobby) {
              onLeaveLobby();
            } else {
              socket.emit('leave-game', { roomCode: gameState.roomCode });
              navigate('/lobby');
            }
            setMobileChatOpen(false);
          }}
        />
      )}

      <button
        className="mobile-chat-toggle"
        title="Chat"
        onClick={() => setMobileChatOpen((v) => !v)}
      >
        <MessageSquare size={18} />
      </button>

      {mobileChatOpen && (
        <div className="mobile-chat-panel">
          <div className="mobile-chat-panel-inner">
            <Chat
              gameState={gameState}
              initialOpen
              onClose={() => setMobileChatOpen(false)}
            />
          </div>
        </div>
      )}

      {!spectator && (showPhases || gameId === 'exploding-kittens' || gameId === 'exploding_kittens' || gameId === 'explodingKittens') && (
        <>
          <div className="phase-panel-anchor">
            <PhasePanel gameState={gameState} showRoundPhase={showPhases} />
          </div>

          {showPhases && (
            <div className="phase-action-anchor">
              <PhaseActionButton gameState={gameState} autoEnabled={autoEnabled} />
            </div>
          )}
        </>
      )}

      {!spectator && (
        <div className="bottom-hand" data-hand>
          <PlayerHand
            player={localPlayer!}
            isLocalPlayer
            isMyTurn={isMyTurn}
            gamePhase={showPhases ? gameState.phase : 'ACTION'}
            actionUsed={gameState.actionUsed}
            pendingPlay={!!gameState.pendingPlay}
            blockedCardIds={blockedCardIds}
            onPlay={onPlay}
            onPlayCards={(cardIds) => onPlay(cardIds[0], cardIds)}
            compact={gameId === 'exploding-kittens' || gameId === 'exploding_kittens' || gameId === 'explodingKittens'}
            gameId={gameId}
            sortHandMode={sortHandMode}
            onInvalidAction={showPlayerNotification}
            onSelectionChange={(selected) => {
              cardSelectedRef.current = selected;
            }}
          />
        </div>
      )}
    </div>
  );
}
