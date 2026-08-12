import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const seductiveUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const canDiscard = player.hand.length > 0;
    const canSteal = state.players.some(
      (p) =>
        p.id !== player.id &&
        p.stable.some((c) => c.cardType === 'unicorn'),
    );

    if (!canDiscard || !canSteal) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'seductive_unicorn',
      playerId: player.id,
      title: '💋 Seductive Unicorn',
      description:
        '¿Deseas descartar una carta de tu mano y luego ROBAR un unicornio de otro jugador?',
      options: [
        { value: 'yes', text: 'Sí, descartar y robar' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};