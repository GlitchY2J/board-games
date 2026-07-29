import { GameState } from './models/GameState.ts';
import { Card } from './models/Card.ts';
import { InstantEffects } from './effects/InstantEffects.ts';

export class CardEffectManager {
  static execute(game: GameState, playerId: string, card: Card) {
    switch (card.name) {
      case 'Change of LUck':
        InstantEffects.changeOfLuck(game, playerId);
        break;
    }
  }
}
