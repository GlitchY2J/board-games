import type { GameState } from './Game.ts';
import type { Room } from './Room.ts';

export interface ServerToClientEvents {
  'room-updated': (room: Room) => void;
  'game-started': (gameState: GameState) => void;
  'game-updated': (gameState: GameState) => void;
  'error-message': (msg: string) => void;
}

export interface ClientToServerEvents {
  'join-room': (payload: { roomCode: string; playerName: string }) => void;
  'start-game': (roomCode: string) => void;
  'play-card': (payload: { roomCode: string; playerId: string; cardId: string }) => void;
  'draw-action-card': (payload: { roomCode: string; playerId: string }) => void;
  'discard-cards': (payload: { roomCode: string; playerId: string; cardIds: string[] }) => void;
  'select-player': (payload: { roomCode: string; targetPlayerId: string }) => void;
  'select-stable-card': (payload: { roomCode: string; cardId: string }) => void;
  'select-hand-card': (payload: { roomCode: string; cardId: string }) => void;
  'resolve-action': (payload: { roomCode: string; targetPlayerId?: string; targetCardId?: string }) => void;
  'next-phase': (roomCode: string) => void;
  'end-turn': (roomCode: string) => void;
  'restart-game': (roomCode: string) => void;
}
