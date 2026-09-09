import type { GameServer, GameSocket } from './socketTypes.ts';

import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { CardMovement } from '../game/unstable-unicorns/engine/CardMovement.ts';
import { CardZoneMovement } from '../game/unstable-unicorns/engine/CardZoneMovement.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { emitGameError, getSocketGameContext } from './socketContext.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import { roomManager } from '../roomManagerInstance.ts';
import type { Room } from '../game/models/Room.ts';
import { GameState } from '../game/models/GameState.ts';
import {
  enqueueDrawAnimation,
  enqueueExplosionAnimation,
} from '../game/cardAnimations.ts';
import { startPendingTimer } from './gameHandlers.ts';
import { nextSprayBottleChoice } from '../game/cards/effects/sprayBottleOfYouth.ts';
import { registerDiscardHandlers } from './discardHandlers.ts';
import { registerStableSelectionHandlers } from './stableSelectionHandlers.ts';
import { registerHandSelectionHandlers } from './handSelectionHandlers.ts';
import { registerDeckSelectionHandlers } from './deckSelectionHandlers.ts';
import { registerChoiceHandlers } from './choiceHandlers.ts';

function isExplodingKittensRoom(room: Room): boolean {
  return room.settings.gameId === 'exploding-kittens';
}

export function registerActionHandlers(
  io: GameServer,
  socket: GameSocket,
): void {
  registerDiscardHandlers(io, socket);
  registerSelectPlayer(io, socket);
  registerSelectPlayers(io, socket);
  registerStableSelectionHandlers(io, socket);
  registerHandSelectionHandlers(io, socket);
  registerResolveExplodingKitten(io, socket);
  registerResolveImplodingKitten(io, socket);
  registerResolveSeeTheFuture(io, socket);
  registerCancelAction(io, socket);
  registerChoiceHandlers(io, socket);
  registerSelectNurseryCard(io, socket);
  registerSelectDiscardCard(io, socket);
  registerDeckSelectionHandlers(io, socket);

  function continueBeginningPhaseIfReady(game: GameState): void {
    if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
      TurnManager.processBeginningQueue(game);
    }
  }

  function registerSelectPlayer(io: GameServer, socket: GameSocket): void {
    socket.on('select-player', ({ roomCode, playerId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const sourcePlayer = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!sourcePlayer) return;

      const pendingAction = room.gameState.pendingAction;
      if (
        isExplodingKittensRoom(room) &&
        pendingAction?.type === 'select_player' &&
        pendingAction.reason === 'favor'
      ) {
        if (pendingAction.sourcePlayerId !== sourcePlayer.id || playerId === sourcePlayer.id) return;
        const targetPlayer = room.gameState.players.find((candidate) => candidate.id === playerId && candidate.hand.length > 0);
        if (!targetPlayer) return;

        room.gameState.pendingAction = undefined;
        room.gameState.pendingPlay = {
          playerId: sourcePlayer.id,
          playerName: sourcePlayer.name,
          card: pendingAction.card!,
          startedAt: Date.now(),
          durationMs: 5000,
          acceptedIds: [],
          targetPlayerId: targetPlayer.id,
          targetPlayerName: targetPlayer.name,
          chain: [{ playerId: sourcePlayer.id, playerName: sourcePlayer.name, card: pendingAction.card!, group: 0 }],
        };
        addLog(room.gameState, `${sourcePlayer.name} pidió una carta a ${targetPlayer.name} con Favor`, { playerId: sourcePlayer.id });
        emitGameState(io, room, 'game-updated');
        startPendingTimer(io, room, room.gameState.pendingPlay.startedAt);
        return;
      }
      if (
        isExplodingKittensRoom(room) &&
        pendingAction?.type === 'select_player' &&
        pendingAction.reason === 'targeted_attack'
      ) {
        if (pendingAction.sourcePlayerId !== sourcePlayer.id || playerId === sourcePlayer.id) return;
        const targetPlayer = room.gameState.players.find((candidate) => candidate.id === playerId);
        if (!targetPlayer || !pendingAction.card) return;

        const cardIndex = sourcePlayer.hand.findIndex(
          (card) => card.uid === pendingAction.card?.uid,
        );
        if (cardIndex < 0) return;
        CardZoneMovement.removeFromHand(sourcePlayer, pendingAction.card.uid);

        room.gameState.pendingAction = undefined;
        const previousPendingPlay = pendingAction.pendingPlay;
        room.gameState.pendingPlay = {
          playerId: sourcePlayer.id,
          playerName: sourcePlayer.name,
          card: pendingAction.card,
          startedAt: Date.now(),
          durationMs: 5000,
          acceptedIds: [],
          targetPlayerId: targetPlayer.id,
          targetPlayerName: targetPlayer.name,
          attackCount: (previousPendingPlay?.attackCount ?? 0) + 1,
          chain: [
            ...(previousPendingPlay?.chain ?? []),
            {
              playerId: sourcePlayer.id,
              playerName: sourcePlayer.name,
              card: pendingAction.card,
              group: previousPendingPlay
                ? (previousPendingPlay.chain[previousPendingPlay.chain.length - 1]?.group ?? 0) + 1
                : 0,
            },
          ],
        };
        addLog(room.gameState, `${sourcePlayer.name} dirigió Targeted Attack contra ${targetPlayer.name}`, {
          playerId: sourcePlayer.id,
        });
        emitGameState(io, room, 'game-updated');
        startPendingTimer(io, room, room.gameState.pendingPlay.startedAt);
        return;
      }
      if (
        isExplodingKittensRoom(room) &&
        pendingAction?.type === 'select_player' &&
        (pendingAction.reason === 'two_of_a_kind' ||
          pendingAction.reason === 'three_of_a_kind')
      ) {
        if (
          pendingAction.sourcePlayerId !== sourcePlayer.id ||
          playerId === sourcePlayer.id
        ) {
          return;
        }

        const targetPlayer = room.gameState.players.find(
          (player) => player.id === playerId && player.hand.length > 0,
        );
        const cardIds = pendingAction.cardIds ?? [];
        const playedCards = cardIds.map((id) =>
          sourcePlayer.hand.find((card) => card.uid === id),
        );

        if (!targetPlayer || playedCards.some((card) => !card)) {
          emitGameError(
            socket,
            'INVALID_SELECTION',
            'El jugador o las cartas seleccionadas ya no son válidos.',
            'select-player',
          );
          return;
        }

        if (pendingAction.reason === 'three_of_a_kind') {
          room.gameState.pendingAction = {
            type: 'select_choice',
            reason: 'three_of_a_kind',
            playerId: sourcePlayer.id,
            title: 'Three of a Kind',
            description: `Elige qué carta quieres robarle a ${targetPlayer.name}`,
            options: [
              { value: 'beard_cat', text: 'Beard Cat' },
              { value: 'cattermelon', text: 'Cattermelon' },
              { value: 'hairy_potato_cat', text: 'Hairy Potato Card' },
              { value: 'rainbow_ralphing_cat', text: 'Rainbow-Ralphing Cat' },
              { value: 'tacocat', text: 'Tacocat' },
              { value: 'attack', text: 'Attack 2x' },
              { value: 'targeted_attack', text: 'Targeted Attack 2x' },
              { value: 'defuse', text: 'Defuse' },
              { value: 'favor', text: 'Favor' },
              { value: 'nope', text: 'Nope' },
              { value: 'see_the_future', text: 'See the Future 3x' },
              { value: 'shuffle', text: 'Shuffle' },
              { value: 'skip', text: 'Skip' },
              { value: 'reverse', text: 'Reverse' },
              { value: 'feral_cat', text: 'Feral Cat' },
              { value: 'draw_from_the_bottom', text: 'Draw from the Bottom' },
              { value: 'alter_the_future', text: 'Alter the Future 3x' },
            ],
            targetPlayerId: targetPlayer.id,
            cardIds: pendingAction.cardIds,
          };
          addLog(
            room.gameState,
            `${sourcePlayer.name} eligió a ${targetPlayer.name} para Three of a Kind`,
            { playerId: sourcePlayer.id },
          );
          emitGameState(io, room, 'game-updated');
          return;
        }

        const startedAt = Date.now();
        room.gameState.pendingAction = undefined;
        room.gameState.pendingPlay = {
          playerId: sourcePlayer.id,
          playerName: sourcePlayer.name,
          card: playedCards[0]!,
          startedAt,
          durationMs: 5000,
          acceptedIds: [],
          targetPlayerId: targetPlayer.id,
          targetPlayerName: targetPlayer.name,
          chain: playedCards.map((card) => ({
            playerId: sourcePlayer.id,
            playerName: sourcePlayer.name,
            card: card!,
            group: 0,
          })),
        };

        addLog(
          room.gameState,
          `${sourcePlayer.name} eligió a ${targetPlayer.name} para Two of a Kind`,
          { playerId: sourcePlayer.id },
        );
        emitGameState(io, room, 'game-updated');
        startPendingTimer(io, room, startedAt);
        return;
      }

      const resolved = ActionResolver.handleSelectPlayer(
        room.gameState,
        sourcePlayer.id,
        playerId,
      );

      if (resolved) {
        if (
          !room.gameState.pendingAction &&
          room.gameState.phase === TurnPhase.BEGINNING
        ) {
          TurnManager.processBeginningQueue(room.gameState);
        }

        const targetPlayer = room.gameState.players.find(
          (p) => p.id === playerId,
        );

        addLog(
          room.gameState,
          targetPlayer
            ? `${sourcePlayer.name} eligió a ${targetPlayer.name}`
            : `${sourcePlayer.name} elige un jugador`,
          { playerId: sourcePlayer.id },
        );

        emitGameState(io, room, 'game-updated');
      }
    });
  }

  function registerSelectPlayers(io: GameServer, socket: GameSocket): void {
    socket.on('select-players', ({ roomCode, playerIds }) => {
      const context = getSocketGameContext(socket, roomCode);
      if (!context) return;

      const { game, player, room } = context;
      const resolved = ActionResolver.handleSelectPlayers(
        game,
        player.id,
        playerIds,
      );
      if (!resolved) return;

      emitGameState(io, room, 'game-updated');
    });
  }


  function registerResolveExplodingKitten(io: GameServer, socket: GameSocket): void {
    socket.on('resolve-exploding-kitten', ({ roomCode, useDefuse }) => {
      const context = getSocketGameContext(socket, roomCode);
      if (!context) return;

      const { game, player, room } = context;
      const pending = game.pendingAction;
      if (!pending || pending.type !== 'exploding_kitten' || pending.playerId !== player.id) {
        emitGameError(socket, 'NO_PENDING_ACTION', 'No hay un Exploding Kitten pendiente.', 'select-choice');
        return;
      }

      const gamePlayer = game.players.find((candidate) => candidate.id === player.id);
      if (!gamePlayer) return;

      const kittenIndex = gamePlayer.hand.findIndex((card) => card.uid === pending.card.uid);
      if (kittenIndex < 0) return;

      if (useDefuse) {
        const defuseIndex = gamePlayer.hand.findIndex((card) => card.id === 'defuse');
        if (defuseIndex < 0) {
          emitGameError(socket, 'CARD_NOT_FOUND', 'No tienes un Defuse.', 'select-choice');
          return;
        }

        const defuse = CardZoneMovement.removeFromHand(gamePlayer, gamePlayer.hand[defuseIndex]?.uid ?? '');
        const kitten = CardZoneMovement.removeFromHand(gamePlayer, pending.card.uid);
        if (!defuse || !kitten) return;
        CardZoneMovement.toDiscard(game, defuse);
        game.pendingAction = {
          type: 'select_deck_card',
          reason: 'exploding_kitten_defuse',
          playerId: player.id,
          candidates: [],
          card: pending.card,
        };
        addLog(game, `${player.name} usó un Defuse`, { playerId: player.id });
        emitGameState(io, room, 'game-updated');
        return;
      }

      const playerIndex = game.players.findIndex((candidate) => candidate.id === player.id);
      const placement = game.players.length;
      for (const card of [...gamePlayer.hand]) {
        CardZoneMovement.removeFromHand(gamePlayer, card.uid);
        CardZoneMovement.toDiscard(game, card);
      }
      CardZoneMovement.toDiscard(game, pending.card);
      game.eliminatedPlayers ??= [];
      game.eliminatedPlayers.push({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        placement,
      });
      game.players.splice(playerIndex, 1);
      game.pendingAction = undefined;
      addLog(game, `${player.name} fue eliminado por un Exploding Kitten`, {
        playerId: player.id,
      });

      enqueueExplosionAnimation(room.code, player.id, player.name);

      if (game.players.length === 1) {
        game.winnerId = game.players[0].id;
        game.phase = TurnPhase.END;
      } else if (game.players.length > 1) {
        game.currentPlayer = playerIndex % game.players.length;
        game.turn += 1;
        game.phase = TurnPhase.DRAW;
        game.turnsRemaining = 1;
        game.actionUsed = false;
        game.actionPlaysRemaining = undefined;
      }

      emitGameState(io, room, 'game-updated');
    });
  }

  function registerResolveImplodingKitten(io: GameServer, socket: GameSocket): void {
    socket.on('resolve-imploding-kitten', ({ roomCode }) => {
      const context = getSocketGameContext(socket, roomCode);
      if (!context) return;

      const { game, player, room } = context;
      const pending = game.pendingAction;
      if (
        !pending ||
        pending.type !== 'imploding_kitten' ||
        pending.playerId !== player.id
      ) {
        emitGameError(
          socket,
          'NO_PENDING_ACTION',
          'No hay un Imploding Kitten pendiente.',
          'select-choice',
        );
        return;
      }

      if (pending.stage === 'revealed') {
        game.pendingAction = {
          type: 'select_deck_card',
          reason: 'imploding_kitten_place',
          playerId: player.id,
          candidates: [],
          card: pending.card,
        };
        emitGameState(io, room, 'game-updated');
        return;
      }

      const playerIndex = game.players.findIndex(
        (candidate) => candidate.id === player.id,
      );
      if (playerIndex < 0) return;

      for (const card of [...player.hand]) {
        CardZoneMovement.removeFromHand(player, card.uid);
        CardZoneMovement.toDiscard(game, card);
      }
      CardZoneMovement.toDiscard(game, pending.card);
      game.eliminatedPlayers ??= [];
      game.eliminatedPlayers.push({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        placement: game.players.length,
      });
      game.players.splice(playerIndex, 1);
      game.pendingAction = undefined;
      enqueueExplosionAnimation(
        room.code,
        player.id,
        player.name,
        'imploding',
        'eliminated',
      );
      if (game.players.length === 1) {
        game.winnerId = game.players[0].id;
        game.phase = TurnPhase.END;
      } else if (game.players.length > 1) {
        game.currentPlayer = playerIndex % game.players.length;
        game.turn += 1;
        game.phase = TurnPhase.DRAW;
        game.turnsRemaining = 1;
        game.actionUsed = false;
        game.actionPlaysRemaining = undefined;
      }
      addLog(game, `${player.name} fue eliminado por un Imploding Kitten`, {
        playerId: player.id,
      });
      emitGameState(io, room, 'game-updated');
    });
  }

  function registerResolveSeeTheFuture(io: GameServer, socket: GameSocket): void {
    socket.on('resolve-see-the-future', (payload) => {
      const { roomCode } = payload;
      const context = getSocketGameContext(socket, roomCode);
      if (!context) return;

      const { game, player, room } = context;
      const pending = game.pendingAction;
      if (
        (!pending ||
          (pending.type !== 'see_the_future' && pending.type !== 'alter_the_future') ||
          pending.playerId !== player.id)
      ) {
        emitGameError(socket, 'NO_PENDING_ACTION', 'No hay una visión del futuro pendiente.', 'select-choice');
        return;
      }
      if (pending.type === 'alter_the_future') {
        const orderedIds = payload.orderedCardIds ?? pending.candidates.map((card) => card.uid);
        if (
          orderedIds.length !== pending.candidates.length ||
          new Set(orderedIds).size !== orderedIds.length ||
          orderedIds.some((id) => !pending.candidates.some((card) => card.uid === id))
        ) {
          emitGameError(socket, 'INVALID_SELECTION', 'El orden de las cartas no es válido.', 'select-choice');
          return;
        }

        const orderedCards = orderedIds.map((id) =>
          pending.candidates.find((card) => card.uid === id)!,
        );
        game.deck.splice(0, orderedCards.length, ...orderedCards);
      }

      game.pendingAction = undefined;
      game.pendingPlay = undefined;
      game.currentPlayer = game.players.findIndex((candidate) => candidate.id === player.id);
      game.phase = TurnPhase.ACTION;
      game.turnsRemaining = pending.turnsRemaining ?? game.turnsRemaining;
      game.actionUsed = false;
      game.actionPlaysRemaining = undefined;
      addLog(game, `${player.name} terminó de mirar el futuro`, { playerId: player.id });
      emitGameState(io, room, 'game-updated');
    });
  }

  function registerCancelAction(io: GameServer, socket: GameSocket): void {
    socket.on('cancel-action', ({ roomCode }) => {
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

      addLog(game, `${player.name} canceló la acción`, { playerId: player.id });

      emitGameState(io, room, 'game-updated');
    });
  }


  function registerSelectNurseryCard(io: GameServer, socket: GameSocket): void {
    socket.on('select-nursery-card', ({ roomCode, cardId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const player = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!player) return;

      const pending = room.gameState.pendingAction;
      if (
        !pending ||
        pending.type !== 'select_nursery_card' ||
        pending.playerId !== player.id ||
        pending.reason !== 'mother_goose_unicorn' &&
         pending.reason !== 'extremely_fertile_unicorn' &&
         pending.reason !== 'special_delivery' &&
         pending.reason !== 'spray_bottle_of_youth'
      ) {
        return;
      }

      const cardIdx = room.gameState.nursery.findIndex((c) => c.uid === cardId);
      if (cardIdx === -1) return;

      const baby = room.gameState.nursery[cardIdx];
      if (baby.cardType !== 'unicorn' || baby.unicornClass !== 'baby') {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'La carta seleccionada no es un Baby Unicorn válido.',
          'select-nursery-card',
        );
        return;
      }

      const [removed] = room.gameState.nursery.splice(cardIdx, 1);
      room.gameState.pendingAction = undefined;

      CardMovement.enterStable(room.gameState, player, removed);

      if (pending.reason === 'special_delivery') {
        addLog(
          room.gameState,
          `${player.name} trajo ${removed.name} de la Nursery por Special Delivery y saltó su fase de acción`,
          {
            playerId: player.id,
          },
        );
        // Special Delivery skips only ACTION: the normal DRAW phase still
        // happens before the turn moves to END.
        room.gameState.phase = TurnPhase.DRAW;
        TurnManager.drawCard(room.gameState);
        room.gameState.phase = TurnPhase.END;
        TurnManager.skipEndIfNoTriggers(room.gameState);
        emitGameState(io, room, 'game-updated');
        return;
      }

      if (pending.reason === 'spray_bottle_of_youth') {
        room.gameState.pendingAction = nextSprayBottleChoice(
          room.gameState,
          pending.sourcePlayerId ?? player.id,
          pending.remainingPlayerIds ?? [],
        );
        addLog(
          room.gameState,
          `${player.name} trajo ${removed.name} de la Nursery por Spray Bottle Of Youth`,
          { playerId: player.id },
        );
        emitGameState(io, room, 'game-updated');
        return;
      }

      if (
        room.gameState.phase === TurnPhase.BEGINNING &&
        !room.gameState.pendingAction
      ) {
        TurnManager.processBeginningQueue(room.gameState);
      }

      addLog(
        room.gameState,
        `${player.name} trajo ${removed.name} de la Nursery a su establo`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    });
  }

  function registerSelectDiscardCard(io: GameServer, socket: GameSocket): void {
    socket.on('select-discard-card', ({ roomCode, cardId }) => {
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

      if (
        pending.reason !== 'dark_angel_unicorn' &&
        pending.reason !== 'magical_flying_unicorn' &&
        pending.reason !== 'majestic_flying_unicorn' &&
        pending.reason !== 'necromancer_unicorn' &&
        pending.reason !== 'swift_flying_unicorn' &&
        pending.reason !== 'kiss_of_life' &&
         pending.reason !== 'angel_unicorn' &&
         pending.reason !== 'zombie_unicorn' &&
         pending.reason !== 'extremely_fertile_unicorn' &&
         pending.reason !== 'frenchiecorn'
         && pending.reason !== 'reanimation'
      )
        return;

      const cardIdx = room.gameState.discard.findIndex((c) => c.uid === cardId);
      if (cardIdx === -1) return;

      const selectedCard = room.gameState.discard[cardIdx];
      if (
        pending.reason === 'dark_angel_unicorn' &&
        selectedCard.id === 'dark_angel_unicorn'
      )
        return;

      if (pending.cardType && selectedCard.cardType !== pending.cardType) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'La carta seleccionada no es válida.',
          'select-discard-card',
        );
        return;
      }

      if (
        pending.reason === 'frenchiecorn' &&
        !pending.discardedCardIds?.includes(selectedCard.uid)
      ) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'Solo puedes elegir una carta descartada por Frenchiecorn.',
          'select-discard-card',
        );
        return;
      }

      if (
        pending.reason === 'swift_flying_unicorn' &&
        selectedCard.effect !== 'neigh' &&
        selectedCard.effect !== 'super_neigh' &&
        selectedCard.effect !== 'neigh_thank_you'
      ) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'La carta seleccionada no es un Neigh.',
          'select-discard-card',
        );
        return;
      }

      const removed = CardZoneMovement.removeAt(room.gameState.discard, cardIdx);
      if (!removed) return;
      room.gameState.pendingAction = undefined;

      if (
        pending.reason === 'magical_flying_unicorn' ||
        pending.reason === 'majestic_flying_unicorn' ||
        pending.reason === 'swift_flying_unicorn' ||
        pending.reason === 'frenchiecorn'
      ) {
        CardZoneMovement.addToHand(player, removed);

        if (
          pending.reason === 'swift_flying_unicorn' &&
          room.gameState.phase === TurnPhase.BEGINNING
        ) {
          TurnManager.processBeginningQueue(room.gameState);
        }

        addLog(
          room.gameState,
          `${player.name} trajo una carta del descarte a su mano`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
        return;
      }

      const broughtFromDiscard = removed;
      const entered = CardMovement.enterStable(room.gameState, player, removed);

      if (!entered) {
        CardZoneMovement.toDiscard(room.gameState, removed);

        addLog(
          room.gameState,
          `${player.name} no pudo traer ${broughtFromDiscard.name} del descarte: bloqueado por Queen Bee Unicorn`,
          { playerId: player.id },
        );

        if (
          !room.gameState.pendingAction &&
          room.gameState.phase === TurnPhase.BEGINNING
        ) {
          TurnManager.processBeginningQueue(room.gameState);
        }

        emitGameState(io, room, 'game-updated');
        return;
      }

      if (pending.reason === 'zombie_unicorn') {
        addLog(
          room.gameState,
          `${player.name} trajo ${broughtFromDiscard.name} al establo por Zombie Unicorn y pasó a la fase de fin de turno`,
          { playerId: player.id },
        );
        room.gameState.phase = TurnPhase.END;
        TurnManager.skipEndIfNoTriggers(room.gameState);
        emitGameState(io, room, 'game-updated');
        return;
      }

      if (
        pending.reason === 'reanimation' &&
        (selectedCard.cardType !== 'unicorn' ||
          selectedCard.unicornClass !== 'basic')
      ) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'Reanimation solo puede traer un Basic Unicorn.',
          'select-discard-card',
        );
        return;
      }

      if (pending.reason === 'reanimation') {
        if (broughtFromDiscard.unicornClass !== 'basic') {
          CardZoneMovement.toDiscard(room.gameState, broughtFromDiscard);
          return;
        }

        const drawn = room.gameState.deck.shift();
        if (drawn) {
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          CardZoneMovement.addToHand(player, drawn);
        }
        addLog(
          room.gameState,
          `${player.name} trajo ${broughtFromDiscard.name} del descarte y robó una carta por Reanimation`,
          { playerId: player.id },
        );
        emitGameState(io, room, 'game-updated');
        return;
      }

      if (
        room.gameState.phase === TurnPhase.BEGINNING &&
        !room.gameState.pendingAction
      ) {
        TurnManager.processBeginningQueue(room.gameState);
      }

      addLog(
        room.gameState,
        `${player.name} trajo ${broughtFromDiscard.name} del descarte a su establo`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    });
  }


}
