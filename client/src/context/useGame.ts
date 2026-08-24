import { useContext } from 'react';
import { GameContext } from './GameStore';

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('GameContext no encontrado');

  return context;
}
