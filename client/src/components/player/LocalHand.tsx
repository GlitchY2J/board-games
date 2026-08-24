import type { GameState } from '../../types/GameState';
import CardFan from '../card/CardFan';
import './LocalHand.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
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

export default function LocalHand({
  player,
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
  const orderedCards = [...player.hand].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', {
      sensitivity: 'base',
    }),
  );

  return (
    <CardFan
      cards={orderedCards}
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
  );
}
