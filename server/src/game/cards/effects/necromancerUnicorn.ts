import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const necromancerUnicorn: CardEffect = {
  onEnterStable(state, player, card) {
    // Excluir la carta que está entrando: durante onEnterStable todavía está en
    // la mano y desaparecerá al completar la entrada, así que no puede contar
    // como una de las 2 cartas a descartar.
    const discardable = player.hand.filter(
      (c) => c.cardType === 'unicorn' && c.uid !== card.uid,
    ).length;

    const discardHasUnicorns = state.discard.some(
      (c) => c.cardType === 'unicorn',
    );

    if (discardable < 2 || !discardHasUnicorns) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'necromancer_unicorn',
      playerId: player.id,
      title: '🧙 Necromancer Unicorn',
      description:
        '¿Deseas descartar 2 unicornios de TU mano para traer un unicornio del descarte a tu establo?',
      options: [
        { value: 'yes', text: 'Sí, descartar y traer' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};