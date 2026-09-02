export type CardType =
  | 'unicorn'
  | 'magic'
  | 'upgrade'
  | 'downgrade'
  | 'instant'
  | 'exploding_kitten'
  | 'defuse'
  | 'action'
  | 'cat';
export type UnicornClass = 'baby' | 'basic' | 'magical';

export interface Card {
  uid: string;
  id: string;
  variantId?: string;
  name: string;
  cardType: CardType;
  unicornClass?: UnicornClass;
  image: string;
  description: string;
  effect: string | null;
  copies: number;
  expansion: string;
  /** Used by Exploding Kittens for an Imploding Kitten placed face up. */
  faceUp?: boolean;
}
