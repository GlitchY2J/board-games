import type { Card } from '../../models/Card.js';
import type { GameState } from '../../models/GameState.ts';
import { DowngradeHandler } from './handlers/DowngradeHandler.ts';
import { InstantHandler } from './handlers/InstantHandler.ts';
import { MagicHandler } from './handlers/MagicHandler.ts';
import { UnicornHandler } from './handlers/UnicornHandler.ts';
import { UpgradeHandler } from './handlers/UpgradeHandler.ts';

export class RulesEngine {
  static playCard(
    state: GameState,
    playerId: string,
    cardId: string,
  ): GameState {
    const player = state.players.find((p) => p.id === playerId);

    if (!player) {
      return state;
    }

    const handIndex = player.hand.findIndex((c) => c.id === cardId);

    if (handIndex === -1) {
      return state;
    }

    const card = player.hand.splice(handIndex, 1)[0];

    switch (card.cardType) {
      case 'unicorn':
        UnicornHandler.play(state, player, card);
        break;
      case 'upgrade':
        UpgradeHandler.play(player, card);
        break;
      case 'downgrade':
        DowngradeHandler.play(player, card);
        break;
      case 'magic':
        MagicHandler.play(state, player, card);
        break;
      case 'instant':
        InstantHandler.play(state, card);
        break;
    }

    return state;
  }
}
