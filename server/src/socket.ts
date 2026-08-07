import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager.ts';
import { createGameState } from './game/unstable-unicorns/setup.ts';
import { RulesEngine } from './game/unstable-unicorns/engine/RulesEngine.ts';
import { TurnManager } from './game/turn/TurnManager.ts';
import { TurnPhase } from './game/turn/TurnPhase.ts';
import { ActionResolver } from './game/unstable-unicorns/engine/ActionResolver.ts';
import { CardMovement } from './game/unstable-unicorns/engine/CardMovement.ts';
import { Room } from './game/models/Room.ts';
import { Player } from './game/models/Player.ts';
import { GameState } from './game/models/GameState.ts';
import type { Card } from './game/models/Card.ts';
import {
  GameActionName,
  GameError,
  GameErrorCode,
} from '../../shared/types/GameError.ts';

const roomManager = new RoomManager();

const CARD_BACK_IMAGE = '/cards/base/card_back.png';

function createHiddenCard(id: string): Card {
  return {
    id,
    name: 'Hidden Card',
    cardType: 'instant',
    image: CARD_BACK_IMAGE,
    description: '',
    effect: null,
    copies: 0,
    expansion: '',
  };
}

type SocketPlayerContext = {
  room: Room;
  player: Player;
};

type SocketGameContext = SocketPlayerContext & {
  game: GameState;
};

function emitGameError(
  socket: Socket,
  code: GameErrorCode,
  message: string,
  action: GameActionName = 'unknown',
): void {
  const error: GameError = {
    code,
    message,
    action,
  };
  socket.emit('error-message', error);
}

function getSocketPlayerContext(
  socket: Socket,
  roomCode: string,
): SocketPlayerContext | null {
  const room = roomManager.getRoom(roomCode);

  if (!room) {
    emitGameError(socket, 'ROOM_NOT_FOUND', 'Sala no encontrada');
    return null;
  }

  const player = room.players.find(
    (candidate) => candidate.socketId === socket.id,
  );

  if (!player) {
    emitGameError(socket, 'PLAYER_NOT_IN_ROOM', 'No perteneces a esta sala.');
    return null;
  }

  return { room, player };
}

function getSocketGameContext(
  socket: Socket,
  roomCode: string,
): SocketGameContext | null {
  const context = getSocketPlayerContext(socket, roomCode);

  if (!context) {
    return null;
  }

  if (!context.room.gameState) {
    emitGameError(
      socket,
      'GAME_NOT_STARTED',
      'La partida todavía no ha comenzado.',
    );
    return null;
  }

  return { ...context, game: context.room.gameState };
}

function isActivePlayer(game: GameState, playerId: string): boolean {
  return game.players[game.currentPlayer]?.id === playerId;
}

function requireActivePlayer(
  socket: Socket,
  context: SocketGameContext,
  action: GameActionName,
): boolean {
  if (!isActivePlayer(context.game, context.player.id)) {
    emitGameError(socket, 'NOT_YOUR_TURN', 'No es tu turno.', action);
    return false;
  }
  return true;
}

function canViewerSeeTargetHand(
  game: GameState,
  viewerId: string,
  targetPlayerId: string,
): boolean {
  const pending = game.pendingAction;

  if (!pending || pending.type !== 'select_hand_card') {
    return false;
  }

  return (
    pending.reason === 'blatant_thievery' &&
    pending.sourcePlayerId === viewerId &&
    pending.targetPlayerId === targetPlayerId
  );
}

