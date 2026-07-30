export type PendingAction =
  | {
      type: 'discard';
      reason: 'hand_limit' | 'change_of_luck' | 'back_kick' | 'annoying_flying_unicorn';
      playerId: string;
      cardsToDiscard: number;
    }
  | {
      type: 'select_player';
      reason: 'back_kick' | 'americorn' | 'blatant_thievery';
      sourcePlayerId: string;
    }
  | {
      type: 'select_stable_card';
      reason: 'back_kick' | 'sacrifice_destroy';
      sourcePlayerId: string;
      targetPlayerId: string;
    }
  | {
      type: 'select_hand_card';
      reason: 'blatant_thievery';
      sourcePlayerId: string;
      targetPlayerId: string;
    }
  | {
      type: 'alluring_narwhal';
      playerId: string;
      sourceCardId: string;
    };
