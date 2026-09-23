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
  discardSelection?: boolean;
  onDiscardSelect?(cardId: string): void;
  onCardSelect?(cardId: string): void;
  compact?: boolean;
  gameId?: string;
  sortHandMode?: 'alphabetical' | 'type' | null;
  selectableCardIds?: Set<string>;
  selectionOnly?: boolean;
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
  discardSelection,
  onDiscardSelect,
  onCardSelect,
  compact,
  gameId,
  sortHandMode,
  selectableCardIds,
  selectionOnly = false,
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
           sortHandMode={sortHandMode}
           discardSelection={discardSelection}
           selectionOnly={selectionOnly}
           selectableCardIds={selectableCardIds}
           onDiscardSelect={onDiscardSelect}
           onCardSelect={onCardSelect}
        />
      ) : (
        <HiddenHand cardCount={player.hand.length} />
      )}
    </div>
  );
}
