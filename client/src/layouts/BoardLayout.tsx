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
import { RotateCcw } from 'lucide-react';
interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  isHost: boolean;
  onPlay(cardId: string): void;
}

export default function BoardLayout({ gameState, isMyTurn, isHost, onPlay }: Props) {
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);

  if (!localPlayer) return;
  const opponents = gameState.players.filter((P) => P.socketId !== socket.id);

  return (
    <div className="board-layout">
      <div className="game-area">
        <div className="player-top">
          {opponents[0] && (
            <PlayerBoard
              player={opponents[0]}
              isLocalPlayer={false}
              position="top"
              isMyTurn={false}
              gamePhase={gameState.phase}
              status={getPlayerStatus(gameState, opponents[0].id)}
              onPlay={() => {}}
            />
          )}
        </div>

        <div className="middle">
          <div className="player-left" />
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
          <div className="player-right" />
        </div>

        <div className="player-bottom">
          <PlayerBoard
            player={localPlayer}
            isLocalPlayer
            position="bottom"
            isMyTurn={isMyTurn}
            onPlay={onPlay}
            gamePhase={gameState.phase}
            status={getPlayerStatus(gameState, localPlayer.id)}
          />

          {/* {gameState.pendingAction?.type === 'discard' &&
            gameState.pendingAction.playerId === localPlayer.id && (
              <DiscardToHandLimit
                gameState={gameState}
                playerId={localPlayer.id}
              />
            )} */}
        </div>
      </div>
      <GameOverlay gameState={gameState} localPlayerId={localPlayer.id} />
      <PendingPlayOverlay gameState={gameState} localPlayerId={localPlayer.id} />
      <div className="phase-panel-anchor">
        <PhasePanel gameState={gameState} />
      </div>
      <div className="phase-action-anchor">
        <PhaseActionButton gameState={gameState} />
      </div>
      {isHost && (
        <button
          className="debug-reset"
          title="Reiniciar partida"
          onClick={() => socket.emit('restart-game', gameState.roomCode)}
        >
          <RotateCcw size={16} />
        </button>
      )}
      <div className="bottom-hand" data-hand>
        <PlayerHand
          player={localPlayer}
          isLocalPlayer
          isMyTurn={isMyTurn}
          gamePhase={gameState.phase}
          actionUsed={gameState.actionUsed}
          pendingPlay={!!gameState.pendingPlay}
          onPlay={onPlay}
        />
      </div>
    </div>
  );
}
