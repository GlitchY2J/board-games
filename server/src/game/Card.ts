import { CardType } from './enums.ts';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  description: string;
  image: string;
  effects: string[];
}
