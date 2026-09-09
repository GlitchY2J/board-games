import type { GameState } from '../../models/GameState.ts';
import type { Card } from '../../models/Card.ts';
import type { Player } from '../../models/Player.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const magicElexir: CardEffect = {};

export function maybeMagicElexirIntercept(
  state: GameState,
  player: Player,
  card: Card,
  animType: 'destroy' | 'sacrifice',
): boolean {
  if (!player.downgrades.some((downgrade) => downgrade.id === 'magic_elexir')) {
    return false;
  }
  if (player.hand.length === 0) return false;

  state.pendingAction = {
    type: 'select_choice',
    reason: 'magic_elexir',
    playerId: player.id,
    title: '🧪 Magic Elexir',
    description: `¿Deseas descartar una carta para evitar que ${card.name} sea ${animType === 'sacrifice' ? 'sacrificada' : 'destruida'}?`,
    options: [
      { value: 'yes', text: 'Sí, descartar una carta' },
      { value: 'no', text: 'No, continuar' },
    ],
    targetCardId: card.uid,
    originalTargetPlayerId: player.id,
    destructionType: animType,
  };
  return true;
}
