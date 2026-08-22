import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { useGame } from '../context/GameContext';
import { getGame, getGames } from '../services/api';
import type { Room } from '../../../shared/types/Room.ts';
import type { GameDefinition, RoomSettings } from '../../../shared/types/GameDefinition.ts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Copy, Check, Users, Crown, Loader2, ArrowLeft, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    room: contextRoom,
    playerId: contextPlayerId,
    playerName: contextPlayerName,
    isHost: contextIsHost,
    deactivate,
  } = useGame();

  const [room, setRoom] = useState<Room | null>(
    contextRoom ?? location.state?.room ?? null,
  );
  const playerName: string = contextPlayerName || (location.state?.playerName ?? '');
  const playerId: string = contextPlayerId || (location.state?.playerId ?? '');
  const isHost: boolean = contextIsHost || (location.state?.isHost ?? false);

  useEffect(() => {
    if (contextRoom) {
      setRoom(contextRoom);
    }
  }, [contextRoom]);

  const [copied, setCopied] = useState(false);
  const [turnOrder, setTurnOrder] = useState<{ id: string; name: string; avatar?: string }[] | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [isVisualShuffling, setIsVisualShuffling] = useState(false);
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);

  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    let active = true;

    const gameId = room?.settings?.gameId ?? room?.game ?? null;
    const catalogRequest = isHost
      ? getGames()
      : gameId
        ? getGame(gameId).then((game) => [game])
        : Promise.resolve([] as GameDefinition[]);

    setCatalogLoading(true);
    setCatalogError('');

    catalogRequest
      .then((availableGames) => {
        if (active) setGames(availableGames);
      })
      .catch(() => {
        if (active) setCatalogError('No se pudo cargar la configuración del juego.');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isHost, room?.game, room?.settings?.gameId]);

  useEffect(() => {
    if (!room) return;

    const emitJoinRoom = () => {
      if (roomRef.current) {
        socket.emit('join-room', {
          roomCode: roomRef.current.code,
          playerName,
        });
      }
    };

    if (socket.connected) {
      emitJoinRoom();
    }

    socket.on('connect', emitJoinRoom);

    const onRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const onGameStarted = (gameState: any) => {
      navigate('/game', {
        state: {
          gameState,
          playerId,
        },
      });
    };

    const onTurnOrderAssigned = (players: { id: string; name: string; avatar?: string }[]) => {
      setShuffling(false);
      setIsVisualShuffling(true);
      setTurnOrder(players); // Set immediately so the modal renders
      
      // Delay finishing the shuffle animation
      setTimeout(() => {
        setIsVisualShuffling(false);
      }, 2000);
    };

    socket.on('room-updated', onRoomUpdated);
    socket.on('game-started', onGameStarted);
    socket.on('turn-order-assigned', onTurnOrderAssigned);

    return () => {
      socket.off('connect', emitJoinRoom);
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-started', onGameStarted);
      socket.off('turn-order-assigned', onTurnOrderAssigned);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartGame = () => {
    if (!room) return;
    socket.emit('start-game', room.code);
  };

  const handleShuffleAgain = () => {
    if (!room) return;
    setShuffling(true);
    setIsVisualShuffling(true);
    socket.emit('start-game', room.code);
  };

  const handleConfirmStart = () => {
    if (!room) return;
    socket.emit('confirm-start-game', room.code);
  };

  const getRoomSettings = (): RoomSettings => {
    const gameId = room?.settings?.gameId ?? room?.game ?? null;
    const game = games.find((candidate) => candidate.id === gameId);
    const versionId =
      room?.settings?.versionId ??
      game?.versions.find((version) => version.available)?.id ??
      null;

    return {
      gameId: gameId || null,
      versionId,
      expansionIds: room?.settings?.expansionIds ?? room?.expansions ?? [],
    };
  };

  const handleUpdateSettings = (settings: RoomSettings) => {
    if (!room || !isHost) return;
    socket.emit('update-room-settings', {
      roomCode: room.code,
      settings,
    });
  };

  const handleSelectGame = (game: GameDefinition) => {
    if (!game.available) return;

    handleUpdateSettings({
      gameId: game.id,
      versionId: game.versions.find((version) => version.available)?.id ?? null,
      expansionIds: [],
    });
  };

  const handleSelectVersion = (versionId: string) => {
    const settings = getRoomSettings();
    handleUpdateSettings({ ...settings, versionId, expansionIds: [] });
  };

  const handleToggleExpansion = (expansionId: string) => {
    const settings = getRoomSettings();
    const expansionIds = settings.expansionIds.includes(expansionId)
      ? settings.expansionIds.filter((id) => id !== expansionId)
      : [...settings.expansionIds, expansionId];

    handleUpdateSettings({ ...settings, expansionIds });
  };

  const handleCopyCode = () => {
    if (!room) return;

    const copyToClipboard = () => {
      const textarea = document.createElement('textarea');
      textarea.value = room.code;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(room.code)
        .then(() => setCopied(true))
        .catch(() => {
          copyToClipboard();
          setCopied(true);
        });
    } else {
      copyToClipboard();
      setCopied(true);
    }

    setTimeout(() => setCopied(false), 2000);
  };

  // Genera un gradiente sutil único para el avatar basado en el nombre del jugador
  const getAvatarGradient = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-emerald-400 to-teal-500',
      'from-cyan-400 to-blue-500',
      'from-indigo-400 to-purple-500',
      'from-rose-400 to-pink-500',
      'from-amber-400 to-orange-500'
    ];
    return gradients[hash % gradients.length];
  };

  if (!room) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-emerald-400 mb-4" size={40} />
        <h2 className="text-xl font-medium text-slate-300">Cargando lobby...</h2>
      </div>
    );
  }

  const connectedPlayers = room.players.filter((p) => p.connected);
  const roomSettings = getRoomSettings();
  const selectedGame = games.find((game) => game.id === roomSettings.gameId);
  const selectedVersion = selectedGame?.versions.find(
    (version) => version.id === roomSettings.versionId,
  );
  const availableExpansions = selectedGame?.expansions.filter(
    (expansion) =>
      expansion.available &&
      (!expansion.versionIds || (selectedVersion && expansion.versionIds.includes(selectedVersion.id))),
  ) ?? [];
  const visibleExpansions = isHost
    ? availableExpansions
    : availableExpansions.filter((expansion) =>
        roomSettings.expansionIds.includes(expansion.id),
      );
  const canStart = Boolean(
    isHost &&
      selectedGame?.available &&
      selectedVersion?.available &&
      connectedPlayers.length >= selectedGame.minPlayers &&
      connectedPlayers.length <= selectedGame.maxPlayers,
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Luces de fondo */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-5xl relative z-10">
        <button
          onClick={() => {
            socket.emit('leave-room', { roomCode: room.code });
            deactivate();
            navigate('/');
          }}
          className="absolute top-8 left-8 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Abandonar
        </button>

        {/* Encabezado del Lobby */}
        <div className="text-center mt-6 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full text-xs font-semibold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 uppercase">
            <Users size={12} />
            Sala de Espera
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Lobby del Juego</h1>
          <p className="text-slate-400 text-sm mt-2">
            Invita a otros jugadores compartiendo el código
          </p>
        </div>

        {/* Código de Sala */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Código de Acceso
            </span>
            <span className="text-3xl font-black tracking-widest text-white mt-1 block">
              {room.code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                Copiado
              </>
            ) : (
              <>
                <Copy size={14} />
                Copiar Código
              </>
            )}
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start">
        {/* Lista de Jugadores */}
        <div className="mb-0">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Jugadores Conectados
            </span>
            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
              {connectedPlayers.length} / {selectedGame?.maxPlayers ?? '—'}
            </span>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {connectedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 hover:border-slate-800 transition-all"
              >
                <div className="flex items-center gap-3">
                  {player.avatar ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-600/40 shrink-0">
                      <img
                        src={`/avatars/${player.avatar}.png`}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                        player.name
                      )} flex items-center justify-center text-slate-950 font-black text-sm uppercase shadow-inner`}
                    >
                      {player.name.substring(0, 2)}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-bold text-slate-200 block">
                      {player.name} {player.id === playerId && '(tú)'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {player.id === room.hostId ? 'Creador de la sala' : 'Invitado'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {player.id === room.hostId && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                      <Crown size={10} />
                      Host
                    </span>
                  )}
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuración de juego */}
        <div className="mb-0 border-t border-slate-900 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0 space-y-6">
          <div className="flex justify-between items-center px-2">
            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Configuración de partida
            </span>
            {!isHost && (
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                Solo el host puede editar
              </span>
            )}
          </div>

          {catalogLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/30 px-4 py-4 text-sm text-slate-400">
              <Loader2 className="animate-spin text-cyan-400" size={16} />
              Cargando juegos...
            </div>
          ) : catalogError ? (
            <p role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {catalogError}
            </p>
          ) : (
            <>
              {isHost ? (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Elige un juego
                    </span>
                  </div>
                  <div className="grid gap-3">
                    {games.map((game) => {
                      const isSelected = game.id === roomSettings.gameId;
                      return (
                        <button
                          key={game.id}
                          type="button"
                          disabled={!game.available}
                          onClick={() => handleSelectGame(game)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-400/50 shadow-lg shadow-cyan-500/5'
                              : 'bg-slate-900/30 border-slate-800/50'
                          } ${
                            game.available
                              ? 'cursor-pointer hover:border-cyan-400/40'
                              : 'cursor-default opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-sm font-bold text-slate-100 block">
                                {game.name}
                              </span>
                              <span className="text-xs text-slate-400 block mt-1">
                                {game.description}
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-2">
                                {game.minPlayers}-{game.maxPlayers} jugadores
                              </span>
                            </div>
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${
                              game.available
                                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}>
                              {game.available ? (isSelected ? 'Seleccionado' : 'Disponible') : 'Próximamente'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                    Juego seleccionado
                  </span>
                  <span className="text-lg font-bold text-slate-100 block mt-2">
                    {selectedGame?.name ?? 'Esperando selección del host'}
                  </span>
                  {selectedGame && (
                    <span className="text-xs text-slate-400 block mt-1">
                      {selectedGame.description}
                    </span>
                  )}
                </div>
              )}

              {selectedGame && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    Versión
                  </label>
                  {isHost ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setVersionMenuOpen((open) => !open)}
                        className={`w-full flex items-center justify-between gap-3 rounded-2xl bg-slate-950/60 border px-4 py-3 text-left transition-all ${
                          versionMenuOpen
                            ? 'border-cyan-400/60 ring-2 ring-cyan-400/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>
                          <span className="text-sm font-semibold text-slate-200 block">
                            {selectedVersion?.name ?? 'Selecciona una versión'}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {selectedVersion?.description ?? 'Configura la edición del juego'}
                          </span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-slate-400 transition-transform ${versionMenuOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {versionMenuOpen && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                          {selectedGame.versions.map((version) => {
                            const selected = version.id === roomSettings.versionId;
                            return (
                              <button
                                key={version.id}
                                type="button"
                                disabled={!version.available}
                                onClick={() => {
                                  handleSelectVersion(version.id);
                                  setVersionMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                  selected
                                    ? 'bg-cyan-500/15 text-cyan-200'
                                    : 'text-slate-300 hover:bg-slate-800/80'
                                } ${!version.available ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                              >
                                <span>
                                  <span className="text-sm font-semibold block">
                                    {version.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">
                                    {version.available ? version.description : 'Disponible próximamente'}
                                  </span>
                                </span>
                                {selected && <CheckCircle2 size={16} className="shrink-0 text-cyan-400" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-slate-950/60 border border-slate-800 px-4 py-3 text-sm text-slate-300">
                      {selectedVersion?.name ?? 'Esperando versión'}
                    </p>
                  )}
                </div>
              )}

              {selectedGame && (
                <div>
                  <div className="flex justify-between items-center mb-3 px-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Expansiones
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {roomSettings.expansionIds.length} activas
                    </span>
                  </div>
                  {visibleExpansions.length === 0 ? (
                    <p className="rounded-2xl border border-slate-800/50 bg-slate-900/30 px-4 py-3 text-xs text-slate-500">
                      {isHost
                        ? 'Este juego no tiene expansiones disponibles para la versión seleccionada.'
                        : 'No hay expansiones activas.'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {visibleExpansions.map((expansion) => {
                        const active = roomSettings.expansionIds.includes(expansion.id);
                        return (
                          <button
                            key={expansion.id}
                            type="button"
                            disabled={!isHost}
                            onClick={() => handleToggleExpansion(expansion.id)}
                            className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border text-left transition-all ${
                              active
                                ? 'bg-amber-500/10 border-amber-500/40'
                                : 'bg-slate-900/30 border-slate-800/40'
                            } ${isHost ? 'cursor-pointer hover:border-amber-400/40' : 'cursor-default'}`}
                          >
                            <span>
                              <span className="text-sm font-bold text-slate-200 block">
                                {expansion.name}
                              </span>
                              <span className="text-xs text-slate-400 block mt-1">
                                {expansion.description}
                              </span>
                            </span>
                            <span className={`w-11 h-6 flex items-center rounded-full p-1 shrink-0 ${active ? 'bg-amber-400' : 'bg-slate-800 border border-slate-700'}`}>
                              <span className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        </div>

        {/* Panel de Control/Inicio */}
        <div className="border-t border-slate-900 pt-6 flex justify-center">
          {isHost ? (
            !selectedGame ? (
              <Button fullWidth disabled>
                Selecciona un juego para continuar
              </Button>
            ) : connectedPlayers.length < selectedGame.minPlayers ? (
              <Button fullWidth disabled>
                <Loader2 className="animate-spin mr-2 inline" size={14} />
                Esperando jugadores ({connectedPlayers.length}/{selectedGame.minPlayers})...
              </Button>
            ) : connectedPlayers.length > selectedGame.maxPlayers ? (
              <Button fullWidth disabled>
                Demasiados jugadores para este juego
              </Button>
            ) : (
              <Button
                onClick={handleStartGame}
                fullWidth
                disabled={!canStart}
              >
                Iniciar partida
              </Button>
            )
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold py-2">
              <Loader2 className="animate-spin text-emerald-400" size={14} />
              Esperando que el creador inicie la partida...
            </div>
          )}
        </div>
      </Card>

      {/* Interfaz de asignación de turnos */}
      {turnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
          <Card className="w-full max-w-md relative z-10">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full text-xs font-semibold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 uppercase">
                <Users size={12} />
                Orden de Turnos
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {isVisualShuffling ? 'Barajando turnos...' : 'Se han asignado los turnos'}
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                {isVisualShuffling 
                  ? 'Decidiendo el orden de juego al azar...' 
                  : 'El orden fue barajado al azar. El primer jugador comienza la partida.'}
              </p>
            </div>

            <div className="mb-8 min-h-[260px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isVisualShuffling ? (
                  <motion.div
                    key="shuffling-deck"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full h-48 flex items-center justify-center"
                  >
                    {[...Array(Math.min(4, turnOrder.length))].map((_, idx) => {
                      const playerInfo = turnOrder[idx % turnOrder.length];
                      return (
                        <motion.div
                          key={idx}
                          className="absolute w-60 h-32 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 shadow-2xl flex flex-col justify-between"
                          style={{
                            zIndex: 10 + idx,
                          }}
                          animate={{
                            x: idx % 2 === 0 
                              ? [0, -110, 10, 0] 
                              : [0, 110, -10, 0],
                            y: [0, -4 * idx, 0],
                            scale: [1, 1.03, 0.97, 1],
                            rotate: [idx % 2 === 0 ? -2 : 2, idx % 2 === 0 ? -10 : 10, 0],
                          }}
                          transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            repeatType: "loop",
                            delay: idx * 0.12,
                            ease: "easeInOut"
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {playerInfo?.avatar ? (
                              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-600/40 shrink-0">
                                <img
                                  src={`/avatars/${playerInfo.avatar}.png`}
                                  alt={playerInfo.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                  playerInfo?.name || 'Player'
                                )} flex items-center justify-center text-slate-950 font-black text-xs uppercase shadow-inner`}
                              >
                                {(playerInfo?.name || 'PL').substring(0, 2)}
                              </div>
                            )}
                            <div className="text-left">
                              <span className="text-sm font-bold text-slate-200 block truncate max-w-[120px]">
                                {playerInfo?.name}
                              </span>
                              <span className="text-[9px] text-cyan-400 font-medium block animate-pulse">
                                Barajando...
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3">
                            <div className="h-1 w-20 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 animate-pulse w-full"></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 tracking-wider">
                              ?
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="turn-order-list"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.1,
                        }
                      }
                    }}
                    className="space-y-3 w-full"
                  >
                    {turnOrder.map((p, index) => (
                      <motion.div
                        key={p.id}
                        variants={{
                          hidden: { opacity: 0, y: 15, scale: 0.98 },
                          visible: { opacity: 1, y: 0, scale: 1 }
                        }}
                        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50 transition-all hover:border-slate-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-slate-950 font-black text-sm shadow-inner ${
                              index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-700'
                            }`}
                          >
                            {index + 1}
                          </span>
                          {p.avatar ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-600/40 shrink-0">
                              <img
                                src={`/avatars/${p.avatar}.png`}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(
                                p.name
                              )} flex items-center justify-center text-slate-950 font-black text-xs uppercase shadow-inner`}
                            >
                              {p.name.substring(0, 2)}
                            </div>
                          )}
                          <span className="text-sm font-bold text-slate-100">
                            {p.name} {p.id === playerId && '(tú)'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            index === 0
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'text-slate-500'
                          }`}
                        >
                          {index === 0 ? 'Empieza' : `${index + 1}° jugador`}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-slate-900 pt-6 flex flex-col items-center gap-3">
              {isHost && (
                <>
                  <Button onClick={handleConfirmStart} fullWidth disabled={shuffling || isVisualShuffling}>
                    {shuffling || isVisualShuffling ? 'Barajando...' : 'Confirmar y comenzar'}
                  </Button>
                  <button
                    onClick={handleShuffleAgain}
                    disabled={shuffling || isVisualShuffling}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Loader2 className={shuffling || isVisualShuffling ? 'animate-spin' : ''} size={14} />
                    Barajar de nuevo
                  </button>
                </>
              )}
              {!isHost && (
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold py-2">
                  <Loader2 className="animate-spin text-amber-400" size={14} />
                  {isVisualShuffling 
                    ? 'Barajando turnos...' 
                    : 'Esperando que el creador confirme el orden...'}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
