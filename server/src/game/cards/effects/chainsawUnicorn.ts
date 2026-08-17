import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const chainsawUnicorn: CardEffect = {
  onEnterStable(state, player) {
    // Los upgrades solo pueden destruirse en el establo de OTROS jugadores.
    const hasOtherUpgrades = state.players.some(
      (p) => p.id !== player.id && p.upgrades.length > 0,
    );
    // Los downgrades solo pueden sacrificarse del propio establo.
    const hasMyDowngrades = player.downgrades.length > 0;

    if (!hasOtherUpgrades && !hasMyDowngrades) {
      return;
    }

    state.pendingAction = {
      type: 'select_choice',
      reason: 'chainsaw_unicorn',
      playerId: player.id,
      title: '🪚 Chainsaw Unicorn',
      description:
        '¿Deseas activar el efecto de Chainsaw Unicorn para destruir un Upgrade o sacrificar un Downgrade?',
      options: [
        { value: 'yes', text: 'Sí, elegir carta' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};
