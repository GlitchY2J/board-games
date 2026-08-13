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
        | "necromancer_unicorn"
        | "seductive_unicorn"
        | "unicorn_on_the_cob"
        | "unicorn_phoenix";
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
        | "mermaid_unicorn"
        | "unfair_bargain"
        | "unicorn_swap";
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
        | "rhinocorn"
        | "seductive_unicorn"
        | "shark_with_a_horn"
        | "stabby_the_unicorn"
        | "unicorn_swap_give"
        | "unicorn_swap_steal"
        | "caffeine_overload";
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
      type: "two_for_one";
      sourcePlayerId: string;
      phase: "sacrifice" | "destroy";
      remainingToDestroy: number;
    }
  | {
      type: "select_choice";
      reason:
        | "annoying_flying_unicorn"
        | "black_knight_unicorn"
        | "chainsaw_unicorn"
        | "classy_narwhal"
        | "the_great_narwhal"
        | "dark_angel_unicorn"
| "magical_flying_unicorn"
        | "majestic_flying_unicorn"
        | "mother_goose_unicorn"
        | "necromancer_unicorn"
        | "swift_flying_unicorn"
        | "rainbow_unicorn"
        | "rhinocorn"
        | "seductive_unicorn"
        | "shark_with_a_horn"
        | "stabby_the_unicorn"
        | "unicorn_phoenix"
        | "caffeine_overload"
        | "shabby_the_narwhal";
      playerId: string;
      title: string;
      description: string;
      options: { value: string; text: string }[];
      targetCardId?: string;
      originalTargetPlayerId?: string;
      /** Carta que está "en el aire" mientras se decide (p. ej. Unicorn Phoenix) */
      heldCard?: Card;
    }
  | {
      type: "select_discard_card";
      reason: "dark_angel_unicorn" | "magical_flying_unicorn" | "majestic_flying_unicorn" | "necromancer_unicorn" | "swift_flying_unicorn" | "kiss_of_life";
      playerId: string;
      cardType?: "unicorn" | "magic" | "upgrade" | "downgrade" | "instant";
    }
  | {
      type: "select_deck_card";
      reason: "classy_narwhal" | "the_great_narwhal" | "shabby_the_narwhal";
      playerId: string;
      cardType?: "unicorn" | "magic" | "upgrade" | "downgrade" | "instant";
      candidates: Card[];
    }
  | {
      type: "select_oracle_cards";
      playerId: string;
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
