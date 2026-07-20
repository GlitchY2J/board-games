import { CardType } from './enums.ts';
import { CardEffect } from './Effect.ts';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  description: string;
  image: string;
  effects: CardEffect[];
}