function createGameStateForPlayer(
  game: GameState,
  viewerId: string,
): GameState {
  return {
    ...game,

    // Nadie necesita conocer el orden ni el contenido del mazo.

    deck: game.deck.map((_, index) => createHiddenCard(`hidden-deck-${index}`)),
    players: game.players.map((player) => {
      const isViewer = player.id === viewerId;
      const canSeeHand = canViewerSeeTargetHand(game, viewerId, player.id);

      if (isViewer || canSeeHand) {
        return {
          ...player,
          hand: player.hand.map((card) => ({ ...card })), // Copia profunda de las cartas
          stable: player.stable.map((card) => ({ ...card })), // Copia profunda de las cartas
          upgagrades: player.upgrades.map((card) => ({ ...card })), // Copia profunda de las cartas
          downgrades: player.downgrades.map((card) => ({ ...card })), // Copia profunda de las cartas
        };
      }
      return {
        ...player,

        // Conservamos la cantidad, pero no enviamos las cartas reales.
        hand: player.hand.map((_, index) =>
          createHiddenCard(`hidden-hand-${player.id}-${index}`),
        ),
        stable: player.stable.map((card) => ({ ...card })), // Copia profunda de las cartas
        upgrades: player.upgrades.map((card) => ({ ...card })), // Copia profunda de las cartas
        downgrades: player.downgrades.map((card) => ({ ...card })), // Copia profunda de las cartas
      };
    }),

    nursery: game.nursery.map((card) => ({ ...card })), // Copia profunda de las cartas
    discard: game.discard.map((card) => ({ ...card })), // Copia profunda de las cartas
  };
}

function emitGameState(
  io: Server,
  room: Room,
  eventName: 'game-started' | 'game-updated',
): void {
  const game = room.gameState;

  if (!game) {
    return;
  }

  for (const roomPlayer of room.players) {
    const gamePlayer = game.players.find(
      (player) => player.id === roomPlayer.id,
    );

    if (!gamePlayer) {
      continue;
    }

    const visibleState = createGameStateForPlayer(game, gamePlayer.id);
    io.to(roomPlayer.socketId).emit(eventName, visibleState);
  }
}

