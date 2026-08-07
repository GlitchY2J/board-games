import type { Server, Socket } from 'socket.io';

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

export function registerGameHandlers(io: Server, socket: Socket): void {
  registerStartGame(io, socket);
  registerPlayCard(io, socket);
  registerDrawActionCard(io, socket);
  registerNextPhase(io, socket);
  registerEndTurn(io, socket);
  registerRestartGame(io, socket);
}

function registerStartGame(io: Server, socket: Socket): void {
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

    room.gameState = createGameState(room);

    emitGameState(io, room, 'game-started');

    console.log(`Partida iniciada: ${room.code}`);
  });
}

function registerPlayCard(io: Server, socket: Socket): void {
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
}

function registerDrawActionCard(io: Server, socket: Socket): void {
  socket.on(
    'draw-action-card',
    ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
      console.log('DRAW ACTION CARD EVENT');
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

      gamePlayer.hand.push(card);

      game.actionUsed = true;

      emitGameState(io, room, 'game-updated');
    },
  );
}

function registerNextPhase(io: Server, socket: Socket): void {
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

    TurnManager.nextPhase(context.game);

    emitGameState(io, context.room, 'game-updated');
  });
}

function registerEndTurn(io: Server, socket: Socket): void {
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

    TurnManager.nextPhase(context.game);

    emitGameState(io, context.room, 'game-updated');
  });
}

function registerRestartGame(io: Server, socket: Socket): void {
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

    room.gameState = createGameState(room);

    room.gameState.pendingAction = undefined;

    room.gameState.winnerId = undefined;

    room.gameState.actionUsed = false;

    emitGameState(io, room, 'game-updated');

    console.log(`Partida reiniciada: ${roomCode}`);
  });
}
