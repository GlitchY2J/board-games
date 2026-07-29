import type { GameState } from '../types/GameState';
import PlayerBoard from '../components/player/PlayerBoard';
import { socket } from '../services/socket';
import './BoardLayout.css';
import CenterArea from '../components/board/CenterArea';
import PhasePanel from '../components/game/PhasePanel';
import DiscardToHandLimit from '../components/actions/DiscardToHandLimit';
import PlayerHand from '../components/player/PlayerHand';
interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  onPlay(cardId: string): void;
}

export default function BoardLayout({ gameState, isMyTurn, onPlay }: Props) {
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);

  if (!localPlayer) return;
  const opponents = gameState.players.filter((P) => P.socketId !== socket.id);

  return (
    <div className="board-layout">
      {opponents[0] && (
        <div className="top-hand">
          <PlayerHand
            player={opponents[0]}
            isLocalPlayer={false}
            isMyTurn={false}
            gamePhase={gameState.phase}
            onPlay={() => {}}
          />
        </div>
      )}

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
              <PhasePanel gameState={gameState} />
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

          {gameState.pendingAction?.type === 'discard_to_hand_limit' &&
            gameState.pendingAction.playerId === localPlayer.id && (
              <DiscardToHandLimit
                gameState={gameState}
                playerId={localPlayer.id}
              />
            )}
        </div>
      </div>
      <div className="bottom-hand">
        <PlayerHand
          player={localPlayer}
          isLocalPlayer
          isMyTurn={isMyTurn}
          gamePhase={gameState.phase}
          onPlay={onPlay}
        />
      </div>
    </div>
  );
}