export function initializeSocket(io: Server) {
  // Conexión de cliente
  io.on('connection', (socket: Socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Unirse a una sala
    socket.on('join-room', ({ roomCode, playerName }) => {
      const room = roomManager.joinRoom(roomCode, playerName, socket.id);

      if (!room) {
        socket.emit('error-message', 'Sala no encontrada');
        return;
      }

      socket.join(room.code);
      io.to(roomCode).emit('room-updated', room);
    });

    // Iniciar partida
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
        );
        return;
      }

      if (room.gameState?.started) {
        emitGameError(
          socket,
          'GAME_ALREADY_STARTED',
          'La partida ya está iniciada.',
        );
        return;
      }

      room.gameState = createGameState(room);
      emitGameState(io, room, 'game-started');
    });

    // Crear sala
    socket.on('room:create', ({ hostName, game }, callback) => {
      const room = roomManager.createRoom(hostName, game, socket.id);
      socket.join(room.code);

      callback({
        success: true,
        room,
      });
    });

    // Jugar carta
    socket.on(
      'play-card',
      ({
        roomCode,
        playerId,
        cardId,
      }: {
        roomCode: string;
        playerId: string;
        cardId: string;
      }) => {
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

        const result = RulesEngine.playCard(
          context.game,
          context.player.id,
          cardId,
        );

        if (!result.success) {
          socket.emit('game-error', result.error);
          return;
        }

        context.room.gameState = result.data;

        emitGameState(io, context.room, 'game-updated');
      },
    );

    // Draw Action Card
    socket.on(
      'draw-action-card',
      ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
        const context = getSocketGameContext(socket, roomCode);

        if (
          !context ||
          !requireActivePlayer(socket, context, 'draw-action-card')
        ) {
          return;
        }

        const { game, player, room } = context;

        if (playerId !== player.id) {
          emitGameError(
            socket,
            'INVALID_PLAYER',
            'El jugador enviado no coincide con tu sesión.',
            'draw-action-card',
          );
          return;
        }

        if (game.phase !== TurnPhase.ACTION) {
          emitGameError(
            socket,
            'INVALID_PHASE',
            'Solo puedes robar como acción durante la fase de acción.',
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

        const gamePlayer = game.players.find(
          (candidate) => candidate.id === player.id,
        );

        if (!gamePlayer) {
          emitGameError(
            socket,
            'PLAYER_NOT_FOUND',
            'No se encontró el jugador dentro de la partida.',
            'draw-action-card',
          );
          return;
        }

        const card = game.deck.shift();

        if (!card) {
          emitGameError(
            socket,
            'DECK_EMPTY',
            'El mazo está vacío.',
            'draw-action-card',
          );
          return;
        }

        gamePlayer.hand.push(card);
        game.actionUsed = true;

        emitGameState(io, room, 'game-updated');
      },
    );

    // Descartar cartas
    socket.on(
      'discard-cards',
      ({
        roomCode,
        playerId,
        cardIds,
      }: {
        roomCode: string;
        playerId: string;
        cardIds: string[];
      }) => {
        const context = getSocketGameContext(socket, roomCode);

        if (!context) {
          return;
        }

        const { game, player, room } = context;

        if (playerId !== player.id) {
          emitGameError(
            socket,
            'INVALID_PLAYER',
            'El jugador enviado no coincide con tu sesión.',
            'discard-card',
          );
          return;
        }

        if (!game.pendingAction) {
          emitGameError(
            socket,
            'NO_PENDING_ACTION',
            'No hay una acción de descarte pendiente.',
            'discard-card',
          );
          return;
        }

        let resolved = false;

        if (game.pendingAction.type === 'mystical_vortex') {
          resolved = ActionResolver.handleMysticalVortexDiscard(
            game,
            player.id,
            cardIds,
          );
        } else {
          resolved = ActionResolver.handleDiscard(game, player.id, cardIds);
        }

        if (!resolved) {
          emitGameError(
            socket,
            'INVALID_SELECTION',
            'La selección de descarte no es válida.',
            'discard-card',
          );
          return;
        }

        if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
          TurnManager.nextPhase(game);
        }

        emitGameState(io, room, 'game-updated');
      },
    );

    // Seleccionar jugador objetivo
    socket.on(
      'select-player',
      ({
        roomCode,
        targetPlayerId,
      }: {
        roomCode: string;
        targetPlayerId: string;
      }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const sourcePlayer = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!sourcePlayer) return;

        const resolved = ActionResolver.handleSelectPlayer(
          room.gameState,
          sourcePlayer.id,
          targetPlayerId,
        );

        if (resolved) {
          if (
            !room.gameState.pendingAction &&
            room.gameState.phase === TurnPhase.BEGINNING
          ) {
            TurnManager.nextPhase(room.gameState);
          }
          emitGameState(io, room, 'game-updated');
        }
      },
    );

    // Seleccionar carta del establo
    socket.on(
      'select-stable-card',
      ({ roomCode, cardId }: { roomCode: string; cardId: string }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const sourcePlayer = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!sourcePlayer) return;

        const resolved = ActionResolver.handleSelectStableCard(
          room.gameState,
          sourcePlayer.id,
          cardId,
        );

        if (resolved) {
          if (
            !room.gameState.pendingAction &&
            room.gameState.phase === TurnPhase.BEGINNING
          ) {
            TurnManager.nextPhase(room.gameState);
          }
          emitGameState(io, room, 'game-updated');
        }
      },
    );

    // Seleccionar carta de la mano de un rival
    socket.on(
      'select-hand-card',
      ({ roomCode, cardId }: { roomCode: string; cardId: string }) => {
        const context = getSocketGameContext(socket, roomCode);

        if (!context) {
          return;
        }

        const { room, game, player } = context;

        const pending = game.pendingAction;

        if (!pending || pending.type !== 'select_hand_card') {
          emitGameError(
            socket,
            'NO_PENDING_ACTION',
            'No hay una selección de mano pendiente.',
            'select-hand-card',
          );
          return;
        }

        if (pending.sourcePlayerId !== player.id) {
          emitGameError(
            socket,
            'NOT_YOUR_TURN',
            'No puedes resolver la acción de otro jugador.',
            'select-hand-card',
          );
          return;
        }

        let resolvedCardId = cardId;

        if (pending.reason === 'americorn') {
          const targetPlayer = game.players.find(
            (candidate) => candidate.id === pending.targetPlayerId,
          );

          if (!targetPlayer) {
            emitGameError(
              socket,
              'PLAYER_NOT_FOUND',
              'No se encontró el jugador objetivo.',
              'select-hand-card',
            );
            return;
          }

          const expectedPrefix = `hidden-hand-${targetPlayer.id}-`;

          if (!cardId.startsWith(expectedPrefix)) {
            emitGameError(
              socket,
              'INVALID_SELECTION',
              'La carta seleccionada no es válida.',
              'select-hand-card',
            );
            return;
          }

          const indexText = cardId.slice(expectedPrefix.length);

          const selectedIndex = Number(indexText);

          if (
            !Number.isInteger(selectedIndex) ||
            selectedIndex < 0 ||
            selectedIndex >= targetPlayer.hand.length
          ) {
            emitGameError(
              socket,
              'INVALID_SELECTION',
              'La posición de la carta seleccionada no es válida.',
              'select-hand-card',
            );
            return;
          }

          resolvedCardId = targetPlayer.hand[selectedIndex].id;
        }
        const resolved = ActionResolver.handleSelectHandCard(
          game,
          player.id,
          resolvedCardId,
        );

        if (!resolved) {
          emitGameError(
            socket,
            'INVALID_SELECTION',
            'No se pudo seleccionar esa carta.',
            'select-hand-card',
          );
          return;
        }

        if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
          TurnManager.nextPhase(game);
        }

        emitGameState(io, room, 'game-updated');
      },
    );

    // Siguiente fase
    socket.on('next-phase', (roomCode: string) => {
      const context = getSocketGameContext(socket, roomCode);

      if (!context || !requireActivePlayer(socket, context, 'next-phase')) {
        return;
      }

      const { game, room } = context;

      if (game.pendingAction) {
        emitGameError(
          socket,
          'PENDING_ACTION',
          'Debes resolver la acción pendiente primero.',
          'next-phase',
        );
        return;
      }

      TurnManager.nextPhase(game);

      emitGameState(io, room, 'game-updated');
    });

    // Terminar turno
    socket.on('end-turn', (roomCode: string) => {
      const context = getSocketGameContext(socket, roomCode);

      if (!context || !requireActivePlayer(socket, context, 'end-turn')) {
        return;
      }

      const { game, room } = context;

      if (game.phase !== TurnPhase.ACTION) {
        emitGameError(
          socket,
          'INVALID_PHASE',
          'No puedes terminar el turno en esta fase.',
          'end-turn',
        );
        return;
      }

      if (game.pendingAction) {
        emitGameError(
          socket,
          'PENDING_ACTION',
          'Debes resolver la acción pendiente primero.',
          'end-turn',
        );
        return;
      }

      TurnManager.nextPhase(game);
      emitGameState(io, room, 'game-updated');
    });

    // Reiniciar juego
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
          'Solo el anfitrión puede reiniciar la partida.',
          'restart-game',
        );
        return;
      }

      room.gameState = createGameState(room);
      room.gameState.pendingAction = undefined;

      emitGameState(io, room, 'game-updated');
    });

    // Cancelar acción pendiente (para efectos opcionales)
    socket.on('cancel-action', ({ roomCode }: { roomCode: string }) => {
      const context = getSocketGameContext(socket, roomCode);

      if (!context) {
        return;
      }

      const { game, player, room } = context;
      const pending = game.pendingAction;

      if (!pending) {
        emitGameError(
          socket,
          'NO_PENDING_ACTION',
          'No hay una acción pendiente para cancelar.',
          'cancel-action',
        );
        return;
      }

      const pendingPlayerId =
        'playerId' in pending
          ? pending.playerId
          : 'sourcePlayerId' in pending
            ? pending.sourcePlayerId
            : undefined;

      if (!pendingPlayerId || pendingPlayerId !== player.id) {
        emitGameError(
          socket,
          'NOT_YOUR_TURN',
          'No puedes cancelar la acción de otro jugador.',
          'cancel-action',
        );
        return;
      }

      game.pendingAction = undefined;
      emitGameState(io, room, 'game-updated');
    });

    // Seleccionar opción (para decisiones)
    socket.on(
      'select-choice',
      ({ roomCode, choice }: { roomCode: string; choice: string }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const player = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!player) return;

        const pending = room.gameState.pendingAction;
        if (
          !pending ||
          pending.type !== 'select_choice' ||
          pending.playerId !== player.id
        ) {
          return;
        }

        if (pending.reason === 'angel_unicorn') {
          if (choice === 'yes') {
            // Sacrificar a Angel Unicorn
            const idx = player.stable.findIndex(
              (c) => c.id === 'angel_unicorn',
            );
            if (idx !== -1) {
              const [angelCard] = player.stable.splice(idx, 1);
              room.gameState.discard.push(angelCard);

              // Configurar acción pendiente: elegir unicornio del descarte
              room.gameState.pendingAction = {
                type: 'select_discard_card',
                reason: 'angel_unicorn',
                playerId: player.id,
                cardType: 'unicorn',
              };
            } else {
              room.gameState.pendingAction = undefined;
              room.gameState.phase = TurnPhase.DRAW;
            }
          } else {
            room.gameState.pendingAction = undefined;
            room.gameState.phase = TurnPhase.DRAW;
          }

          emitGameState(io, room, 'game-updated');
        } else if (pending.reason === 'annoying_flying_unicorn') {
          if (choice === 'yes') {
            room.gameState.pendingAction = {
              type: 'select_player',
              reason: 'annoying_flying_unicorn',
              sourcePlayerId: player.id,
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.nextPhase(room.gameState);
            }
          }

          emitGameState(io, room, 'game-updated');
        } else if (pending.reason === 'black_knight_unicorn') {
          const targetCardId = pending.targetCardId;
          const originalTargetPlayerId = pending.originalTargetPlayerId;

          if (choice === 'yes') {
            // Sacrificar a Black Knight Unicorn
            const idx = player.stable.findIndex(
              (c) => c.id === 'black_knight_unicorn',
            );
            if (idx !== -1) {
              const [blackKnight] = player.stable.splice(idx, 1);
              CardMovement.destroyOrSacrifice(
                room.gameState,
                player,
                blackKnight,
              );
            }
          } else {
            // Destruir la carta original
            if (targetCardId && originalTargetPlayerId) {
              const targetPlayer = room.gameState.players.find(
                (p) => p.id === originalTargetPlayerId,
              );
              if (targetPlayer) {
                const idx = targetPlayer.stable.findIndex(
                  (c) => c.id === targetCardId,
                );
                if (idx !== -1) {
                  const [destroyedCard] = targetPlayer.stable.splice(idx, 1);
                  CardMovement.destroyOrSacrifice(
                    room.gameState,
                    targetPlayer,
                    destroyedCard,
                  );
                }
              }
            }
          }

          room.gameState.pendingAction = undefined;

          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.nextPhase(room.gameState);
          }

          emitGameState(io, room, 'game-updated');
        } else if (pending.reason === 'chainsaw_unicorn') {
          if (choice === 'yes') {
            room.gameState.pendingAction = {
              type: 'select_stable_card',
              reason: 'chainsaw_unicorn',
              sourcePlayerId: player.id,
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.nextPhase(room.gameState);
            }
          }

          emitGameState(io, room, 'game-updated');
        } else if (pending.reason === 'classy_narwhal') {
          if (choice === 'yes') {
            room.gameState.pendingAction = {
              type: 'select_deck_card',
              reason: 'classy_narwhal',
              playerId: player.id,
              cardType: 'upgrade',
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.nextPhase(room.gameState);
            }
          }

          emitGameState(io, room, 'game-updated');
        }
      },
    );

    // Seleccionar carta del descarte
    socket.on(
      'select-discard-card',
      ({ roomCode, cardId }: { roomCode: string; cardId: string }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const player = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!player) return;

        const pending = room.gameState.pendingAction;
        if (
          !pending ||
          pending.type !== 'select_discard_card' ||
          pending.playerId !== player.id
        ) {
          return;
        }

        if (pending.reason === 'angel_unicorn') {
          if (cardId === 'angel_unicorn') return;

          const cardIdx = room.gameState.discard.findIndex(
            (c) => c.id === cardId,
          );
          if (cardIdx !== -1) {
            const [selectedCard] = room.gameState.discard.splice(cardIdx, 1);
            room.gameState.pendingAction = undefined;
            CardMovement.enterStable(room.gameState, player, selectedCard);
          }

          if (!room.gameState.pendingAction) {
            room.gameState.phase = TurnPhase.DRAW;
          }

          emitGameState(io, room, 'game-updated');
        }
      },
    );

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      roomManager.removePlayer(socket.id);
    });
  });
}

export { roomManager };
