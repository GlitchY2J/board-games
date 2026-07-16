import { createContext, useContext, useState } from 'react';
import type { Room } from '../types/Room';

interface GameContextType {
  room?: Room;
  setRoom: (room: Room) => void;

  playerName: string;
  setPlayerName: (name: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<Room>();
  const [playerName, setPlayerName] = useState('');

  return (
    <GameContext.Provider value={{ room, setRoom, playerName, setPlayerName }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('GameContext no encontrado');

  return context;
}
