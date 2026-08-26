import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Shuffle, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { socket } from '../services/socket';
import { useGame } from '../context/useGame';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface TurnPlayer {
  id: string;
  name: string;
  avatar?: string;
}

interface StartingLocationState {
  turnOrder?: TurnPlayer[];
  restart?: boolean;
}

function getAvatarGradient(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-emerald-400 to-teal-500',
    'from-cyan-400 to-blue-500',
    'from-indigo-400 to-purple-500',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
  ];

  return gradients[hash % gradients.length];
}

export default function StartingGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { room, playerId, isHost } = useGame();
  const locationState = location.state as StartingLocationState | null;
  const isRestart = locationState?.restart === true;
  const initialOrder = locationState?.turnOrder ?? null;
  const [turnOrder, setTurnOrder] = useState<TurnPlayer[] | null>(initialOrder);
  const [isShuffling, setIsShuffling] = useState(Boolean(initialOrder));

  useEffect(() => {
    const onTurnOrderAssigned = (players: TurnPlayer[]) => {
      setTurnOrder(players);
      setIsShuffling(true);
    };

    const onGameStarted = (gameState: unknown) => {
      navigate('/game', {
        state: {
          gameState,
          playerId,
        },
      });
    };

    const onGameRestarted = (gameState: unknown) => {
      navigate('/game', {
        state: {
          gameState,
          playerId,
        },
      });
    };

    socket.on('turn-order-assigned', onTurnOrderAssigned);
    socket.on('game-started', onGameStarted);
    socket.on('game-restarted', onGameRestarted);

    return () => {
      socket.off('turn-order-assigned', onTurnOrderAssigned);
      socket.off('game-started', onGameStarted);
      socket.off('game-restarted', onGameRestarted);
    };
  }, [navigate, playerId]);

  useEffect(() => {
    if (!turnOrder) return;

    const timeout = window.setTimeout(() => setIsShuffling(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [turnOrder]);

  const handleConfirmStart = () => {
    if (!room || !isHost || isShuffling || !turnOrder) return;
    socket.emit(isRestart ? 'confirm-restart-game' : 'confirm-start-game', room.code);
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full text-xs font-semibold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 uppercase">
            <Shuffle size={12} />
            Preparando partida
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isShuffling ? 'Sorteando el orden de turnos...' : 'Orden de turnos'}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isShuffling
              ? 'El orden se asigna una sola vez antes de comenzar.'
              : 'Este será el orden de juego de la partida.'}
          </p>
        </div>

        {!turnOrder ? (
          <div className="min-h-56 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-cyan-400" size={30} />
            <span className="text-sm">Esperando el orden de turnos...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {isShuffling ? (
              <motion.div
                key="shuffling"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative h-64 flex items-center justify-center"
              >
                {Array.from({ length: Math.min(4, turnOrder.length) }).map((_, index) => {
                  const player = turnOrder[index % turnOrder.length];
                  const isLeft = index % 2 === 0;

                  return (
                    <motion.div
                      key={`${player.id}-${index}`}
                      className="turn-shuffle-card absolute w-60 h-32 rounded-2xl bg-gradient-to-br from-black to-slate-950 border border-slate-800/80 p-4 shadow-2xl flex flex-col justify-between"
                      style={{ zIndex: 10 + index }}
                      animate={{
                        x: isLeft ? [0, -110, 10, 0] : [0, 110, -10, 0],
                        y: [0, -4 * index, 0],
                        scale: [1, 1.03, 0.97, 1],
                        rotate: isLeft ? [-2, -10, 0] : [2, 10, 0],
                      }}
                      transition={{
                        duration: 0.7,
                        repeat: Infinity,
                        delay: index * 0.12,
                        ease: 'easeInOut',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {player.avatar ? (
                          <img
                            src={`/avatars/${player.avatar}.png`}
                            alt={player.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-600/40"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(player.name)} flex items-center justify-center text-slate-950 font-black text-xs`}>
                            {player.name.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-bold text-slate-200 block truncate max-w-[140px]">
                            {player.name}
                          </span>
                           <span className="turn-shuffle-status text-[9px] text-cyan-400 font-medium animate-pulse">
                            Barajando...
                          </span>
                        </div>
                      </div>
                       <div className="turn-shuffle-track h-1 w-20 bg-slate-800 rounded-full overflow-hidden">
                         <div className="turn-shuffle-progress h-full bg-cyan-500 animate-pulse w-full" />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="turn-order"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.1 } },
                }}
                className="space-y-3"
              >
                {turnOrder.map((player, index) => (
                  <motion.div
                    key={player.id}
                    variants={{
                      hidden: { opacity: 0, y: 15, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1 },
                    }}
                    transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                     className="turn-order-entry flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                       <span className={`turn-order-position w-9 h-9 rounded-xl flex items-center justify-center text-slate-950 font-black text-sm ${
                         index === 0 ? 'turn-order-position-first bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-700'
                      }`}>
                        {index + 1}
                      </span>
                      {player.avatar ? (
                        <img
                          src={`/avatars/${player.avatar}.png`}
                          alt={player.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-600/40"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(player.name)} flex items-center justify-center text-slate-950 font-black text-xs`}>
                          {player.name.substring(0, 2)}
                        </div>
                      )}
                      <span className="text-sm font-bold text-slate-100">
                        {player.name} {player.id === playerId && '(tú)'}
                      </span>
                    </div>
                     <span className={`turn-order-start-label text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      index === 0
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'text-slate-500'
                    }`}>
                      {index === 0 ? 'Empieza' : `${index + 1}° jugador`}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="border-t border-slate-900 mt-8 pt-6 flex justify-center">
          {isHost ? (
            <Button
              fullWidth
              onClick={handleConfirmStart}
              disabled={!turnOrder || isShuffling}
            >
              {isShuffling ? 'Sorteando...' : 'Confirmar y comenzar'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold py-2">
              <Users className="text-amber-400" size={14} />
              Esperando que el host confirme el inicio...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
