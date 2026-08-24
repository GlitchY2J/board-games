import type { GameServer, GameSocket } from './socketTypes.ts';
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
import type { ChatMessage } from '../../../shared/types/Game.ts';
import { hasBlindingLight } from '../game/cards/effects/blindingLight.ts';
import { gameRegistry } from '../games/catalog.ts';
import { advanceTurnAfterDraw, startAttack } from '../game/exploding-kittens/turn.ts';

const NEIGH_WINDOW_MS = 5000;
const NEIGH_GRACE_MS = 800;

const NEIGH_EFFECTS = new Set(['neigh', 'super_neigh']);
const NO_NEIGH_CARDS = new Set(['ginormous_unicorn']);

const pendingTimers = new Map<string, NodeJS.Timeout>();

function isExplodingKittensRoom(room: Room): boolean {
  return (room.settings?.gameId ?? room.game) === 'exploding-kittens';
}

function isReactionEffect(effect: string | null, explodingKittens: boolean): boolean {
  return (
    effect === 'neigh' ||
    effect === 'super_neigh' ||
    (explodingKittens && effect === 'nope')
  );
}

export function startPendingTimer(io: GameServer, room: Room, startedAt: number): void {
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
  const explodingKittens = isExplodingKittensRoom(room);
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
      const aboveIsReaction = blocks[i + 1].links.some((link) =>
        isReactionEffect(link.card.effect, explodingKittens),
      );
      blockCanceled[i] = aboveIsReaction && !blockCanceled[i + 1];
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
      if (!explodingKittens) {
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
  }

  if (explodingKittens) {
    // Attack cards stay in hand while the reaction window is open, so a stacked
    // attack can still be canceled before all involved cards are discarded.
    for (let i = 0; i < n; i++) {
      const link = chain[i];
      if (link.card.effect === 'nope') continue;
      const owner = game.players.find((player) => player.id === link.playerId);
      const cardIndex = owner?.hand.findIndex((card) => card.uid === link.card.uid) ?? -1;
      if (owner && cardIndex !== -1) {
        const [card] = owner.hand.splice(cardIndex, 1);
        if (!game.discard.some((discarded) => discarded.uid === card.uid)) {
          game.discard.push(card);
          enqueueDiscardAnimation(room.code, owner.id, card);
        }
      } else if (!game.discard.some((discarded) => discarded.uid === link.card.uid)) {
        game.discard.push(link.card);
      }
    }

    // Los Nope se jugaron después de la carta original, por lo que deben
    // quedar después en el arreglo del descarte para que aparezcan primero.
    for (let i = 1; i < n; i++) {
      const link = chain[i];
      if (link.card.effect === 'nope' && !game.discard.some((card) => card.uid === link.card.uid)) {
        game.discard.push(link.card);
      }
    }
  } else {
    // Los Neighs ya salieron de las manos al jugarse; conservar su orden real.
    for (let i = 1; i < n; i++) {
      if (chain[i].card.effect === 'nope') {
        game.discard.push(chain[i].card);
      }
    }
  }

  const original = chain[0];
  const activePlayer = game.players.find((p) => p.id === original.playerId);

  if (linkCanceled[0]) {
    if (activePlayer && !explodingKittens) {
      const idx = activePlayer.hand.findIndex(
        (c) => c.uid === original.card.uid,
      );

      if (idx !== -1) {
        const [removed] = activePlayer.hand.splice(idx, 1);
        enqueueDiscardAnimation(room.code, activePlayer.id, removed);
        game.discard.push(removed);
      }
    }

    if (!explodingKittens) {
      // La carta negada aún consume una jugada de la fase de acción.
      RulesEngine.consumeActionPlay(game);
    }

    addLog(
      game,
      `La carta "${original.card.name}" de ${original.playerName} fue bloqueada`,
      { playerId: original.playerId },
    );
  } else if (activePlayer) {
    if (explodingKittens) {
      const successfulAttacks = chain.filter(
        (link, index) => link.card.id === 'attack' && !linkCanceled[index],
      );
      if (successfulAttacks.length > 0) {
        const lastAttacker = successfulAttacks[successfulAttacks.length - 1];
        startAttack(game, lastAttacker.playerId, pending.attackCount ?? successfulAttacks.length);
      }

      if (
        original.card.effect === 'cat_pair' &&
        chain.length === 2 &&
        pending.targetPlayerId
      ) {
        game.pendingAction = {
          type: 'select_hand_card',
          reason: 'two_of_a_kind',
          sourcePlayerId: original.playerId,
          targetPlayerId: pending.targetPlayerId,
        };
        game.pendingPlay = undefined;
        emitGameState(io, room, 'game-updated');
        return;
      }

      addLog(
        game,
        `${original.playerName} jugó carta "${original.card.name}"`,
        { playerId: original.playerId },
      );
    } else {
    RulesEngine.resolvePlay(game, activePlayer.id, original.card);

    addLog(
      game,
      `${original.playerName} jugó carta "${original.card.name}"`,
      { playerId: original.playerId },
    );
    }
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
  registerConfirmRestartGame(io, socket);
  registerToggleDebugMode(io, socket);
  registerNeighAccept(io, socket);
  registerPlayNeigh(io, socket);
  registerSendChat(io, socket);
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

    if (room.gameState?.started && room.gameState.players.length > 0) {
      emitGameError(
        socket,
        'PLAYERS_IN_GAME',
        'No se puede iniciar una nueva partida mientras haya jugadores en la partida actual.',
        'start-game',
      );
      return;
    }

    if (!validateRoomConfiguration(socket, room, 'start-game')) return;

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

    if (!validateRoomConfiguration(socket, room, 'confirm-start-game')) return;

    const engine = gameRegistry.getEngine(room.settings?.gameId ?? room.game);
    if (!engine) {
      emitGameError(
        socket,
        'GAME_NOT_AVAILABLE',
        'El motor de este juego todavía no está disponible.',
        'confirm-start-game',
      );
      return;
    }

    room.gameState = engine.createState(room);

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

function validateRoomConfiguration(
  socket: GameSocket,
  room: Room,
  action: 'start-game' | 'confirm-start-game',
): boolean {
  const gameId = room.settings?.gameId ?? room.game;
  const game = gameRegistry.getById(gameId);

  if (!game || !game.available) {
    emitGameError(
      socket,
      'GAME_NOT_AVAILABLE',
      'Selecciona un juego disponible antes de iniciar la partida.',
      action,
    );
    return false;
  }

  const versionId = room.settings?.versionId ?? null;
  const version = versionId
    ? game.versions.find((candidate) => candidate.id === versionId)
    : undefined;

  if (!version?.available) {
    emitGameError(
      socket,
      'INVALID_GAME_VERSION',
      'Selecciona una versión disponible antes de iniciar la partida.',
      action,
    );
    return false;
  }

  const expansionIds = room.settings?.expansionIds ?? room.expansions ?? [];
  const hasInvalidExpansion = expansionIds.some((expansionId) => {
    const expansion = game.expansions.find((candidate) => candidate.id === expansionId);
    return (
      !expansion?.available ||
      (expansion.versionIds && !expansion.versionIds.includes(version.id))
    );
  });

  if (hasInvalidExpansion) {
    emitGameError(
      socket,
      'INVALID_GAME_EXPANSION',
      'Una o más expansiones no son compatibles con la configuración seleccionada.',
      action,
    );
    return false;
  }

  const connectedPlayers = room.players.filter((player) => player.connected).length;
  if (connectedPlayers < game.minPlayers) {
    emitGameError(
      socket,
      'NOT_ENOUGH_PLAYERS',
      `Se necesitan al menos ${game.minPlayers} jugadores para iniciar.`,
      action,
    );
    return false;
  }

  if (connectedPlayers > game.maxPlayers) {
    emitGameError(
      socket,
      'TOO_MANY_PLAYERS',
      `Este juego permite como máximo ${game.maxPlayers} jugadores.`,
      action,
    );
    return false;
  }

  return true;
}

function registerPlayCard(io: GameServer, socket: GameSocket): void {
  socket.on('play-card', ({ roomCode, playerId, cardId, cardIds }) => {
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

    if (isExplodingKittensRoom(context.room)) {
      const gamePlayer = context.game.players.find(
        (player) => player.id === context.player.id,
      );
      const cardIndex = gamePlayer?.hand.findIndex((card) => card.uid === cardId) ?? -1;

      if (!gamePlayer || cardIndex < 0) {
        emitGameError(
          socket,
          'CARD_NOT_FOUND',
          'No se encontró la carta en tu mano.',
          'play-card',
        );
        return;
      }

      if (context.game.pendingAction) {
        emitGameError(
          socket,
          'PENDING_ACTION',
          'Debes resolver la selección pendiente primero.',
          'play-card',
        );
        return;
      }

      const card = gamePlayer.hand[cardIndex];
      const requestedCardIds = cardIds?.length ? cardIds : [cardId];
      const selectedCards = requestedCardIds.map((uid) =>
        gamePlayer.hand.find((handCard) => handCard.uid === uid),
      );
      const isCatCombo = requestedCardIds.length === 2 || requestedCardIds.length === 3;

      if (requestedCardIds.length > 1) {
        const validCatCombo =
          isCatCombo &&
          selectedCards.every((selected) => selected?.cardType === 'cat') &&
          selectedCards.every((selected) => selected?.id === card.id);

        if (!validCatCombo) {
          emitGameError(
            socket,
            'ACTION_NOT_ALLOWED',
            'Solo puedes combinar dos o tres cartas de gato idénticas.',
            'play-card',
          );
          return;
        }
      }

      const cardsToPlay = selectedCards.filter((selected): selected is typeof card => !!selected);
      const isTwoOfAKind = card.effect === 'cat_pair' && requestedCardIds.length === 2;
      const isNow = card.effect === 'now';
      const pending = context.game.pendingPlay;
      const fallbackAttackTargetId = pending
        ? context.game.players[
            (context.game.players.findIndex((player) => player.id === pending.playerId) + 1) %
              context.game.players.length
          ]?.id
        : undefined;
      const canStackAttack =
        !!pending &&
        (pending.chain[pending.chain.length - 1]?.card.id === 'attack' ||
          pending.chain[pending.chain.length - 1]?.card.effect === 'attack') &&
        (pending.targetPlayerId ?? fallbackAttackTargetId) === context.player.id &&
        card.cardType === 'action' &&
        card.id === 'attack' &&
        card.effect === 'attack';

      if (!canStackAttack && !isNow && context.game.players[context.game.currentPlayer]?.id !== context.player.id) {
        emitGameError(socket, 'NOT_YOUR_TURN', 'No es tu turno.', 'play-card');
        return;
      }

      if (card.effect === 'nope') {
        emitGameError(
          socket,
          'ACTION_NOT_ALLOWED',
          'Nope solo puede jugarse para responder a otra carta.',
          'play-card',
        );
        return;
      }

      if (card.cardType === 'defuse' || card.cardType === 'exploding_kitten') {
        emitGameError(
          socket,
          'ACTION_NOT_ALLOWED',
          'Esta carta no puede jugarse directamente.',
          'play-card',
        );
        return;
      }

      if (isTwoOfAKind) {
        context.game.pendingAction = {
          type: 'select_player',
          reason: 'two_of_a_kind',
          sourcePlayerId: context.player.id,
          targetPlayerId: '',
          cardIds: requestedCardIds,
        };

        addLog(context.game, `${context.player.name} jugó Two of a Kind`, {
          playerId: context.player.id,
        });
        emitGameState(io, context.room, 'game-updated');
        return;
      }

      if (canStackAttack && pending) {
        gamePlayer.hand.splice(cardIndex, 1);
        const startedAt = Date.now();
        const targetPlayer = context.game.players[
          (context.game.players.findIndex((player) => player.id === context.player.id) + 1) %
            context.game.players.length
        ];
        context.game.pendingPlay = {
          ...pending,
          playerId: context.player.id,
          playerName: context.player.name,
          card,
          startedAt,
          acceptedIds: [],
          targetPlayerId: targetPlayer?.id,
          targetPlayerName: targetPlayer?.name,
          attackCount: (pending.attackCount ?? 1) + 1,
          chain: [
            ...pending.chain,
            {
              playerId: context.player.id,
              playerName: context.player.name,
              card,
              group: (pending.chain[pending.chain.length - 1].group ?? 0) + 1,
            },
          ],
          neighGraceUntil: undefined,
        };
        addLog(context.game, `${context.player.name} apiló un Attack`, {
          playerId: context.player.id,
        });
        emitGameState(io, context.room, 'game-updated');
        startPendingTimer(io, context.room, startedAt);
        return;
      }

      const startedAt = Date.now();
      const targetPlayer =
        card.id === 'attack'
          ? context.game.players[
              (context.game.currentPlayer + 1) % context.game.players.length
            ]
          : undefined;
      context.game.pendingPlay = {
        playerId: context.player.id,
        playerName: context.player.name,
        card,
        startedAt,
        durationMs: NEIGH_WINDOW_MS,
        acceptedIds: [],
          targetPlayerId: targetPlayer?.id,
          targetPlayerName: targetPlayer?.name,
          attackCount: card.id === 'attack' ? 1 : undefined,
        chain: cardsToPlay.map((playedCard) => ({
          playerId: context.player.id,
          playerName: context.player.name,
          card: playedCard,
          group: 0,
        })),
      };

      if (card.id === 'attack' && card.effect === 'attack') {
        gamePlayer.hand.splice(cardIndex, 1);
      }

      addLog(context.game, `${context.player.name} intenta jugar carta "${card.name}"`, {
        playerId: context.player.id,
      });
      emitGameState(io, context.room, 'game-updated');
      startPendingTimer(io, context.room, startedAt);
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

    if (isExplodingKittensRoom(room)) {
      const gamePlayer = game.players.find((candidate) => candidate.id === player.id);

      if (game.debugMode) {
        game.pendingAction = {
          type: 'select_deck_card',
          reason: 'debug_draw',
          playerId: player.id,
          candidates: [],
        };
        emitGameState(io, room, 'game-updated');
        return;
      }

      const card = game.deck.shift();

      if (!gamePlayer) {
        emitGameError(socket, 'PLAYER_NOT_FOUND', 'No se encontró al jugador.', 'draw-action-card');
        return;
      }

      if (!card) {
        emitGameError(socket, 'DECK_EMPTY', 'El mazo está vacío.', 'draw-action-card');
        return;
      }

      enqueueDrawAnimation(game.roomCode, gamePlayer.id, card);
      gamePlayer.hand.push(card);
      addLog(game, `${player.name} robó una carta y terminó su turno`, {
        playerId: player.id,
      });
      advanceTurnAfterDraw(game);
      emitGameState(io, room, 'game-updated');
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

    const order = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
    }));

    io.to(room.code).emit('turn-order-assigned', order);

    console.log(`Nuevo orden de turnos asignado para reinicio en ${roomCode}`);
  });
}

function registerConfirmRestartGame(io: GameServer, socket: GameSocket): void {
  socket.on('confirm-restart-game', (roomCode: string) => {
    const context = getSocketPlayerContext(socket, roomCode);

    if (!context) return;

    const { room, player } = context;
    if (room.hostId !== player.id) {
      emitGameError(
        socket,
        'NOT_HOST',
        'Solo el anfitrión puede confirmar el reinicio.',
        'confirm-start-game',
      );
      return;
    }

    if (!room.gameState?.started) {
      emitGameError(
        socket,
        'GAME_NOT_STARTED',
        'No hay una partida iniciada para reiniciar.',
        'confirm-start-game',
      );
      return;
    }

    if (!validateRoomConfiguration(socket, room, 'confirm-start-game')) return;

    const engine = gameRegistry.getEngine(room.settings?.gameId ?? room.game);
    if (!engine) {
      emitGameError(
        socket,
        'GAME_NOT_AVAILABLE',
        'El motor de este juego todavía no está disponible.',
        'confirm-start-game',
      );
      return;
    }

    room.gameState = engine.createState(room);
    room.gameState.pendingAction = undefined;
    room.gameState.winnerId = undefined;
    room.gameState.actionUsed = false;

    addLog(room.gameState, 'Partida reiniciada');

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

    const explodingKittens = isExplodingKittensRoom(room);

    // Blinding Light neutraliza el efecto de Ginormous Unicorn en Unstable
    // Unicorns. Exploding Kittens no tiene esta restricción.
    if (
      !explodingKittens &&
      gamePlayer.stable.some((card) => NO_NEIGH_CARDS.has(card.id)) &&
      !hasBlindingLight(gamePlayer)
    ) {
      emitGameError(
        socket,
        'ACTION_NOT_ALLOWED',
        'No puedes jugar Neigh mientras Ginormous Unicorn está en tu establo.',
        'play-neigh',
      );
      return;
    }

    if (!explodingKittens && gamePlayer.downgrades.some((card) => card.id === 'slowdown')) {
      emitGameError(
        socket,
        'ACTION_NOT_ALLOWED',
        'Slowdown te impide jugar cartas Instantáneas.',
        'play-neigh',
      );
      return;
    }

    const neighCard = gamePlayer.hand.find(
      (c) =>
        c.uid === cardId &&
        isReactionEffect(c.effect, explodingKittens),
    );

    if (!neighCard) {
      emitGameError(
        socket,
        'CARD_NOT_FOUND',
          explodingKittens
            ? 'No tienes una carta Nope en tu mano.'
            : 'No tienes una carta Neigh en tu mano.',
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
      explodingKittens
        ? `${player.name} jugó un Nope`
        : neighCard.effect === 'super_neigh'
          ? `${player.name} jugó un Super Neigh`
          : `${player.name} jugó un Neigh`,
      { playerId: player.id },
    );

    // Super Neigh no puede ser Neigh'd: la cadena termina aquí.
    // Yay: el Neigh jugado por un jugador con Yay tampoco puede ser Neigh'd.
    const playerHasYay = gamePlayer.upgrades.some((c) => c.id === 'yay');

    if ((!explodingKittens && neighCard.effect === 'super_neigh') || playerHasYay) {
      resolvePendingPlayWindow(io, room);
      return;
    }

    emitGameState(io, room, 'game-updated');

    startPendingTimer(io, room, startedAt);
  });
}

let chatSeq = 0;

function registerSendChat(io: GameServer, socket: GameSocket): void {
  socket.on('send-chat', ({ roomCode, text }) => {
    const context = getSocketGameContext(socket, roomCode);

    if (!context) {
      return;
    }

    const { game, player, room } = context;

    const cleaned = text.trim().slice(0, 500);

    if (!cleaned) {
      emitGameError(
        socket,
        'EMPTY_CHAT',
        'El mensaje no puede estar vacío.',
        'send-chat',
      );
      return;
    }

    if (!game.chat) {
      game.chat = [];
    }

    const message: ChatMessage = {
      id: `chat-${Date.now()}-${++chatSeq}`,
      playerId: player.id,
      playerName: player.name,
      text: cleaned,
      timestamp: Date.now(),
    };

    game.chat.push(message);

    // Evitar que el historial de chat crezca sin límite.
    if (game.chat.length > 200) {
      game.chat.splice(0, game.chat.length - 200);
    }

    io.to(room.code).emit('chat-message', { roomCode, message });
    emitGameState(io, room, 'game-updated');
  });
}
