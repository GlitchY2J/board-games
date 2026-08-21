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
  onSelectionChange?(selected: boolean): void;
  onInvalidAction?(message: string): void;
}

export default function LocalHand({
  player,
  isMyTurn,
  gamePhase,
  actionUsed,
  pendingPlay,
  blockedCardIds,
  onPlay,
  onSelectionChange,
  onInvalidAction,
}: Props) {
  return (
    <CardFan
      cards={player.hand}
      isMyTurn={isMyTurn}
      gamePhase={gamePhase}
      actionUsed={actionUsed}
      pendingPlay={pendingPlay}
      blockedCardIds={blockedCardIds}
      onPlay={onPlay}
      onSelectionChange={onSelectionChange}
      onInvalidAction={onInvalidAction}
    />
  );
}
