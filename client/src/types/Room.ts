export interface Player {
  id: string;
  name: string;
  ready: boolean;
}

export interface Room {
  code: string;
  game: string;
  hostId: string;
  players: Player[];
}
