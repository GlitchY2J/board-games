import type { GameState } from '../../../models/GameState.ts';
import type { Player } from '../../../models/Player.ts';
import type { Card } from '../../../models/Card.ts';

export interface CardEffect {
  onPlay?(state: GameState, player: Player, card: Card): void;

  onEnterStable?(state: GameState, player: Player, card: Card): void;

  resolve?(state: GameState, player: Player, payload: unknown): void;
}
