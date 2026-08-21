import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import type { PendingAction } from '../../models/PendingAction.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';

export function drawRainbowPrincessCards(
  state: GameState,
  player: Player,
  amount: number,
): void {
  for (let index = 0; index < amount; index += 1) {
    const drawn = state.deck.shift();
    if (!drawn) break;
    enqueueDrawAnimation(state.roomCode, player.id, drawn);
    player.hand.push(drawn);
  }
}

export function nextRainbowPrincessChoice(
  state: GameState,
  sourcePlayerId: string,
  remainingPlayerIds: string[],
): PendingAction | undefined {
  const [playerId, ...remaining] = remainingPlayerIds;
  if (!playerId) return undefined;

  return {
    type: 'select_choice',
    reason: 'unicorn_rainbow_princess',
    playerId,
    sourcePlayerId,
    remainingPlayerIds: remaining,
    title: '👑 Unicorn Rainbow Princess',
    description: '¿Deseas robar una carta?',
    options: [
      { value: 'yes', text: 'Sí, robar una carta' },
      { value: 'no', text: 'No, omitir efecto' },
    ],
  };
}

export const unicornRainbowPrincess: CardEffect = {
  onEnterStable(state, player) {
    state.pendingAction = {
      type: 'select_players',
      reason: 'unicorn_rainbow_princess',
      sourcePlayerId: player.id,
      playerIds: state.players.map((candidate) => candidate.id),
    };
  },
};
