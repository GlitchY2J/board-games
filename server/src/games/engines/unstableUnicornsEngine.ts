import { createGameState } from '../../game/unstable-unicorns/setup.ts';
import type { GameEngine } from '../GameEngine.ts';

export const unstableUnicornsEngine: GameEngine = {
  createState: createGameState,
};
