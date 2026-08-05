export type PendingAction =
  | {
      type: 'discard';
      reason: 'hand_limit' | 'change_of_luck' | 'back_kick' | 'annoying_flying_unicorn' | 'good_deal';
      playerId: string;
      cardsToDiscard: number;
    }
  | {
      type: 'select_player';
      reason: 'back_kick' | 'americorn' | 'blatant_thievery' | 'unicorn_poison' | 'annoying_flying_unicorn';
      sourcePlayerId: string;
    }
  | {
      type: 'select_stable_card';
      reason: 'back_kick' | 'sacrifice_destroy' | 'unicorn_poison';
      sourcePlayerId: string;
      targetPlayerId: string;
    }
  | {
      type: 'select_hand_card';
      reason: 'blatant_thievery' | 'americorn';
      sourcePlayerId: string;
      targetPlayerId: string;
    }
  | {
      type: 'alluring_narwhal';
      playerId: string;
      sourceCardId: string;
    }
  | {
      // glitter_tornado: el jugador que jugó la carta elige una por cada establo
      type: 'glitter_tornado';
      sourcePlayerId: string;       // quien elige todas las cartas
      remainingPlayerIds: string[]; // cola de jugadores cuyo establo aún falta elegir
    }
  | {
      type: 'mystical_vortex';
      remainingPlayerIds: string[]; // cola de jugadores que deben descartar
    }
  | {
      type: 'select_choice';
      reason: 'angel_unicorn' | 'annoying_flying_unicorn';
      playerId: string;
      title: string;
      description: string;
      options: { value: string; text: string }[];
    }
  | {
      type: 'select_discard_card';
      reason: 'angel_unicorn';
      playerId: string;
      cardType?: 'unicorn' | 'magic' | 'upgrade' | 'downgrade' | 'instant';
    };
