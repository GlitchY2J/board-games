import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isEffectBlockedByBlindingLight } from './blindingLight.ts';

export const angelUnicorn: CardEffect = {
  canBeginTurn(state, player, card) {
    return (
      state.discard.some((candidate) => candidate.cardType === 'unicorn') &&
      !isEffectBlockedByBlindingLight(player, card)
    );
  },
  onBeginningTurn(state, player, card) {
    state.pendingAction = {
      type: 'select_choice',
      reason: 'angel_unicorn',
      playerId: player.id,
      title: '👼 Angel Unicorn',
      description:
        '¿Deseas SACRIFICAR esta carta para luego traer un unicornio del descarte a tu establo?',
      options: [
        { value: 'yes', text: 'Sí, sacrificar y traer unicornio' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
      effectCardId: card.uid,
    };
    return true;
  },
};
