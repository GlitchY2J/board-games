import type { GameState } from '../types/GameState';
import PlayerBoard from '../components/player/PlayerBoard';
import { socket } from '../services/socket';
import './BoardLayout.css';
import CenterArea from '../components/board/CenterArea';
import PhasePanel from '../components/game/PhasePanel';
import PhaseActionButton from '../components/game/PhaseActionButton';
import PlayerHand from '../components/player/PlayerHand';
import GameOverlay from '../components/overlay/GameOverlay';
import PendingPlayOverlay from '../components/overlay/PendingPlayOverlay';
import { getPlayerStatus } from '../lib/playerStatus';
import PlayerInfo from '../components/player/PlayerInfo';
import { RotateCcw, LogOut, Bot, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import LeaveConfirm from '../components/overlay/LeaveConfirm';
import { useState, useEffect } from 'react';
interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  isHost: boolean;
  onPlay(cardId: string): void;
  hidePendingPlay?: boolean;
}

export default function BoardLayout({ gameState, isMyTurn, isHost, onPlay, hidePendingPlay = false }: Props) {
  const navigate = useNavigate();
  const { deactivate } = useGame();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);

  if (!localPlayer) return;
  const opponents = gameState.players.filter((P) => P.socketId !== socket.id);
  const totalPlayers = gameState.players.length;
  const activePlayer = gameState.players[gameState.currentPlayer];
  const isActivePlayer = activePlayer?.socketId === socket.id;

  useEffect(() => {
    if (!autoEnabled || !isActivePlayer) return;
    if (gameState.pendingAction || gameState.pendingPlay) return;

    const canAutoAdvance =
      gameState.phase === 'BEGINNING' ||
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
  ]);

  const positions: ('top' | 'bottom')[] =
    totalPlayers === 4
      ? ['top', 'top', 'bottom']
      : ['top', 'top'];

  const queenBeeOwnerId = gameState.players.find((p) =>
    p.stable.some((c) => c.id === 'queen_bee_unicorn'),
  )?.id;

  const blockedBasicUnicornIds = new Set(
    queenBeeOwnerId !== undefined && queenBeeOwnerId !== localPlayer.id
      ? localPlayer.hand
          .filter((c) => c.cardType === 'unicorn' && c.unicornClass === 'basic')
          .map((c) => c.uid)
      : [],
  );

  const hasBrokenStable =
    localPlayer.downgrades.some((c) => c.id === 'broken_stable') ?? false;

  const blockedUpgradeIds = hasBrokenStable
    ? new Set(
        localPlayer.hand
          .filter((c) => c.cardType === 'upgrade')
          .map((c) => c.uid),
      )
    : new Set<string>();

  const blockedCardIds = new Set<string>([
    ...blockedBasicUnicornIds,
    ...blockedUpgradeIds,
  ]);

  return (
    <div className="board-layout">
      <div className="game-area">
        <div className="player-top">
          {opponents.map((opp) => {
            const position = positions[opponents.indexOf(opp)];
            if (position !== 'top') return null;
            return (
              <div key={opp.id} className="player-slot flex-col items-center gap-2">
                <PlayerInfo
                  player={opp}
                  isActive={opp.id === activePlayer.id}
                  status={getPlayerStatus(gameState, opp.id)}
                  localPlayerId={localPlayer.id}
                />
                <PlayerBoard
                  player={opp}
                  isLocalPlayer={false}
                  isMyTurn={opp.id === activePlayer.id}
                />
              </div>
            );
          })}
        </div>

<div className="middle">
          <div className="center">
            <div className="center-column">
              <div className="center-stack">
                <CenterArea
                  gameState={gameState}
                  isMyTurn={isMyTurn}
                  localPlayerId={localPlayer.id}
                />
                {isMyTurn && gameState.phase === 'DRAW' && (
                  <span className="draw-hint">Roba una carta</span>
                )}
                {isMyTurn &&
                  gameState.phase === 'ACTION' &&
                  !gameState.actionUsed &&
                  !gameState.pendingPlay && (
                    <span className="draw-hint">Juega o roba una carta</span>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="player-bottom">
          <div className="player-slot flex-col items-center gap-2">
            <PlayerInfo
              player={localPlayer}
              isActive={isMyTurn}
              status={getPlayerStatus(gameState, localPlayer.id)}
              localPlayerId={localPlayer.id}
            />
            <PlayerBoard
              player={localPlayer}
              isLocalPlayer
              isMyTurn={isMyTurn}
            />
          </div>
          {opponents.map((opp) => {
            const position = positions[opponents.indexOf(opp)];
            if (position !== 'bottom') return null;
            return (
              <div
                key={opp.id}
                className="player-slot flex-col items-center gap-2"
              >
                <PlayerInfo
                  player={opp}
                  isActive={opp.id === activePlayer.id}
                  status={getPlayerStatus(gameState, opp.id)}
                  localPlayerId={localPlayer.id}
                />
                <PlayerBoard
                  player={opp}
                  isLocalPlayer={false}
                  isMyTurn={opp.id === activePlayer.id}
                />
              </div>
            );
          })}

          {/* {gameState.pendingAction?.type === 'discard' &&
            gameState.pendingAction.playerId === localPlayer.id && (
              <DiscardToHandLimit
                gameState={gameState}
                playerId={localPlayer.id}
              />
            )} */}
        </div>
      </div>
      <GameOverlay gameState={gameState} localPlayerId={localPlayer.id} hide={hidePendingPlay} />
      <PendingPlayOverlay gameState={gameState} localPlayerId={localPlayer.id} hide={hidePendingPlay} />
      <div className="corner-controls">
        <button
          className={`ctrl-button ctrl-neutral${autoEnabled ? ' auto-on' : ''}`}
          title={autoEnabled ? 'Desactivar modo automático' : 'Activar modo automático'}
          onClick={() => setAutoEnabled((v) => !v)}
        >
          <Bot size={16} />
        </button>
        {isHost && (
          <button
            className={`ctrl-button ctrl-neutral${gameState.debugMode ? ' auto-on' : ''}`}
            title={
              gameState.debugMode
                ? 'Desactivar modo debug'
                : 'Activar modo debug (elegir carta del mazo en la fase de robo)'
            }
            onClick={() => socket.emit('toggle-debug-mode', gameState.roomCode)}
          >
            <Bug size={16} />
          </button>
        )}
        {isHost && (
          <button
            className="ctrl-button ctrl-reset"
            title="Reiniciar partida"
            onClick={() => socket.emit('restart-game', gameState.roomCode)}
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
            socket.emit('leave-room', { roomCode: gameState.roomCode });
            deactivate();
            navigate('/');
          }}
        />
      )}
      <div className="phase-panel-anchor">
        <PhasePanel gameState={gameState} />
      </div>
      <div className="phase-action-anchor">
        <PhaseActionButton gameState={gameState} autoEnabled={autoEnabled} />
      </div>
      <div className="bottom-hand" data-hand>
        <PlayerHand
          player={localPlayer}
          isLocalPlayer
          isMyTurn={isMyTurn}
          gamePhase={gameState.phase}
          actionUsed={gameState.actionUsed}
          pendingPlay={!!gameState.pendingPlay}
          blockedCardIds={blockedCardIds}
          onPlay={onPlay}
        />
      </div>
    </div>
  );
}
