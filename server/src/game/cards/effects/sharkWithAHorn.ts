import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isPandamoniumProtected } from './pandamonium.ts';

export const sharkWithAHorn: CardEffect = {
  onEnterStable(state, player, card) {
    // No contar al propio Shark (se sacrifica): busca un unicornio disponible
    // (no protegido por Pandamonium) para destruir.
    const canDestroy = state.players.some((p) =>
      p.stable.some(
        (c) =>
          c.cardType === 'unicorn' &&
          c.uid !== card.uid &&
          !isPandamoniumProtected(p, c),
      ),
    );

    if (!canDestroy) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'shark_with_a_horn',
      playerId: player.id,
      title: '🦈 Shark With A Horn',
      description:
        '¿Deseas SACRIFICAR a Shark With A Horn para luego DESTRUIR un unicornio?',
      options: [
        { value: 'yes', text: 'Sí, sacrificar y destruir' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};