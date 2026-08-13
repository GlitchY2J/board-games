import type { GameServer, GameSocket } from './socketTypes.ts';
import { createGameState } from '../game/unstable-unicorns/setup.ts';
import { RulesEngine } from '../game/unstable-unicorns/engine/RulesEngine.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';

import {
  emitGameError,
  getSocketGameContext,
  getSocketPlayerContext,
  requireActivePlayer,
} from './socketContext.ts';

import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import { roomManager } from '../roomManagerInstance.ts';
import type { Room } from '../game/models/Room.ts';
import { enqueueNeighAnimation, enqueueDrawAnimation, enqueueDiscardAnimation } from '../game/cardAnimations.ts';

const NEIGH_WINDOW_MS = 5000;

const NEIGH_EFFECTS = new Set(['neigh', 'super_neigh']);
const NO_NEIGH_CARDS = new Set(['ginormous_unicorn']);

const pendingTimers = new Map<string, NodeJS.Timeout>();

function startPendingTimer(io: GameServer, room: Room, startedAt: number): void {
  const previous = pendingTimers.get(room.code);
  if (previous) {
    clearTimeout(previous);
  }

  const timer = setTimeout(() => {
    pendingTimers.delete(room.code);

    const game = room.gameState;

    if (game?.pendingPlay && game.pendingPlay.startedAt === startedAt) {
      resolvePendingPlayWindow(io, room);
    }
  }, NEIGH_WINDOW_MS);

  pendingTimers.set(room.code, timer);
}

function clearPendingTimer(roomCode: string): void {
  const timer = pendingTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(roomCode);
  }
}

function resolvePendingPlayWindow(io: GameServer, room: Room): void {
  const game = room.gameState;

  if (!game?.pendingPlay) return;

  clearPendingTimer(room.code);

  const pending = game.pendingPlay;
  const chain = pending.chain;
  const n = chain.length;

  // Resolución pila (LIFO): la carta más reciente se resuelve primero.
  // Cada Neigh cancela a la carta inmediatamente debajo en la cadena.
  const canceled = new Array<boolean>(n).fill(false);

  for (let i = n - 1; i >= 0; i--) {
    if (i < n - 1) {
      canceled[i] = !canceled[i + 1];
    }
  }

  // Registrar animaciones para las cartas canceladas en la cadena
  for (let i = 0; i < n - 1; i++) {
    if (canceled[i]) {
      const type = chain[i + 1].card.effect === 'super_neigh' ? 'super_neigh' : 'neigh';
      enqueueNeighAnimation(
        room.code,
        chain[i].playerId,
        chain[i].playerName,
        chain[i].card.name,
        type,
      );
    }
  }

  // Los Neighs ya salieron de las manos al jugarse; ahora van al descarte.
  for (let i = 1; i < n; i++) {
    game.discard.push(chain[i].card);
  }

  const original = chain[0];
  const activePlayer = game.players.find((p) => p.id === original.playerId);

  if (canceled[0]) {
    if (activePlayer) {
      const idx = activePlayer.hand.findIndex(
        (c) => c.uid === original.card.uid,
      );

      if (idx !== -1) {
        const [removed] = activePlayer.hand.splice(idx, 1);
        enqueueDiscardAnimation(room.code, activePlayer.id, removed);
        game.discard.push(removed);
      }
    }

    game.actionUsed = true;

    addLog(
      game,
      `La carta "${original.card.name}" de ${original.playerName} fue bloqueada`,
      { playerId: original.playerId },
    );
  } else if (activePlayer) {
    RulesEngine.resolvePlay(game, activePlayer.id, original.card);

    addLog(
      game,
      `${original.playerName} jugó carta "${original.card.name}"`,
      { playerId: original.playerId },
    );
  }

  game.pendingPlay = undefined;

  emitGameState(io, room, 'game-updated');
}

