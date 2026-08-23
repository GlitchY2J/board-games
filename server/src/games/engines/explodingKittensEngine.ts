import type { GameEngine } from '../GameEngine.ts';
import { createExplodingKittensState } from '../../game/exploding-kittens/setup.ts';

export const explodingKittensEngine: GameEngine = {
  createState: createExplodingKittensState,
};
