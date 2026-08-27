import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../../types/GameState';
import { cn } from '../../lib/cn';
import './TurnOrder.css';

interface Props {
  gameState: GameState;
  localPlayerId: string;
}

export default function TurnOrder({ gameState, localPlayerId }: Props) {
  const orderedPlayers = useMemo(() => {
    const total = gameState.players.length;
    if (total === 0) return [];

    const list = [];
    for (let i = 0; i < total; i++) {
      const idx = (gameState.currentPlayer + i) % total;
      list.push({
        ...gameState.players[idx],
        isCurrent: i === 0,
      });
    }
    return list;
  }, [gameState.players, gameState.currentPlayer]);

  if (orderedPlayers.length === 0) return null;

  return (
    <div className="turn-order-minimal">
      {orderedPlayers.map((player) => {
        const isLocal = player.id === localPlayerId;
        const isCurrent = player.isCurrent;

        return (
          <motion.div
            layout
            layoutId={`turn-order-${player.id}`}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 30,
            }}
            key={player.id}
            className={cn(
              'turn-order-row',
              isCurrent ? 'turn-order-row-active' : 'turn-order-row-idle',
            )}
          >
            <div className="turn-order-avatar">
              {player.avatar ? (
                <img
                  src={`/avatars/${player.avatar}.png`}
                  alt={player.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div
                  className={cn(
                    'w-full h-full flex items-center justify-center font-black text-[10px] uppercase rounded-full text-slate-950',
                    isCurrent
                      ? 'bg-gradient-to-br from-emerald-400 to-cyan-400'
                      : 'bg-slate-700 text-slate-300',
                  )}
                >
                  {player.name.substring(0, 2)}
                </div>
              )}
            </div>

            <div className="turn-order-name-wrap">
              <span
                className={cn(
                  'turn-order-name truncate',
                  isLocal && 'turn-order-local',
                  isCurrent ? 'text-emerald-400 font-bold' : 'text-slate-300/80',
                )}
              >
                {player.name}
              </span>
            </div>
          </motion.div>
        );
      })}
      {(gameState.eliminatedPlayers?.length ?? 0) > 0 && (
        <div className="turn-order-eliminated">
          <div className="turn-order-eliminated-title">Eliminados</div>
          {gameState.eliminatedPlayers?.map((player) => (
            <div key={player.id} className="turn-order-row turn-order-row-idle turn-order-eliminated-row">
              <div className="turn-order-avatar">
                {player.avatar ? (
                  <img
                    src={`/avatars/${player.avatar}.png`}
                    alt={player.name}
                    className="w-full h-full object-cover rounded-full grayscale"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-[10px] rounded-full bg-slate-800 text-slate-500">
                    {player.name.substring(0, 2)}
                  </div>
                )}
              </div>
              <div className="turn-order-name-wrap">
                <span className="turn-order-name truncate text-slate-500 line-through">
                  {player.name}
                </span>
                <span className="text-[9px] text-slate-600 ml-1">
                  {player.placement}°
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
