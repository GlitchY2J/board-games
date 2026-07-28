export interface PendingAction {
  type: string;
  playerId: string;
  sourceCardId?: string;

  targetCardId?: string;
  targetPlayerId?: string;

  cardsToDiscard?: number;
}
