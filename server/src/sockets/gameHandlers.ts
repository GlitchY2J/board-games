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
import type { PendingPlayLink } from '../../../shared/types/Game.ts';
import { VictoryManager } from '../game/VictoryManager.ts';
import { enqueueNeighAnimation, enqueueDrawAnimation, enqueueDiscardAnimation, enqueuePlayAnimation } from '../game/cardAnimations.ts';

const NEIGH_WINDOW_MS = 5000;
const NEIGH_GRACE_MS = 800;

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

  // Agrupar la cadena en bloques: los Neighs del mismo grupo (jugados dentro de
  // la ventana de gracia) apuntan a la misma carta y no se cancelan entre sí.
  interface NeighBlock {
    group: number;
    links: PendingPlayLink[];
  }
  const blocks: NeighBlock[] = [];
  for (const link of chain) {
    const group = link.group ?? 0;
    const last = blocks[blocks.length - 1];
    if (last && last.group === group) {
      last.links.push(link);
    } else {
      blocks.push({ group, links: [link] });
    }
  }

  // Un bloque de Neighs cancela al bloque inmediatamente inferior. El bloque
  // superior nunca está cancelado.
  const blockCanceled = new Array<boolean>(blocks.length).fill(false);
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (i === blocks.length - 1) {
      blockCanceled[i] = false;
    } else {
      const aboveIsNeigh = blocks[i + 1].links.some(
        (l) => l.card.effect === 'neigh' || l.card.effect === 'super_neigh',
      );
      blockCanceled[i] = aboveIsNeigh && !blockCanceled[i + 1];
    }
  }

  // Mapear estado de cancelación por eslabón de la cadena.
  const linkCanceled: boolean[] = [];
  for (const block of blocks) {
    for (let k = 0; k < block.links.length; k++) {
      linkCanceled.push(blockCanceled[blocks.indexOf(block)]);
    }
  }

  // Registrar animaciones para las cartas canceladas en la cadena.
  for (let i = 0; i < n - 1; i++) {
    if (linkCanceled[i]) {
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

  if (linkCanceled[0]) {
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
  registerToggleDebugMode(io, socket);
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

    const firstPlayer = room.gameState.players[room.gameState.currentPlayer];
    if (firstPlayer) {
      addLog(
        room.gameState,
        `Comienza el turno de ${firstPlayer.name} (turno ${room.gameState.turn})`,
        { playerId: firstPlayer.id },
      );
    }

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

    enqueuePlayAnimation(context.room.code, context.player.id, card);

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
          group: 0,
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

    // Double Dutch: robar solo es válido si aún no se jugó ninguna carta
    // (actionPlaysRemaining === 2). Tras jugar una carta, debe jugar otra o
    // terminar el turno manualmente.
    if (
      game.actionPlaysRemaining !== undefined &&
      game.actionPlaysRemaining !== 2
    ) {
      emitGameError(
        socket,
        'ACTION_NOT_ALLOWED',
        'Ya jugaste una carta con Double Dutch; debes jugar otra o terminar el turno.',
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

    if (game.debugMode && game.phase === TurnPhase.DRAW) {
      if (game.deck.length === 0) {
        emitGameError(
          socket,
          'DECK_EMPTY',
          'El mazo está vacío',
          'draw-action-card',
        );
        return;
      }

      // Modo debug: el jugador elige qué carta del mazo tomar
      game.pendingAction = {
        type: 'select_deck_card',
        reason: 'debug_draw',
        playerId: gamePlayer.id,
        candidates: [],
      };

      addLog(game, `${player.name} eligió carta del mazo (modo debug)`, {
        playerId: player.id,
      });

      emitGameState(io, room, 'game-updated');
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

    VictoryManager.checkWinner(game);

    if (game.phase === TurnPhase.DRAW) {
      game.phase = TurnPhase.ACTION;
    } else {
      game.actionUsed = true;
      // Robar como acción termina la fase de acción (Double Dutch no aplica).
      game.actionPlaysRemaining = undefined;
    }

    addLog(game, `${player.name} robó una carta del mazo`, {
      playerId: player.id,
    });

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

    const firstPlayer = room.gameState.players[room.gameState.currentPlayer];
    if (firstPlayer) {
      addLog(
        room.gameState,
        `Comienza el turno de ${firstPlayer.name} (turno ${room.gameState.turn})`,
        { playerId: firstPlayer.id },
      );
    }

    TurnManager.skipBeginningIfNoTriggers(room.gameState);

    emitGameState(io, room, 'game-restarted');

    console.log(`Partida reiniciada: ${roomCode}`);
  });
}

function registerToggleDebugMode(io: GameServer, socket: GameSocket): void {
  socket.on('toggle-debug-mode', (roomCode: string) => {
    const context = getSocketPlayerContext(socket, roomCode);

    if (!context) {
      return;
    }

    const { room, player } = context;

    if (room.hostId !== player.id) {
      emitGameError(
        socket,
        'NOT_HOST',
        'Solo el anfitrión puede activar el modo debug',
        'toggle-debug-mode',
      );
      return;
    }

    if (!room.gameState) {
      return;
    }

    room.gameState.debugMode = !room.gameState.debugMode;

    addLog(
      room.gameState,
      room.gameState.debugMode
        ? 'Modo debug activado'
        : 'Modo debug desactivado',
    );

    emitGameState(io, room, 'game-updated');

    console.log(`Modo debug: ${room.gameState.debugMode ? 'ON' : 'OFF'} (${roomCode})`);
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

    const withinGrace =
      pending.neighGraceUntil != null && startedAt < pending.neighGraceUntil;
    const group = withinGrace ? (top.group ?? 0) : (top.group ?? 0) + 1;

    pending.chain.push({
      playerId: player.id,
      playerName: player.name,
      card: neighCard,
      group,
    });

    pending.playerId = player.id;
    pending.playerName = player.name;
    pending.card = neighCard;
    pending.startedAt = startedAt;
    pending.acceptedIds = [];
    pending.neighGraceUntil = startedAt + NEIGH_GRACE_MS;

    addLog(
      game,
      neighCard.effect === 'super_neigh'
        ? `${player.name} jugó un Super Neigh`
        : `${player.name} jugó un Neigh`,
      { playerId: player.id },
    );

    // Super Neigh no puede ser Neigh'd: la cadena termina aquí.
    // Yay: el Neigh jugado por un jugador con Yay tampoco puede ser Neigh'd.
    const playerHasYay = gamePlayer.upgrades.some((c) => c.id === 'yay');

    if (neighCard.effect === 'super_neigh' || playerHasYay) {
      resolvePendingPlayWindow(io, room);
      return;
    }

    emitGameState(io, room, 'game-updated');

    startPendingTimer(io, room, startedAt);
  });
}
