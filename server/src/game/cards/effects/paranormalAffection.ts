import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export function hasParanormalAffection(player: { upgrades: { id: string }[] }): boolean {
  return player.upgrades.some((card) => card.id === 'paranormal_affection');
}

export function isProtectedByParanormalAffection(
  player: { upgrades: { id: string }[] },
  card: { cardType: string },
): boolean {
  return card.cardType === 'upgrade' && hasParanormalAffection(player);
}

export const paranormalAffection: CardEffect = {
  onEnterStable(state, player) {
    if (state.deck.length === 0) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'paranormal_affection',
      playerId: player.id,
      title: '💞 Paranormal Affection',
      description: '¿Deseas ROBAR 2 cartas?',
      options: [
        { value: 'yes', text: 'Sí, robar 2 cartas' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
