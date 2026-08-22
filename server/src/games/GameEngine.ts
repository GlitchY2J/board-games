import type { GameState } from '../game/models/GameState.ts';
import type { Room } from '../game/models/Room.ts';

export interface GameEngine {
  createState(room: Room): GameState;
}
