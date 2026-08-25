import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { useGame } from '../context/useGame';
import { getGame, getGames } from '../services/api';
import type { PublicRoom as Room } from '../../../shared/types/PublicRoom.ts';
import type { GameDefinition, RoomSettings } from '../../../shared/types/GameDefinition.ts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LeaveConfirm from '../components/overlay/LeaveConfirm';
import { Copy, Check, Users, Crown, Loader2, ArrowLeft, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import LobbyChat from '../components/game/LobbyChat';

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

  const [localRoom, setLocalRoom] = useState<Room | null>(
    location.state?.room ?? null,
  );
  const room = contextRoom ?? localRoom;
  const playerName: string = contextPlayerName || (location.state?.playerName ?? '');
  const playerId: string = contextPlayerId || (location.state?.playerId ?? '');
  const isHost: boolean = contextIsHost || (location.state?.isHost ?? false);
  const canEditSettings = isHost;

  const [copied, setCopied] = useState(false);
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    let active = true;

    const gameId = room?.settings?.gameId ?? room?.game ?? null;
    const catalogRequest = canEditSettings
      ? getGames()
      : gameId
        ? getGame(gameId).then((game) => [game])
        : Promise.resolve([] as GameDefinition[]);

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
  }, [canEditSettings, room?.game, room?.settings?.gameId]);

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
      setLocalRoom(updatedRoom);
    };

    const onTurnOrderAssigned = (players: { id: string; name: string; avatar?: string }[]) => {
      navigate('/starting', { state: { turnOrder: players } });
    };

    socket.on('room-updated', onRoomUpdated);
    socket.on('turn-order-assigned', onTurnOrderAssigned);

    return () => {
      socket.off('connect', emitJoinRoom);
      socket.off('room-updated', onRoomUpdated);
      socket.off('turn-order-assigned', onTurnOrderAssigned);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartGame = () => {
    if (!room) return;
    socket.emit('start-game', room.code);
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
    if (!room || !canEditSettings) return;
    socket.emit('update-room-settings', {
      roomCode: room.code,
      settings,
    });
  };

  const handleSelectGame = (game: GameDefinition) => {
    handleUpdateSettings({
      gameId: game.id,
      versionId: game.versions[0]?.id ?? null,
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

  const handleLeaveRoom = () => {
    if (!room) return;

    socket.emit('leave-room', { roomCode: room.code });
    deactivate();
    navigate('/');
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
  const playersInGame = connectedPlayers.filter((player) => player.inGame);
  const availablePlayers = connectedPlayers.filter((player) => !player.inGame);
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
  const visibleExpansions = canEditSettings
    ? availableExpansions
    : availableExpansions.filter((expansion) =>
        roomSettings.expansionIds.includes(expansion.id),
      );
  const canStart = Boolean(
    canEditSettings &&
      selectedGame?.available &&
      selectedVersion?.available &&
      playersInGame.length === 0 &&
      availablePlayers.length >= selectedGame.minPlayers &&
      availablePlayers.length <= selectedGame.maxPlayers,
  );

  return (
    <div className="page-scroll w-full flex items-start justify-center p-6 relative">
      {/* Luces de fondo */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-5xl relative z-10">
        <button
          onClick={() => {
            setShowLeaveConfirm(true);
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
              {availablePlayers.length} / {selectedGame?.maxPlayers ?? '—'}
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
                    <span className={`text-[10px] block mt-0.5 ${player.inGame ? 'text-amber-400' : 'text-slate-400'}`}>
                      {player.inGame
                        ? 'En partida...'
                        : player.id === room.hostId
                          ? 'Creador de la sala'
                          : 'Disponible'}
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
                  <span className={`w-2 h-2 rounded-full animate-pulse shadow-sm ${
                    player.inGame
                      ? 'bg-amber-400 shadow-amber-400/50'
                      : 'bg-emerald-500 shadow-emerald-500/50'
                  }`}></span>
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
            {!canEditSettings && (
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
              {canEditSettings ? (
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
                          disabled={false}
                          onClick={() => handleSelectGame(game)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-400/50 shadow-lg shadow-cyan-500/5'
                              : 'bg-slate-900/30 border-slate-800/50'
                          } ${
                            game.available
                              ? 'cursor-pointer hover:border-cyan-400/40'
                              : 'cursor-pointer opacity-60 hover:border-slate-600'
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
                  {canEditSettings ? (
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
                      {canEditSettings
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
                            disabled={!canEditSettings}
                            onClick={() => handleToggleExpansion(expansion.id)}
                            className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border text-left transition-all ${
                              active
                                ? 'bg-amber-500/10 border-amber-500/40'
                                : 'bg-slate-900/30 border-slate-800/40'
                            } ${canEditSettings ? 'cursor-pointer hover:border-amber-400/40' : 'cursor-default'}`}
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
            ) : !selectedGame.available ? (
              <Button fullWidth disabled>
                Este juego estará disponible próximamente
              </Button>
            ) : playersInGame.length > 0 ? (
              <Button fullWidth disabled>
                Esperando a que todos vuelvan al lobby ({playersInGame.length} en partida)
              </Button>
            ) : availablePlayers.length < selectedGame.minPlayers ? (
              <Button fullWidth disabled>
                <Loader2 className="animate-spin mr-2 inline" size={14} />
                Esperando jugadores ({availablePlayers.length}/{selectedGame.minPlayers})...
              </Button>
            ) : availablePlayers.length > selectedGame.maxPlayers ? (
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

      <div className="fixed right-6 bottom-6 z-30 w-80 max-w-[calc(100vw-3rem)]">
        <LobbyChat room={room} />
      </div>

      {showLeaveConfirm && (
        <LeaveConfirm
          title="¿Abandonar el lobby?"
          description="Si abandonas el lobby, dejarás de participar en esta sala."
          onConfirm={handleLeaveRoom}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}

    </div>
  );
}
