import HiddenHand from './HiddenHand';
import LocalHand from './LocalHand';
import './PlayerHand.css';

import type { GameState } from '../../types/GameState';
type Player = GameState['players'][number];

interface Props {
  player: Player;
  isLocalPlayer: boolean;
  isMyTurn: boolean;
  gamePhase: string;
  actionUsed: boolean;
  pendingPlay: boolean;
  blockedCardIds?: Set<string>;
  onPlay(cardId: string): void;
  onPlayCards?(cardIds: string[]): void;
  onSelectionChange?(selected: boolean): void;
  onInvalidAction?(message: string): void;
  compact?: boolean;
  gameId?: string;
  sortHandRequest?: number;
}

export default function PlayerHand({
  player,
  isLocalPlayer,
  isMyTurn,
  gamePhase,
  actionUsed,
  pendingPlay,
  blockedCardIds,
  onPlay,
  onPlayCards,
  onSelectionChange,
  onInvalidAction,
  compact,
  gameId,
  sortHandRequest,
}: Props) {
  return (
    <div className="player-hand">
      {isLocalPlayer ? (
        <LocalHand
          player={player}
          isMyTurn={isMyTurn}
          gamePhase={gamePhase}
          actionUsed={actionUsed}
          pendingPlay={pendingPlay}
          blockedCardIds={blockedCardIds}
          onPlay={onPlay}
          onPlayCards={onPlayCards}
          onSelectionChange={onSelectionChange}
          onInvalidAction={onInvalidAction}
          compact={compact}
          gameId={gameId}
          sortHandRequest={sortHandRequest}
        />
      ) : (
        <HiddenHand cardCount={player.hand.length} />
      )}
    </div>
  );
}