export function registerGameHandlers(io: GameServer, socket: GameSocket): void {
  registerStartGame(io, socket);
  registerConfirmStartGame(io, socket);
  registerPlayCard(io, socket);
  registerDrawActionCard(io, socket);
  registerNextPhase(io, socket);
  registerEndTurn(io, socket);
  registerRestartGame(io, socket);
  registerNeighAccept(io, socket);
  registerPlayNeigh(io, socket);
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function registerStartGame(io: GameServer, socket: GameSocket): void {
  socket.on('start-game', (roomCode: string) => {
    const context = getSocketPlayerContext(socket, roomCode);

    if (!context) {
      return;
    }

    const { room, player } = context;

    if (room.hostId !== player.id) {
      emitGameError(
        socket,
        'NOT_HOST',
        'Solo el anfitrión puede iniciar la partida.',
        'start-game',
      );
      return;
    }

    if (room.gameState?.started) {
      emitGameError(
        socket,
        'GAME_ALREADY_STARTED',
        'La partida ya está iniciada.',
        'start-game',
      );
      return;
    }

    // Asignar el orden de turnos al azar
    room.players = shuffleArray(room.players);

    const order = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
    }));

    io.to(room.code).emit('turn-order-assigned', order);

    console.log(`Orden de turnos asignado en ${room.code}:`, order.map((p) => p.name));
  });
}

function registerConfirmStartGame(io: GameServer, socket: GameSocket): void {
  socket.on('confirm-start-game', (roomCode: string) => {
    const context = getSocketPlayerContext(socket, roomCode);

    if (!context) {
      return;
    }

    const { room, player } = context;

    if (room.hostId !== player.id) {
      emitGameError(
        socket,
        'NOT_HOST',
        'Solo el anfitrión puede confirmar el inicio.',
        'confirm-start-game',
      );
      return;
    }

    if (room.gameState?.started) {
      emitGameError(
        socket,
        'GAME_ALREADY_STARTED',
        'La partida ya está iniciada.',
        'confirm-start-game',
      );
      return;
    }

    room.gameState = createGameState(room);

    addLog(room.gameState, 'Partida iniciada');

    TurnManager.skipBeginningIfNoTriggers(room.gameState);

    emitGameState(io, room, 'game-started');

    console.log(`Partida iniciada: ${room.code}`);
  });
}

function registerPlayCard(io: GameServer, socket: GameSocket): void {
  socket.on('play-card', ({ roomCode, playerId, cardId }) => {
    const context = getSocketGameContext(socket, roomCode);

    if (!context) {
      return;
    }

    if (playerId !== context.player.id) {
      emitGameError(
        socket,
        'INVALID_PLAYER',
        'El jugador enviado no coincide con tu sesión.',
        'play-card',
      );
      return;
    }

    const result = RulesEngine.stagePlay(
      context.game,
      context.player.id,
      cardId,
    );

    if (!result.success) {
      socket.emit('game-error', result.error);
      return;
    }

    const { card } = result.data;
    const startedAt = Date.now();

    // Yay: las cartas que juegas no pueden ser Neigh'd → se resuelven de inmediato
    // sin abrir la ventana de Neigh. Se consulta el player del game state, no el
    // del room, porque las upgrades se acumulan sobre game.players.
    const gamePlayer = context.game.players.find(
      (p) => p.id === context.player.id,
    );
    const playerHasYay = gamePlayer?.upgrades.some(
      (c) => c.id === 'yay',
    );

    if (playerHasYay) {
      RulesEngine.resolvePlay(context.game, context.player.id, card);

      addLog(
        context.game,
        `${context.player.name} jugó carta "${card.name}" (protegida por Yay)`,
        { playerId: context.player.id },
      );

      emitGameState(io, context.room, 'game-updated');
      return;
    }

    context.game.pendingPlay = {
      playerId: context.player.id,
      playerName: context.player.name,
      card,
      startedAt,
      durationMs: NEIGH_WINDOW_MS,
      acceptedIds: [],
      chain: [
        {
          playerId: context.player.id,
          playerName: context.player.name,
          card,
        },
      ],
    };

    addLog(
      context.game,
      `${context.player.name} intentó jugar carta "${card.name}"`,
      { playerId: context.player.id },
    );

    emitGameState(io, context.room, 'game-updated');

    startPendingTimer(io, context.room, startedAt);
  });
}

