import type { Card } from '../../models/Card.ts';
import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import { enqueueDiscardAnimation } from '../../cardAnimations.ts';

/** Primitive zone mutations that must not depend on effect registration. */
export class CardZoneMovement {
  static addToHand(player: Player, card: Card): void {
    player.hand.push(card);
  }

  static removeFromHand(player: Player, cardUid: string): Card | undefined {
    const index = player.hand.findIndex((card) => card.uid === cardUid);
    if (index === -1) return undefined;
    return player.hand.splice(index, 1)[0];
  }

  static addToStable(player: Player, card: Card): void {
    player.stable.push(card);
  }

  static removeFromStable(player: Player, cardUid: string): Card | undefined {
    const index = player.stable.findIndex((card) => card.uid === cardUid);
    if (index === -1) return undefined;
    return CardZoneMovement.removeAt(player.stable, index);
  }

  static removeAt(cards: Card[], index: number): Card | undefined {
    if (index < 0 || index >= cards.length) return undefined;
    return cards.splice(index, 1)[0];
  }

  static discard(state: GameState, card: Card, playerId: string): void {
    enqueueDiscardAnimation(state.roomCode, playerId, card);
    state.discard.push(card);
  }

  static toDiscard(state: GameState, card: Card): void {
    state.discard.push(card);
  }

  static returnToNursery(state: GameState, card: Card): void {
    state.nursery.push(card);
  }
}
