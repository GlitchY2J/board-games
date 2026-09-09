import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableCardToSacrifice, hasAvailableUnicorn } from './pandamonium.ts';
import { isEffectBlockedByBlindingLight } from './blindingLight.ts';

type BeginningChoiceReason =
  | 'rhinocorn'
  | 'caffeine_overload'
  | 'clairvoyant_unicorn'
  | 'claw_machine'
  | 'glitter_bomb'
  | 'rainbow_sprinkles'
  | 'rainbow_lasso'
  | 'special_delivery'
  | 'stable_artillery'
  | 'extremely_fertile_unicorn';

function choiceEffect(
  reason: BeginningChoiceReason,
  title: string,
  description: string,
  yesText: string,
  noText: string,
  canBegin: CardEffect['canBeginTurn'] = () => true,
): CardEffect {
  return {
    canBeginTurn: canBegin,
    onBeginningTurn(state, player, card) {
      state.pendingAction = {
        type: 'select_choice',
        reason,
        playerId: player.id,
        title,
        description,
        options: [
          { value: 'yes', text: yesText },
          { value: 'no', text: noText },
        ],
        effectCardId: card.uid,
      };
      return true;
    },
  };
}

export const rhinocorn: CardEffect = choiceEffect(
  'rhinocorn',
  '🦏 Rhinocorn',
  '¿Deseas DESTRUIR un unicornio de otro jugador y saltarte el resto de tu turno?',
  'Sí, destruir y saltar el turno',
  'No, continuar mi turno',
  (state, player, card) =>
    state.players.some(
      (candidate) => candidate.id !== player.id && hasAvailableUnicorn(candidate),
    ) && !isEffectBlockedByBlindingLight(player, card),
);

export const caffeineOverload = choiceEffect(
  'caffeine_overload',
  '☕ Caffeine Overload',
  '¿Deseas SACRIFICAR una carta para luego ROBAR 2 cartas?',
  'Sí, sacrificar y robar 2',
  'No, omitir el efecto',
  (_state, player) => hasAvailableCardToSacrifice(player),
);

export const clairvoyantUnicorn = choiceEffect(
  'clairvoyant_unicorn',
  '🔮 Clairvoyant Unicorn',
  'Tu mano es visible para todos. ¿Deseas ROBAR una carta?',
  'Sí, robar una carta',
  'No, omitir el efecto',
);

export const clawMachine = choiceEffect(
  'claw_machine',
  '🕹️ Claw Machine',
  '¿Deseas DESCARTAR una carta de tu mano y luego ROBAR una carta?',
  'Sí, descartar y robar',
  'No, omitir el efecto',
);

export const glitterBomb = choiceEffect(
  'glitter_bomb',
  '✨ Glitter Bomb',
  '¿Deseas SACRIFICAR una carta para luego DESTRUIR una carta?',
  'Sí, sacrificar y destruir',
  'No, omitir el efecto',
  (_state, player) => hasAvailableCardToSacrifice(player),
);

export const rainbowSprinklesChoice = choiceEffect(
  'rainbow_sprinkles',
  '🌈 Rainbow Sprinkles',
  '¿Deseas ROBAR 3 cartas y terminar tu turno inmediatamente?',
  'Sí, robar 3 y terminar turno',
  'No, continuar mi turno',
);

export const rainbowLasso = choiceEffect(
  'rainbow_lasso',
  '🌈 Rainbow Lasso',
  '¿Deseas DESCARTAR 3 cartas para luego ROBAR un unicornio de otro jugador?',
  'Sí, descartar 3 y robar un unicornio',
  'No, omitir el efecto',
  (state, player) =>
    state.players.some(
      (candidate) => candidate.id !== player.id && hasAvailableUnicorn(candidate),
    ),
);

export const specialDeliveryChoice = choiceEffect(
  'special_delivery',
  '📦 Special Delivery',
  '¿Deseas traer un Baby Unicorn de la Nursery a tu establo y saltar tu fase de acción?',
  'Sí, traer Baby Unicorn y saltar acción',
  'No, continuar mi turno',
  (state) =>
    state.nursery.some(
      (card) => card.cardType === 'unicorn' && card.unicornClass === 'baby',
    ),
);

export const stableArtillery = choiceEffect(
  'stable_artillery',
  '🔫 Stable Artillery',
  '¿Deseas DESCARTAR 2 cartas para luego DESTRUIR un unicornio?',
  'Sí, descartar 2 y destruir un unicornio',
  'No, omitir el efecto',
  (state, player) =>
    state.players.some(
      (candidate) => candidate.id !== player.id && hasAvailableUnicorn(candidate),
    ),
);

export const extremelyFertileUnicorn = choiceEffect(
  'extremely_fertile_unicorn',
  '🌱 Extremely Fertile Unicorn',
  '¿Deseas descartar una carta para traer un Baby Unicorn de la Nursery a tu establo?',
  'Sí, descartar y traer Baby Unicorn',
  'No, omitir efecto',
  (state, player, card) =>
    player.hand.length > 0 &&
    state.nursery.some(
      (candidate) => candidate.cardType === 'unicorn' && candidate.unicornClass === 'baby',
    ) &&
    !isEffectBlockedByBlindingLight(player, card),
);