function registerDrawActionCard(io: GameServer, socket: GameSocket): void {
  socket.on('draw-action-card', ({ roomCode, playerId }) => {
    console.log('DRAW ACTION CARD EVENT');
    const context = getSocketGameContext(socket, roomCode);

    if (!context || !requireActivePlayer(socket, context, 'draw-action-card')) {
      return;
    }

    const { game, player, room } = context;

    if (playerId !== player.id) {
      emitGameError(
        socket,
        'INVALID_PLAYER',
        'El jugador enviado no coincide con tu sentido.',
        'draw-action-card',
      );
      return;
    }

    if (game.actionUsed) {
      emitGameError(
        socket,
        'ACTION_ALREADY_USED',
        'Ya utilizaste tu acción de este turno.',
        'draw-action-card',
      );
      return;
    }

    if (game.pendingAction) {
      emitGameError(
        socket,
        'PENDING_ACTION',
        'Debes resolver la acción pendiente primero.',
        'draw-action-card',
      );
      return;
    }

    if (game.pendingPlay) {
      emitGameError(
        socket,
        'PENDING_ACTION',
        'Hay una carta en juego que aún no se ha resuelto.',
        'draw-action-card',
      );
      return;
    }

    const gamePlayer = game.players.find(
      (candidate) => candidate.id === player.id,
    );

    if (!gamePlayer) {
      emitGameError(
        socket,
        'PLAYER_NOT_FOUND',
        'No se encontró al jugador.',
        'draw-action-card',
      );
      return;
    }

    const card = game.deck.shift();

    if (!card) {
      emitGameError(
        socket,
        'DECK_EMPTY',
        'El mazo está vacío',
        'draw-action-card',
      );
      return;
    }

    enqueueDrawAnimation(game.roomCode, gamePlayer.id, card);
    gamePlayer.hand.push(card);

    if (game.phase === TurnPhase.DRAW) {
      game.phase = TurnPhase.ACTION;
    } else {
      game.actionUsed = true;
    }

    addLog(game, `${player.name} robó una carta`, { playerId: player.id });

    emitGameState(io, room, 'game-updated');
  });
}

function registerNextPhase(io: GameServer, socket: GameSocket): void {
  socket.on('next-phase', (roomCode: string) => {
    const context = getSocketGameContext(socket, roomCode);

    if (!context || !requireActivePlayer(socket, context, 'next-phase')) {
      return;
    }

    if (context.game.pendingAction) {
      emitGameError(
        socket,
        'PENDING_ACTION',
        'Debes resolver la acción pendiente primero.',
        'next-phase',
      );
      return;
    }

    if (context.game.pendingPlay) {
      emitGameError(
        socket,
        'PENDING_ACTION',
        'Hay una carta en juego que aún no se ha resuelto.',
        'next-phase',
      );
      return;
    }

    if (context.game.phase === TurnPhase.BEGINNING) {
      const presented = TurnManager.activateBeginningTriggers(context.game);
      if (presented) {
        emitGameState(io, context.room, 'game-updated');
        return;
      }
    }

    TurnManager.nextPhase(context.game);

    emitGameState(io, context.room, 'game-updated');
  });
}

function registerEndTurn(io: GameServer, socket: GameSocket): void {
  socket.on('end-turn', (roomCode: string) => {
    const context = getSocketGameContext(socket, roomCode);

    if (!context || !requireActivePlayer(socket, context, 'end-turn')) {
      return;
    }

    if (context.game.phase !== TurnPhase.ACTION) {
      emitGameError(
        socket,
        'INVALID_PHASE',
        'No puedes terminar el turno en esta fase.',
        'end-turn',
      );
      return;
    }

    if (context.game.pendingAction) {
      emitGameError(
        socket,
        'PENDING_ACTION',
        'Debes resolver la acción pendiente primero.',
        'end-turn',
      );
      return;
    }

    if (context.game.pendingPlay) {
      emitGameError(
        socket,
        'PENDING_ACTION',
        'Hay una carta en juego que aún no se ha resuelto.',
        'end-turn',
      );
      return;
    }

    TurnManager.nextPhase(context.game);

    emitGameState(io, context.room, 'game-updated');
  });
}

