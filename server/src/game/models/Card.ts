export interface Card {
  id: string;
  name: string;
  type: 'baby' | 'basic' | 'magic' | 'upgrade' | 'downgrade' | 'instant';
  description: string;
  image: string;
  effects: string | null;
}
