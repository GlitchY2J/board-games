import type { GameState } from '../../../models/GameState.ts';
import type { Player } from '../../../models/Player.ts';
import type { Card } from '../../../models/Card.ts';

export interface CardEffect {
  onPlay?(state: GameState, player: Player, card: Card): void;

  onEnterStable?(state: GameState, player: Player, card: Card): void;

  resolve?(state: GameState, player: Player, payload: unknown): void;

  /** Se dispara cuando esta carta es sacrificada o destruida.
   *  Devuelve `true` si la destrucción fue interceptada (la carta no va al descarte). */
  onDestroyed?(state: GameState, card: Card, player: Player): boolean | void;
}