function registerRestartGame(io: GameServer, socket: GameSocket): void {
  socket.on('restart-game', (roomCode: string) => {
    const context = getSocketPlayerContext(socket, roomCode);

    if (!context) {
      return;
    }

    const { room, player } = context;

    if (room.hostId !== player.id) {
      emitGameError(
        socket,
        'NOT_HOST',
        'Solo el anfitrión puede reiniciar la partida',
        'restart-game',
      );
      return;
    }

    room.players = shuffleArray(room.players);

    room.gameState = createGameState(room);

    room.gameState.pendingAction = undefined;

    room.gameState.winnerId = undefined;

    room.gameState.actionUsed = false;

    addLog(room.gameState, 'Partida iniciada');

    TurnManager.skipBeginningIfNoTriggers(room.gameState);

    emitGameState(io, room, 'game-updated');

    console.log(`Partida reiniciada: ${roomCode}`);
  });
}

function registerNeighAccept(io: GameServer, socket: GameSocket): void {
  socket.on('neigh-accept', ({ roomCode }) => {
    const context = getSocketGameContext(socket, roomCode);

    if (!context) {
      return;
    }

    const { game, player, room } = context;

    const pending = game.pendingPlay;

    if (!pending) return;

    const top = pending.chain[pending.chain.length - 1];

    if (top.playerId === player.id) return;

    if (!pending.acceptedIds.includes(player.id)) {
      pending.acceptedIds.push(player.id);
    }

    addLog(game, `${player.name} aceptó la carta "${pending.card.name}"`, {
      playerId: player.id,
    });

    const othersCount = game.players.length - 1;

    if (pending.acceptedIds.length >= othersCount) {
      resolvePendingPlayWindow(io, room);
      return;
    }

    emitGameState(io, room, 'game-updated');
  });
}

function registerPlayNeigh(io: GameServer, socket: GameSocket): void {
  socket.on('play-neigh', ({ roomCode, cardId }) => {
    const context = getSocketGameContext(socket, roomCode);

    if (!context) {
      return;
    }

    const { game, player, room } = context;

    const pending = game.pendingPlay;

    if (!pending) return;

    const top = pending.chain[pending.chain.length - 1];

    if (top.playerId === player.id) return;

    const gamePlayer = game.players.find((p) => p.id === player.id);

    if (!gamePlayer) return;

    if (gamePlayer.stable.some((card) => NO_NEIGH_CARDS.has(card.id))) {
      emitGameError(
        socket,
        'ACTION_NOT_ALLOWED',
        'No puedes jugar Neigh mientras Ginormous Unicorn está en tu establo.',
        'play-neigh',
      );
      return;
    }

    if (gamePlayer.downgrades.some((card) => card.id === 'slowdown')) {
      emitGameError(
        socket,
        'ACTION_NOT_ALLOWED',
        'Slowdown te impide jugar cartas Instantáneas.',
        'play-neigh',
      );
      return;
    }

    const neighCard = gamePlayer.hand.find(
      (c) => c.uid === cardId && c.effect !== null && NEIGH_EFFECTS.has(c.effect),
    );

    if (!neighCard) {
      emitGameError(
        socket,
        'CARD_NOT_FOUND',
        'No tienes una carta Neigh en tu mano.',
        'play-neigh',
      );
      return;
    }

    const neighIndex = gamePlayer.hand.findIndex((c) => c.uid === cardId);

    gamePlayer.hand.splice(neighIndex, 1);

    const startedAt = Date.now();

    pending.chain.push({
      playerId: player.id,
      playerName: player.name,
      card: neighCard,
    });

    pending.playerId = player.id;
    pending.playerName = player.name;
    pending.card = neighCard;
    pending.startedAt = startedAt;
    pending.acceptedIds = [];

    addLog(
      game,
      neighCard.effect === 'super_neigh'
        ? `${player.name} jugó un Super Neigh`
        : `${player.name} jugó un Neigh`,
      { playerId: player.id },
    );

    // Super Neigh no puede ser Neigh'd: la cadena termina aquí
    if (neighCard.effect === 'super_neigh') {
      resolvePendingPlayWindow(io, room);
      return;
    }

    emitGameState(io, room, 'game-updated');

    startPendingTimer(io, room, startedAt);
  });
}
