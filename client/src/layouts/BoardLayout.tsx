import type { GameState } from '../types/GameState';
import PlayerBoard from '../components/player/PlayerBoard';
import { socket } from '../services/socket';
import './BoardLayout.css';
import CenterArea from '../components/board/CenterArea';
interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  onPlay(cardId: string): void;
}

export default function BoardLayout({ gameState, isMyTurn, onPlay }: Props) {
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);
  const opponents = gameState.players.filter((P) => P.socketId !== socket.id);

  return (
    <div className="board-layout">
      <div className="player-top">
        {opponents[0] && (
          <PlayerBoard
            player={opponents[0]}
            isLocalPlayer={false}
            position="top"
            isMyTurn={false}
            onPlay={() => {}}
          />
        )}
      </div>
      <div className="middle">
        <div className="player-left">LEFT</div>
        <div className="center">
          <CenterArea />
        </div>
        <div className="player-right">RIGHT</div>
      </div>
      <div className="player-bottom">
        {localPlayer && (
          <PlayerBoard
            player={localPlayer}
            isLocalPlayer
            position="bottom"
            isMyTurn={isMyTurn}
            onPlay={onPlay}
          />
        )}
      </div>
    </div>
  );
}
