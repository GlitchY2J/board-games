import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const mermaidUnicorn: CardEffect = {
  onEnterStable(state, player, card) {
    const validTargets = state.players.filter(
      (p) =>
        p.id !== player.id &&
        (p.stable.length > 0 ||
          p.upgrades.length > 0 ||
          p.downgrades.length > 0),
    );

    if (validTargets.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'select_choice',
      reason: 'mermaid_unicorn',
      playerId: player.id,
      title: '🧜‍♀️ Mermaid Unicorn',
      description: '¿Deseas devolver una carta de un establo rival a su mano?',
      options: [
        { value: 'yes', text: 'Sí, devolver una carta' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
      effectCardId: card.uid,
      sourceCardImage: card.image,
    };
  },
};
