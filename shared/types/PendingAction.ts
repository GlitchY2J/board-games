import type { Card } from "./Card.ts";

export type PendingAction =
  | {
      type: "select_discard_count";
      reason: "unicorn_of_pestilence";
      playerId: string;
      maxCards: number;
    }
  | {
      type: "pestilence_discard";
      reason: "unicorn_of_pestilence";
      sourcePlayerId: string;
      playerId: string;
      remainingPlayerIds: string[];
      cardsToDiscard: number;
    }
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
        | "unicorn_phoenix"
         | "claw_machine"
         | "extremely_fertile_unicorn"
         | "rainbow_lasso"
        | "stable_artillery"
        | "barbed_wire";
      playerId: string;
      cardsToDiscard: number;
    }
  | {
      type: "select_players";
      reason: "unicorn_rainbow_princess";
      sourcePlayerId: string;
      playerIds: string[];
    }
  | {
      type: "select_player";
      reason:
        | "back_kick"
         | "americorn"
         | "blatant_thievery"
         | "two_of_a_kind"
         | "unicorn_poison"
        | "annoying_flying_unicorn"
        | "play_downgrade"
        | "mermaid_unicorn"
        | "unfair_bargain"
        | "unicorn_swap"
        | "re_target_source"
        | "re_target_destination";
       sourcePlayerId: string;
       targetPlayerId?: string;
       cardIds?: string[];
       card?: Card;
      /** Jugador dueño original de la carta que se mueve (Re-Target). */
      fromPlayerId?: string;
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
        | "caffeine_overload"
        | "re_target_card"
        | "targeted_destruction"
         | "glitter_bomb_sacrifice"
         | "glitter_bomb_destroy"
         | "unicorn_of_death_sacrifice"
         | "unicorn_of_death_destroy"
         | "unicorn_of_war_destroy"
         | "zombie_unicorn"
         | "tiny_stable"
        | "rainbow_lasso_steal"
        | "stable_artillery_destroy"
        | "sadistic_ritual";
       sourcePlayerId: string;
       targetPlayerId?: string;
       remainingPlayerIds?: string[];
    }
  | {
      type: "select_hand_card";
       reason: "blatant_thievery" | "americorn" | "glitter_unicorn" | "two_of_a_kind";
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
      type: "frenchiecorn";
      sourcePlayerId: string;
      remainingPlayerIds: string[];
      resolvedPlayerIds: string[];
      discardedCardIds: string[];
    }
  | {
      type: "extremely_destructive_unicorn";
      remainingPlayerIds: string[]; // cola de jugadores que deben sacrificar un unicornio
      resolvedPlayerIds: string[];
    }
  | {
      type: "adorable_flying_unicorn";
      remainingPlayerIds: string[]; // cola de jugadores que deben sacrificar una carta
      resolvedPlayerIds: string[];
    }
  | {
      type: "cotton_candy_unicorn";
      sourcePlayerId: string;
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
        | "shabby_the_narwhal"
         | "claw_machine"
         | "extremely_fertile_unicorn"
         | "glitter_bomb"
         | "unicorn_of_death"
         | "unicorn_of_war"
         | "unicorn_rainbow_princess"
         | "zombie_unicorn"
        | "beginning_effect_picker"
        | "rainbow_lasso"
        | "stable_artillery"
         | "angel_unicorn";
      playerId: string;
      title: string;
      description: string;
      options: { value: string; text: string }[];
      targetCardId?: string;
      originalTargetPlayerId?: string;
      sourcePlayerId?: string;
      remainingPlayerIds?: string[];
      /** Carta que está "en el aire" mientras se decide (p. ej. Unicorn Phoenix) */
      heldCard?: Card;
      /** Uid del efecto de inicio de turno que se está resolviendo. Permite distinguir
       *  varias copias de la misma carta (cada una se activa por separado). */
      effectCardId?: string;
    }
  | {
      type: "select_discard_card";
        reason: "dark_angel_unicorn" | "magical_flying_unicorn" | "majestic_flying_unicorn" | "necromancer_unicorn" | "swift_flying_unicorn" | "kiss_of_life" | "angel_unicorn" | "extremely_fertile_unicorn" | "frenchiecorn" | "zombie_unicorn";
      playerId: string;
       cardType?: "unicorn" | "magic" | "upgrade" | "downgrade" | "instant";
       discardedCardIds?: string[];
    }
  | {
      type: "select_deck_card";
      reason: "classy_narwhal" | "the_great_narwhal" | "shabby_the_narwhal" | "debug_draw";
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
       reason: "mother_goose_unicorn" | "extremely_fertile_unicorn";
      playerId: string;
    }
  | {
      type: "select_own_hand_card";
      reason: "rainbow_unicorn";
      playerId: string;
    };
