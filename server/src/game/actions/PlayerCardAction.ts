import type { GameAction } from './GameAction.ts';

export interface PlayCardAction extends GameAction {
  cardId: string;
}
