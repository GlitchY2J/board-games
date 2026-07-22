export interface Card {
  id: string;
  name: string;
  cardType: 'unicorn' | 'magic' | 'upgrade' | 'downgrade' | 'instant';
  unicornClass?: 'baby' | 'basic' | 'magical';
  image: string;
  description: string;
  effect: string | null;
  copies: number;
  expansiong: string;
}
