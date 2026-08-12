import type { Card } from "./Card.ts";

export type PendingAction =
  | {
      type: "discard";
      reason:
        | "hand_limit"
        | "change_of_luck"
        | "back_kick"
        | "annoying_flying_unicorn"
        | "good_deal"
        | "necromancer_unicorn";
      playerId: string;
      cardsToDiscard: number;
    }
  | {
      type: "select_player";
      reason:
        | "back_kick"
        | "americorn"
        | "blatant_thievery"
        | "unicorn_poison"
        | "annoying_flying_unicorn"
        | "play_downgrade"
        | "mermaid_unicorn";
      sourcePlayerId: string;
      card?: Card;
    }
  | {
      type: "select_stable_card";
      reason:
        | "back_kick"
        | "sacrifice_destroy"
        | "unicorn_poison"
        | "chainsaw_unicorn"
        | "dark_angel_unicorn"
        | "mermaid_unicorn"
        | "rhinocorn";
      sourcePlayerId: string;
      targetPlayerId?: string;
    }
  | {
      type: "select_hand_card";
      reason: "blatant_thievery" | "americorn";
      sourcePlayerId: string;
      targetPlayerId: string;
    }
  | {
      type: "alluring_narwhal";
      playerId: string;
      sourceCardId: string;
    }
  | {
      // glitter_tornado: el jugador que jugó la carta elige una por cada establo
      type: "glitter_tornado";
      sourcePlayerId: string; // quien elige todas las cartas
      remainingPlayerIds: string[]; // cola de jugadores cuyo establo aún falta elegir
    }
  | {
      type: "mystical_vortex";
      remainingPlayerIds: string[]; // cola de jugadores que deben descartar
    }
  | {
      type: "llamacorn";
      remainingPlayerIds: string[]; // cola de jugadores que deben descartar
      resolvedPlayerIds: string[]; // jugadores que ya descartaron
    }
  | {
      type: "extremely_destructive_unicorn";
      remainingPlayerIds: string[]; // cola de jugadores que deben sacrificar un unicornio
      resolvedPlayerIds: string[];
    }
  | {
      type: "select_choice";
      reason:
        | "annoying_flying_unicorn"
        | "black_knight_unicorn"
        | "chainsaw_unicorn"
        | "classy_narwhal"
        | "dark_angel_unicorn"
| "magical_flying_unicorn"
        | "majestic_flying_unicorn"
        | "mother_goose_unicorn"
        | "necromancer_unicorn"
        | "rainbow_unicorn"
        | "rhinocorn";
      playerId: string;
      title: string;
      description: string;
      options: { value: string; text: string }[];
      targetCardId?: string;
      originalTargetPlayerId?: string;
    }
  | {
      type: "select_discard_card";
      reason: "dark_angel_unicorn" | "magical_flying_unicorn" | "majestic_flying_unicorn" | "necromancer_unicorn";
      playerId: string;
      cardType?: "unicorn" | "magic" | "upgrade" | "downgrade" | "instant";
    }
  | {
      type: "select_deck_card";
      reason: "classy_narwhal";
      playerId: string;
      cardType?: "unicorn" | "magic" | "upgrade" | "downgrade" | "instant";
      candidates: Card[];
    }
  | {
      type: "select_nursery_card";
      reason: "mother_goose_unicorn";
      playerId: string;
    }
  | {
      type: "select_own_hand_card";
      reason: "rainbow_unicorn";
      playerId: string;
    };
