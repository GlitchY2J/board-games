import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isPandamoniumProtected } from './pandamonium.ts';

export const chainsawMassicorn: CardEffect = {
  onEnterStable(state, player) {
    const drawCount = player.stable.filter(
      (card) =>
        card.cardType === 'unicorn' &&
        card.unicornClass === 'basic' &&
        !isPandamoniumProtected(player, card),
    ).length;

    if (drawCount === 0) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'chainsaw_massicorn',
      playerId: player.id,
      title: '🪚 Chainsaw Massicorn',
      description: `¿Deseas robar ${drawCount} carta${drawCount === 1 ? '' : 's'} por tus Basic Unicorns?`,
      options: [
        { value: 'yes', text: 'Sí, robar cartas' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};
