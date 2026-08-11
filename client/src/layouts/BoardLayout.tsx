import type { GameState } from '../types/GameState';
import PlayerBoard from '../components/player/PlayerBoard';
import { socket } from '../services/socket';
import './BoardLayout.css';
import CenterArea from '../components/board/CenterArea';
import PhasePanel from '../components/game/PhasePanel';
import PhaseActionButton from '../components/game/PhaseActionButton';
import PlayerHand from '../components/player/PlayerHand';
import GameOverlay from '../components/overlay/GameOverlay';
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
              onPlay={() => {}}
            />
          )}
        </div>

        <div className="middle">
          <div className="player-left" />
          <div className="center">
            <div className="center-column">
              <CenterArea
                gameState={gameState}
                isMyTurn={isMyTurn}
                localPlayerId={localPlayer.id}
              />
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
      <div className="phase-panel-anchor">
        <PhasePanel gameState={gameState} />
      </div>
      <div className="phase-action-anchor">
        <PhaseActionButton gameState={gameState} />
      </div>
      {isHost && (
        <button
          className="debug-reset"
          onClick={() => socket.emit('restart-game', gameState.roomCode)}
        >
          Reiniciar partida
        </button>
      )}
      <div className="bottom-hand" data-hand>
        <PlayerHand
          player={localPlayer}
          isLocalPlayer
          isMyTurn={isMyTurn}
          gamePhase={gameState.phase}
          actionUsed={gameState.actionUsed}
          onPlay={onPlay}
        />
      </div>
    </div>
  );
}
