import { createContext } from 'react';
import type { Room } from '../types/Room';
import type { GameState } from '../types/GameState';

export type SessionStatus = 'loading' | 'none' | 'active';

export interface GameContextType {
  status: SessionStatus;
  room?: Room;
  gameState?: GameState;
  playerId?: string;
  playerName: string;
  isHost: boolean;
  setRoom: (room: Room) => void;
  setPlayerName: (name: string) => void;
  activate: (data: {
    room: Room;
    playerId: string;
    isHost: boolean;
    playerName?: string;
  }) => void;
  deactivate: () => void;
  resume: () => void;
}

export const GameContext = createContext<GameContextType | null>(null);
