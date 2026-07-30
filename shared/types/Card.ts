export type CardType = 'unicorn' | 'magic' | 'upgrade' | 'downgrade' | 'instant';
export type UnicornClass = 'baby' | 'basic' | 'magical';

export interface Card {
  id: string;
  name: string;
  cardType: CardType;
  unicornClass?: UnicornClass;
  image: string;
  description: string;
  effect: string | null;
  copies: number;
  expansion: string;
}
