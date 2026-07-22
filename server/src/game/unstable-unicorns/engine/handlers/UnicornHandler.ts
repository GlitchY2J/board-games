import type { Card } from '../../../models/Card.ts';
import { GameState } from '../../../models/GameState.ts';
import type { Player } from '../../../models/Player.ts';
import { effects } from '../effects/index.ts';

export class UnicornHandler {
  static play(state: GameState, player: Player, card: Card) {
    // El unicornio entra al establo
    player.stable.push(card);

    // La carta tiene un efecto ?
    const effect = effects[card.id as keyof typeof effects];

    // Ejecutar efecto al entrar al establo
    effect?.onEnterStable?.(state, player, card);
  }
}
