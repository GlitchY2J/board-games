export interface Card {
  id: string;
  name: string;
  type: string;
  description: string;
  image: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  turn: number;
  started: boolean;
  deck: {
    drawPile: Card[];
    discardPile: Card[];
  };
}
