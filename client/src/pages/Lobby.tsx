import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { socket } from '../services/socket';
import { useGame } from '../context/useGame';
import { getGame, getGames } from '../services/api';
import type { PublicRoom as Room } from '../../../shared/types/PublicRoom.ts';
import type { GameDefinition, RoomSettings } from '../../../shared/types/GameDefinition.ts';
import type { GameState } from '../../../shared/types/Game.ts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LeaveConfirm from '../components/overlay/LeaveConfirm';
import { Copy, Check, Crown, Loader2, ArrowLeft, Sparkles, ChevronDown, CheckCircle2, Bot, Plus, MoreVertical } from 'lucide-react';
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
  const [openPlayerMenuId, setOpenPlayerMenuId] = useState<string | null>(null);
  const [playerMenuPosition, setPlayerMenuPosition] = useState<{ top: number; left: number } | null>(null);

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

    const onSpectatorGameStarted = (state: GameState) => {
      const currentPlayer = roomRef.current?.players.find((player) => player.id === playerId);
      if (currentPlayer?.isSpectator) {
        navigate('/game', { state: { gameState: state } });
      }
    };
    const onKickedFromRoom = () => {
      deactivate();
      navigate('/');
    };

    socket.on('room-updated', onRoomUpdated);
    socket.on('turn-order-assigned', onTurnOrderAssigned);
    socket.on('game-started', onSpectatorGameStarted);
    socket.on('game-restarted', onSpectatorGameStarted);
    socket.on('kicked-from-room', onKickedFromRoom);

    return () => {
      socket.off('connect', emitJoinRoom);
      socket.off('room-updated', onRoomUpdated);
      socket.off('turn-order-assigned', onTurnOrderAssigned);
    socket.off('game-started', onSpectatorGameStarted);
    socket.off('game-restarted', onSpectatorGameStarted);
    socket.off('kicked-from-room', onKickedFromRoom);
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
    if (getRoomSettings().gameId === game.id) return;
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

  const handleAddDummy = () => {
    if (room) socket.emit('add-dummy-player', room.code);
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    if (!room) return;
    socket.emit('kick-player', { roomCode: room.code, playerId: targetPlayerId });
    setOpenPlayerMenuId(null);
  };

  const handleTransferHost = (targetPlayerId: string) => {
    if (!room) return;
    socket.emit('transfer-host', { roomCode: room.code, playerId: targetPlayerId });
    setOpenPlayerMenuId(null);
  };

  const handleToggleSpectator = () => {
    if (room) socket.emit('toggle-spectator', room.code);
  };

  const handleToggleReady = () => {
    if (room) socket.emit('toggle-ready', room.code);
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

  const connectedPlayers = room.players
    .filter((p) => p.connected)
    .sort((a, b) => Number(b.id === playerId) - Number(a.id === playerId));
  const playersInGame = connectedPlayers.filter((player) => player.inGame);
  const availablePlayers = connectedPlayers.filter((player) => !player.inGame && !player.isSpectator);
  const localPlayerIsSpectator = room.players.find((player) => player.id === playerId)?.isSpectator ?? false;
  const localPlayerIsReady = room.players.find((player) => player.id === playerId)?.isReady ?? false;
  const playersRequiringReady = connectedPlayers
    .filter((player) => !player.isSpectator);
  const readyPlayerCount = playersRequiringReady.filter((player) => player.id === room.hostId || player.isDummy || player.isReady).length;
  const allPlayersReady = playersRequiringReady
    .every((player) => player.id === room.hostId || player.isDummy || player.isReady);
  const roomSettings = getRoomSettings();
  const selectedGame = games.find((game) => game.id === roomSettings.gameId);
  const lobbyMaxPlayers = selectedGame?.maxPlayers ?? Number.POSITIVE_INFINITY;
  const lobbyRoomIsFull = connectedPlayers.filter((player) => !player.isSpectator).length >= lobbyMaxPlayers;
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
    <div className="platform-flat-page lobby-themed-page page-scroll w-full flex items-start justify-center p-6 relative">
      {openPlayerMenuId && playerMenuPosition && createPortal(
        <div
          className="lobby-player-menu fixed z-50 w-36 rounded-xl p-1 shadow-xl"
          style={{ top: playerMenuPosition.top, left: playerMenuPosition.left }}
        >
          <button type="button" onClick={() => handleTransferHost(openPlayerMenuId)}>
            Dar host
          </button>
          <button type="button" onClick={() => handleKickPlayer(openPlayerMenuId)}>
            Sacar de la sala
          </button>
        </div>,
        document.body,
      )}
      {/* Luces de fondo */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-6xl relative z-10">
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

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        {/* Información de la sala */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-800/70 bg-slate-950/25 p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Sala</p>
                <h2 className="mt-1 text-lg font-bold text-slate-100">Jugadores conectados</h2>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-400">
                  {availablePlayers.length} / {selectedGame?.maxPlayers ?? '—'}
                </span>
                {canEditSettings && (
                  <button
                    type="button"
                    onClick={handleAddDummy}
                    disabled={!selectedGame || playersInGame.length > 0 || availablePlayers.length >= selectedGame.maxPlayers}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-200 shadow-sm transition hover:border-slate-400 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
                    title={!selectedGame ? 'Selecciona un juego primero' : playersInGame.length > 0 ? 'La partida ya comenzó' : 'Agregar jugador dummy'}
                  >
                    <Plus size={13} />
                    <Bot size={13} />
                    {selectedGame && availablePlayers.length >= selectedGame.maxPlayers && (
                      <span className="sr-only">Sala llena</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {connectedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/40 bg-slate-900/30 p-4 transition-all hover:border-slate-700"
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
                    <span className={`lobby-player-name text-sm font-bold flex items-center gap-2 ${player.id === playerId ? 'lobby-local-player-name' : 'text-slate-200'}`}>
                      <span className={`h-2 w-2 shrink-0 rounded-full animate-pulse shadow-sm ${
                        player.inGame
                          ? 'bg-amber-400 shadow-amber-400/50'
                          : 'bg-emerald-500 shadow-emerald-500/50'
                      }`} />
                      {player.name}
                    </span>
                    <span className={`text-[10px] block mt-0.5 ${player.inGame ? 'text-amber-400' : player.isSpectator ? 'text-cyan-300' : player.isReady ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {player.inGame
                        ? 'En partida...'
                        : player.isSpectator
                          ? 'Espectador'
                        : player.isDummy || player.isReady
                          ? 'Listo'
                        : 'Disponible'}
                    </span>
                  </div>
                </div>

                <div className="relative flex shrink-0 items-center gap-2">
                  {player.id === room.hostId && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                      <Crown size={10} />
                      Host
                    </span>
                  )}
                  {canEditSettings && player.id !== playerId && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          if (openPlayerMenuId === player.id) {
                            setOpenPlayerMenuId(null);
                            setPlayerMenuPosition(null);
                            return;
                          }
                          const rect = event.currentTarget.getBoundingClientRect();
                          setPlayerMenuPosition({ top: rect.bottom + 4, left: rect.right - 144 });
                          setOpenPlayerMenuId(player.id);
                        }}
                        className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                        title={`Opciones para ${player.name}`}
                        aria-label={`Opciones para ${player.name}`}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
            <div className="lobby-spectator-section mt-5 flex items-center justify-between gap-4 rounded-2xl px-4 py-3">
              <div>
                <span className="block text-sm font-bold text-slate-200">Modo espectador</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={localPlayerIsSpectator}
                onClick={handleToggleSpectator}
                disabled={localPlayerIsSpectator && lobbyRoomIsFull}
                className={`lobby-spectator-switch relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  localPlayerIsSpectator ? 'is-on' : 'is-off'
                }`}
                title={localPlayerIsSpectator ? 'Volver a jugar' : 'Elegir ser espectador'}
              >
                <span className="lobby-spectator-switch-thumb absolute top-1 h-4 w-4 rounded-full transition-transform" />
              </button>
            </div>
          </section>

          <LobbyChat room={room} />
        </div>

        {/* Configuración de juego */}
        <section className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/25 p-5 lg:border-l lg:border-t-0 lg:pl-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Juego</p>
              <h2 className="mt-1 text-lg font-bold text-slate-100">Configuración de partida</h2>
            </div>
            {!canEditSettings && (
              <span className="text-right text-[10px] uppercase tracking-wider text-slate-500">
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {games.map((game) => {
                      const isSelected = game.id === roomSettings.gameId;
                      return (
                        <button
                          key={game.id}
                          type="button"
                          disabled={false}
                          onClick={() => handleSelectGame(game)}
                          className={`lobby-game-card w-full text-left rounded-2xl border transition-all ${
                            isSelected ? 'lobby-game-card-selected' : ''
                          } ${
                            game.id === 'unstable-unicorns' || game.id === 'exploding-kittens'
                              ? 'relative h-36 overflow-hidden p-0'
                              : 'h-36 p-4'
                          } ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-400/50 shadow-lg shadow-cyan-500/5'
                              : 'bg-slate-900/30 border-slate-800/50'
                          } ${
                            game.available
                              ? 'cursor-pointer hover:border-cyan-400/40'
                              : 'cursor-pointer opacity-60 hover:border-slate-600'
                          }`}
                        >
                          {game.id === 'unstable-unicorns' || game.id === 'exploding-kittens' ? (
                            <>
                              <img
                                src={`/covers/${game.id}.jpeg`}
                                alt={`Portada de ${game.name}`}
                                className="lobby-game-cover absolute inset-0 h-full w-full object-cover object-center"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/20" />
                              <span className="absolute left-4 bottom-3 text-[10px] font-bold text-white">
                                {game.minPlayers}-{game.maxPlayers} jugadores
                              </span>
                            </>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <span className="text-sm font-bold text-slate-100 block">{game.name}</span>
                                <span className="text-xs text-slate-400 block mt-1">{game.description}</span>
                                <span className="text-[10px] text-slate-500 block mt-2">
                                  {game.minPlayers}-{game.maxPlayers} jugadores
                                </span>
                              </div>
                            </div>
                          )}
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleExpansions.map((expansion) => {
                        const active = roomSettings.expansionIds.includes(expansion.id);
                        return (
                          <button
                            key={expansion.id}
                            type="button"
                            disabled={!canEditSettings}
                            onClick={() => handleToggleExpansion(expansion.id)}
                            className={`w-full flex items-center justify-between gap-4 rounded-2xl border text-left transition-all ${
                              active ? 'lobby-expansion-card-selected' : ''
                            } ${
                              expansion.id === 'rainbow_apocalypse' ? 'relative h-40 w-full max-w-[100px] overflow-hidden p-0' : 'p-4'
                            } ${
                              active
                                ? 'bg-amber-500/10 border-amber-500/40'
                                : 'bg-slate-900/30 border-slate-800/40'
                            } ${canEditSettings ? 'cursor-pointer hover:border-amber-400/40' : 'cursor-default'}`}
                          >
                            {expansion.id === 'rainbow_apocalypse' ? (
                              <>
                                <img
                                  src="/covers/expansions/rainbow-apocalypse.jpeg"
                                  alt={`Portada de ${expansion.name}`}
                                  className="lobby-expansion-cover absolute inset-0 h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-transparent to-slate-950/35" />
                                <span className="lobby-expansion-progress absolute bottom-3 left-3 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider">
                                  En progreso
                                </span>
                              </>
                            ) : (
                              <>
                                <span>
                                  <span className="text-sm font-bold text-slate-200 block">{expansion.name}</span>
                                  <span className="text-xs text-slate-400 block mt-1">{expansion.description}</span>
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
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
                disabled={!canStart || !allPlayersReady}
              >
                Iniciar partida
              </Button>
            )
          ) : (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                <Loader2 className="animate-spin text-emerald-400" size={14} />
                Esperando que el creador inicie la partida...
              </div>
              {!localPlayerIsSpectator && (
                <button
                  type="button"
                  onClick={handleToggleReady}
                  className={`lobby-ready-button w-full rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${localPlayerIsReady ? 'is-ready' : ''}`}
                >
                  {localPlayerIsReady ? 'Listo' : 'Confirmar que estoy listo'} ({readyPlayerCount}/{playersRequiringReady.length})
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

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
