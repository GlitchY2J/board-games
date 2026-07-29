// export interface PendingAction {
//   type: string;
//   playerId: string;
//   sourceCardId?: string;

//   targetCardId?: string;
//   targetPlayerId?: string;

//   cardsToDiscard?: number;
// }

export interface PendingAction {
  type: 'discard';
  reason: 'hand_limit' | 'change_of_luck';
  playerId: string;
  cardsToDiscard: number;
}
