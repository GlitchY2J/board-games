export interface Card {
  id: string;
  name: string;
  cardType: 'unicorn' | 'magic' | 'upgrade' | 'downgrade' | 'instant';
  unicornType?: 'baby' | 'basic' | 'magical';
  image: string;
  description: string;
  effects: string | null;
  copies: number;
  expansiong: string;
}
