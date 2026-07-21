import type { Card } from '../models/Card.ts';
import type { GameState } from '../models/GameState.ts';

export class EFfectManager {
  static execute(state: GameState, card: Card): void {
    console.log('Ejecutando efectos:', card.name);
  }
}
