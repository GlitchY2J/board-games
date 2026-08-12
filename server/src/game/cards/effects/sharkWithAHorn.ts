import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const sharkWithAHorn: CardEffect = {
  onEnterStable(state, player) {
    const canDestroy = state.players.some((p) =>
      p.stable.some((c) => c.cardType === 'unicorn'),
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