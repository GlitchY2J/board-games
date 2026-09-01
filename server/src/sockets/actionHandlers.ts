import type { GameServer, GameSocket } from './socketTypes.ts';

import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { CardMovement } from '../game/unstable-unicorns/engine/CardMovement.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { emitGameError, getSocketGameContext } from './socketContext.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import { roomManager } from '../roomManagerInstance.ts';
import type { Room } from '../game/models/Room.ts';
import { GameState } from '../game/models/GameState.ts';
import {
  enqueueCardAnimation,
  enqueueDrawAnimation,
  enqueueExplosionAnimation,
  enqueueStealAnimation,
  enqueueShuffleAnimation,
} from '../game/cardAnimations.ts';
import { VictoryManager } from '../game/VictoryManager.ts';
import { advanceTurnAfterDraw } from '../game/exploding-kittens/turn.ts';
import { nextUnicornOfWarChoice } from '../game/cards/effects/unicornOfWar.ts';
import { startPendingTimer } from './gameHandlers.ts';
import {
  drawRainbowPrincessCards,
  nextRainbowPrincessChoice,
} from '../game/cards/effects/unicornRainbowPrincess.ts';

function isExplodingKittensRoom(room: Room): boolean {
  return (room.settings?.gameId ?? room.game) === 'exploding-kittens';
}

export function registerActionHandlers(
  io: GameServer,
  socket: GameSocket,
): void {
  registerDiscardCards(io, socket);
  registerSelectPlayer(io, socket);
  registerSelectPlayers(io, socket);
  registerSelectStableCard(io, socket);
  registerSelectHandCard(io, socket);
  registerResolveExplodingKitten(io, socket);
  registerResolveSeeTheFuture(io, socket);
  registerCancelAction(io, socket);
  registerSelectChoice(io, socket);
  registerSelectNurseryCard(io, socket);
  registerSelectDiscardCard(io, socket);
  registerSelectDeckCard(io, socket);
  registerSelectOracleCards(io, socket);
  registerSelectOwnHandCard(io, socket);

  function continueBeginningPhaseIfReady(game: GameState): void {
    if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
      TurnManager.processBeginningQueue(game);
    }
  }

  function registerDiscardCards(io: GameServer, socket: GameSocket): void {
    socket.on('discard-cards', ({ roomCode, playerId, cardIds }) => {
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

      if (game.pendingAction.type === 'select_discard_count') {
        resolved = ActionResolver.handlePestilenceDiscardCount(
          game,
          player.id,
          cardIds,
        );
      } else if (game.pendingAction.type === 'pestilence_discard') {
        resolved = ActionResolver.handlePestilenceDiscard(
          game,
          player.id,
          cardIds,
        );
      } else if (game.pendingAction.type === 'mystical_vortex') {
        resolved = ActionResolver.handleMysticalVortexDiscard(
          game,
          player.id,
          cardIds,
        );
      } else if (game.pendingAction.type === 'llamacorn') {
        resolved = ActionResolver.handleLlamacornDiscard(
          game,
          player.id,
          cardIds,
        );
      } else if (game.pendingAction.type === 'frenchiecorn') {
        resolved = ActionResolver.handleFrenchiecornDiscard(
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

      continueBeginningPhaseIfReady(game);

      addLog(
        game,
        `${player.name} descartó ${cardIds.length} carta${cardIds.length > 1 ? 's' : ''}`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    });
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
              { value: 'defuse', text: 'Defuse' },
              { value: 'favor', text: 'Favor' },
              { value: 'nope', text: 'Nope' },
              { value: 'see_the_future', text: 'See the Future 3x' },
              { value: 'shuffle', text: 'Shuffle' },
              { value: 'skip', text: 'Skip' },
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

  function registerSelectStableCard(io: GameServer, socket: GameSocket): void {
    socket.on('select-stable-card', ({ roomCode, cardId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const sourcePlayer = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!sourcePlayer) return;

      const pendingType = room.gameState.pendingAction?.type;

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
          TurnManager.processBeginningQueue(room.gameState);
        }

        // Alluring Narwhal ya registra su propio log específico (qué carta robó).
        if (pendingType !== 'alluring_narwhal') {
          addLog(
            room.gameState,
            `${sourcePlayer.name} eligió una carta de su establo`,
            { playerId: sourcePlayer.id },
          );
        }

        emitGameState(io, room, 'game-updated');
      }
    });
  }

  function registerSelectHandCard(io: GameServer, socket: GameSocket): void {
    socket.on('select-hand-card', ({ roomCode, cardId }) => {
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

      if (pending.reason === 'favor') {
        if (pending.targetPlayerId !== player.id) return;
        const targetPlayer = game.players.find((candidate) => candidate.id === player.id);
        const sourcePlayer = game.players.find((candidate) => candidate.id === pending.sourcePlayerId);
        const cardIndex = targetPlayer?.hand.findIndex((card) => card.uid === cardId) ?? -1;
        if (!targetPlayer || !sourcePlayer || cardIndex < 0) return;
        const [stolenCard] = targetPlayer.hand.splice(cardIndex, 1);
        sourcePlayer.hand.push(stolenCard);
        const favorIndex = sourcePlayer.hand.findIndex(
          (card) => card.uid === game.pendingPlay?.card.uid,
        );
        if (favorIndex >= 0) {
          const [favorCard] = sourcePlayer.hand.splice(favorIndex, 1);
          game.discard.push(favorCard);
        }
        game.pendingAction = undefined;
        game.pendingPlay = undefined;
        game.currentPlayer = game.players.findIndex((candidate) => candidate.id === sourcePlayer.id);
        game.phase = TurnPhase.ACTION;
        game.actionUsed = false;
        game.actionPlaysRemaining = undefined;
        enqueueStealAnimation(game.roomCode, targetPlayer.id, sourcePlayer.id, stolenCard);
        addLog(game, `${targetPlayer.name} entregó una carta a ${sourcePlayer.name} por Favor`, { playerId: sourcePlayer.id });
        emitGameState(io, room, 'game-updated');
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

      if (
        pending.reason === 'americorn' ||
        pending.reason === 'two_of_a_kind' ||
        pending.reason === 'three_of_a_kind'
      ) {
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

        const expectedPrefix =
          pending.reason === 'three_of_a_kind'
            ? `three-of-a-kind-${targetPlayer.id}-`
            : pending.reason === 'two_of_a_kind'
              ? `two-of-a-kind-${targetPlayer.id}-`
            : `hidden-hand-${targetPlayer.id}-`;

        if (cardId.startsWith(expectedPrefix)) {
          // Mano boca abajo: el cliente envía el uid de la carta oculta y el
          // índice codificado se traduce a la carta real de la mano.
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

          resolvedCardId = targetPlayer.hand[selectedIndex].uid;
        } else {
          // Nanny Cam: la mano está revelada y el cliente envía el uid real de
          // la carta. handleSelectHandCard validará que pertenezca a la mano.
          resolvedCardId = cardId;
        }
      }
      const stolenCard =
        (pending.reason === 'americorn' ||
          pending.reason === 'blatant_thievery' ||
          pending.reason === 'two_of_a_kind' ||
          pending.reason === 'three_of_a_kind')
        ? game.players
            .find((candidate) => candidate.id === pending.targetPlayerId)
            ?.hand.find((card) => card.uid === resolvedCardId)
        : undefined;

      if (pending.reason === 'three_of_a_kind') {
        const targetPlayer = game.players.find(
          (candidate) => candidate.id === pending.targetPlayerId,
        );
        const selectedCard = targetPlayer?.hand.find(
          (card) => card.uid === resolvedCardId,
        );
        if (!selectedCard || selectedCard.id !== pending.requestedCardType) {
          emitGameError(
            socket,
            'INVALID_SELECTION',
            'La carta seleccionada no coincide con el tipo elegido.',
            'select-hand-card',
          );
          return;
        }
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

      if (
        pending.reason === 'americorn' ||
        pending.reason === 'blatant_thievery' ||
        pending.reason === 'two_of_a_kind' ||
        pending.reason === 'three_of_a_kind'
      ) {
        if (stolenCard) {
          enqueueStealAnimation(
            game.roomCode,
            pending.targetPlayerId,
            player.id,
            stolenCard,
          );
        }
      }

      continueBeginningPhaseIfReady(game);

        if (pending.reason === 'americorn') {
        const targetPlayer = game.players.find(
          (candidate) => candidate.id === pending.targetPlayerId,
        );

        addLog(
          game,
          targetPlayer
            ? `${player.name} eligió a ${targetPlayer.name} y robó una carta de su mano al azar`
            : `${player.name} robó una carta de una mano al azar`,
          { playerId: player.id },
        );
      } else if (pending.reason === 'two_of_a_kind' || pending.reason === 'three_of_a_kind') {
        addLog(game, `${player.name} robó una carta con ${pending.reason === 'three_of_a_kind' ? 'Three' : 'Two'} of a Kind`, {
          playerId: player.id,
        });
      } else {
        addLog(game, `${player.name} eligió una carta de una mano`, {
          playerId: player.id,
        });
      }

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

        const [defuse] = gamePlayer.hand.splice(defuseIndex, 1);
        gamePlayer.hand.splice(kittenIndex > defuseIndex ? kittenIndex - 1 : kittenIndex, 1);
        game.discard.push(defuse);
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
      game.discard.push(...gamePlayer.hand.filter((card) => card.uid !== pending.card.uid));
      game.discard.push(pending.card);
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

  function registerResolveSeeTheFuture(io: GameServer, socket: GameSocket): void {
    socket.on('resolve-see-the-future', ({ roomCode }) => {
      const context = getSocketGameContext(socket, roomCode);
      if (!context) return;

      const { game, player, room } = context;
      const pending = game.pendingAction;
      if (!pending || pending.type !== 'see_the_future' || pending.playerId !== player.id) {
        emitGameError(socket, 'NO_PENDING_ACTION', 'No hay una visión del futuro pendiente.', 'select-choice');
        return;
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

  function registerSelectChoice(io: GameServer, socket: GameSocket): void {
    socket.on('select-choice', ({ roomCode, choice }) => {
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

      if (pending.reason === 'three_of_a_kind') {
        const validChoices = new Set([
          'beard_cat', 'cattermelon', 'hairy_potato_cat',
          'rainbow_ralphing_cat', 'tacocat', 'attack', 'defuse',
          'favor', 'nope', 'see_the_future', 'shuffle', 'skip',
        ]);
        const targetPlayer = room.gameState.players.find(
          (candidate) => candidate.id === pending.targetPlayerId,
        );
        const playedCards = (pending.cardIds ?? []).map((id) =>
          player.hand.find((card) => card.uid === id),
        );

        if (
          !validChoices.has(choice) ||
          !targetPlayer ||
          playedCards.length !== 3 ||
          playedCards.some((card) => !card)
        ) {
          emitGameError(
            socket,
            'INVALID_SELECTION',
            'El tipo de carta seleccionado no es válido.',
            'select-choice',
          );
          return;
        }

        const startedAt = Date.now();
        room.gameState.pendingAction = undefined;
        room.gameState.pendingPlay = {
          playerId: player.id,
          playerName: player.name,
          card: playedCards[0]!,
          startedAt,
          durationMs: 5000,
          acceptedIds: [],
          targetPlayerId: targetPlayer.id,
          targetPlayerName: targetPlayer.name,
          requestedCardType: choice,
          chain: playedCards.map((card) => ({
            playerId: player.id,
            playerName: player.name,
            card: card!,
            group: 0,
          })),
        };

        addLog(
          room.gameState,
          `${player.name} eligió robar una carta de tipo ${choice} a ${targetPlayer.name}`,
          { playerId: player.id },
        );
        emitGameState(io, room, 'game-updated');
        startPendingTimer(io, room, startedAt);
        return;
      }

      if (pending.reason === 'beginning_effect_picker') {
        // El jugador elige en qué orden resolver sus efectos de inicio de turno.
        const q = room.gameState.beginningEffectsQueue ?? [];
        const idx = q.indexOf(choice);
        if (idx !== -1) q.splice(idx, 1);
        room.gameState.beginningEffectsQueue = q;

        const started = TurnManager.startBeginningEffect(
          room.gameState,
          choice,
        );
        if (!started) {
          TurnManager.processBeginningQueue(room.gameState);
        }

        emitGameState(io, room, 'game-updated');
        return;
      }

      if (pending.reason === 'unicorn_of_war') {
        const remainingPlayerIds = pending.remainingPlayerIds ?? [];

        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'unicorn_of_war_destroy',
            sourcePlayerId: player.id,
            remainingPlayerIds,
          };
        } else {
          room.gameState.pendingAction = nextUnicornOfWarChoice(
            room.gameState,
            pending.sourcePlayerId ?? player.id,
            remainingPlayerIds,
          );
        }

        emitGameState(io, room, 'game-updated');
        return;
      }

      if (pending.reason === 'unicorn_rainbow_princess') {
        if (choice === 'yes') {
          const selectedPlayer = room.gameState.players.find(
            (candidate) => candidate.id === player.id,
          );
          if (selectedPlayer) {
            drawRainbowPrincessCards(room.gameState, selectedPlayer, 1);
          }
        }

        room.gameState.pendingAction = nextRainbowPrincessChoice(
          room.gameState,
          pending.sourcePlayerId ?? player.id,
          pending.remainingPlayerIds ?? [],
        );
        emitGameState(io, room, 'game-updated');
        return;
      }

      if (pending.reason === 'annoying_flying_unicorn') {
        if (choice === 'yes') {
          const rivals = room.gameState.players.filter(
            (p) => p.id !== player.id && p.hand.length > 0,
          );

          if (rivals.length === 1) {
            room.gameState.pendingAction = {
              type: 'discard',
              reason: 'annoying_flying_unicorn',
              playerId: rivals[0].id,
              cardsToDiscard: 1,
            };
          } else {
            room.gameState.pendingAction = {
              type: 'select_player',
              reason: 'annoying_flying_unicorn',
              sourcePlayerId: player.id,
            };
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Molesto Unicornio Volador`
            : `${player.name} omitió el efecto de Molesto Unicornio Volador`,
          { playerId: player.id },
        );

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
              'sacrifice',
            );
          }
        } else {
          // Destruir la carta original
          if (targetCardId && originalTargetPlayerId) {
            const targetPlayer = room.gameState.players.find(
              (p) => p.id === originalTargetPlayerId,
            );
            if (targetPlayer) {
              for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
                const idx = targetPlayer[z].findIndex(
                  (c) => c.uid === targetCardId,
                );
                if (idx === -1) continue;
                const [destroyedCard] = targetPlayer[z].splice(idx, 1);
                const intercepted = CardMovement.destroyOrSacrifice(
                  room.gameState,
                  targetPlayer,
                  destroyedCard,
                );
                if (intercepted) {
                  emitGameState(io, room, 'game-updated');
                  return;
                }
                break;
              }
            }
          }
        }

        room.gameState.pendingAction = undefined;

        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} sacrificó a Black Knight Unicorn`
            : `${player.name} destruyó la carta objetivo`,
          { playerId: player.id },
        );

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
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Chainsaw Unicorn`
            : `${player.name} omitió el efecto de Chainsaw Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'dark_angel_unicorn') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'dark_angel_unicorn',
            sourcePlayerId: player.id,
            targetPlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Dark Angel Unicorn`
            : `${player.name} omitió el efecto de Dark Angel Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'zombie_unicorn') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_hand_card',
            reason: 'zombie_unicorn',
            sourcePlayerId: player.id,
            targetPlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usará Zombie Unicorn`
            : `${player.name} omitió el efecto de Zombie Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'classy_narwhal') {
        if (choice === 'yes') {
          const candidates = room.gameState.deck.filter(
            (card) => card.cardType === 'upgrade',
          );

          if (candidates.length > 0) {
            room.gameState.pendingAction = {
              type: 'select_deck_card',
              reason: 'classy_narwhal',
              playerId: player.id,
              cardType: 'upgrade',
              candidates,
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Classy Narwhal`
            : `${player.name} omitió el efecto de Classy Narwhal`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'the_great_narwhal') {
        if (choice === 'yes') {
          const candidates = room.gameState.deck.filter((card) =>
            card.name.toLowerCase().includes('narwhal'),
          );

          if (candidates.length > 0) {
            room.gameState.pendingAction = {
              type: 'select_deck_card',
              reason: 'the_great_narwhal',
              playerId: player.id,
              candidates,
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de The Great Narwhal`
            : `${player.name} omitió el efecto de The Great Narwhal`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'shabby_the_narwhal') {
        if (choice === 'yes') {
          const candidates = room.gameState.deck.filter(
            (card) => card.cardType === 'downgrade',
          );

          if (candidates.length > 0) {
            room.gameState.pendingAction = {
              type: 'select_deck_card',
              reason: 'shabby_the_narwhal',
              playerId: player.id,
              candidates,
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Shabby The Narwhal`
            : `${player.name} omitió el efecto de Shabby The Narwhal`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'angel_unicorn') {
        if (choice === 'yes') {
          const uid = pending.effectCardId;
          const idx = player.stable.findIndex(
            (c) => (uid ? c.uid === uid : c.id === 'angel_unicorn'),
          );
          if (idx !== -1) {
            const [angelCard] = player.stable.splice(idx, 1);
            CardMovement.destroyOrSacrifice(
              room.gameState,
              player,
              angelCard,
              'sacrifice',
            );
          }

          const unicornsInDiscard = room.gameState.discard.some(
            (card) => card.cardType === 'unicorn',
          );

          if (unicornsInDiscard) {
            room.gameState.pendingAction = {
              type: 'select_discard_card',
              reason: 'angel_unicorn',
              playerId: player.id,
              cardType: 'unicorn',
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} sacrificó a Angel Unicorn`
            : `${player.name} omitió el efecto de Angel Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'magical_flying_unicorn') {
        if (choice === 'yes') {
          const magicInDiscard = room.gameState.discard.some(
            (card) => card.cardType === 'magic',
          );

          if (magicInDiscard) {
            room.gameState.pendingAction = {
              type: 'select_discard_card',
              reason: 'magical_flying_unicorn',
              playerId: player.id,
              cardType: 'magic',
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Magical Flying Unicorn`
            : `${player.name} omitió el efecto de Magical Flying Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'majestic_flying_unicorn') {
        if (choice === 'yes') {
          const unicornInDiscard = room.gameState.discard.some(
            (card) => card.cardType === 'unicorn',
          );

          if (unicornInDiscard) {
            room.gameState.pendingAction = {
              type: 'select_discard_card',
              reason: 'majestic_flying_unicorn',
              playerId: player.id,
              cardType: 'unicorn',
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Majestic Flying Unicorn`
            : `${player.name} omitió el efecto de Majestic Flying Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'mother_goose_unicorn') {
        if (choice === 'yes') {
          const hasBaby = room.gameState.nursery.some(
            (card) =>
              card.cardType === 'unicorn' && card.unicornClass === 'baby',
          );

          if (hasBaby) {
            room.gameState.pendingAction = {
              type: 'select_nursery_card',
              reason: 'mother_goose_unicorn',
              playerId: player.id,
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Mother Goose Unicorn`
            : `${player.name} omitió el efecto de Mother Goose Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'extremely_fertile_unicorn') {
        if (choice === 'yes') {
          const hasBaby = room.gameState.nursery.some(
            (card) =>
              card.cardType === 'unicorn' && card.unicornClass === 'baby',
          );

          if (player.hand.length > 0 && hasBaby) {
            room.gameState.pendingAction = {
              type: 'discard',
              reason: 'extremely_fertile_unicorn',
              playerId: player.id,
              cardsToDiscard: 1,
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usará Extremely Fertile Unicorn`
            : `${player.name} omitió el efecto de Extremely Fertile Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'necromancer_unicorn') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'necromancer_unicorn',
            playerId: player.id,
            cardsToDiscard: 2,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Necromancer Unicorn`
            : `${player.name} omitió el efecto de Necromancer Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'rainbow_unicorn') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_own_hand_card',
            reason: 'rainbow_unicorn',
            playerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Rainbow Unicorn`
            : `${player.name} omitió el efecto de Rainbow Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'rhinocorn') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'rhinocorn',
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usará Rhinocorn para destruir un unicornio`
            : `${player.name} omitió el efecto de Rhinocorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'caffeine_overload') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'caffeine_overload',
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} sacrificará una carta por Caffeine Overload`
            : `${player.name} omitió el efecto de Caffeine Overload`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'claw_machine') {
        const used =
          choice === 'yes' &&
          (room.gameState.players.find((p) => p.id === player.id)?.hand
            .length ?? 0) >= 1;

        if (used) {
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'claw_machine',
            playerId: player.id,
            cardsToDiscard: 1,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          used
            ? `${player.name} usará Claw Machine para descartar y robar`
            : `${player.name} no pudo usar Claw Machine (sin cartas para descartar)`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'glitter_bomb') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'glitter_bomb_sacrifice',
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usará Glitter Bomb para sacrificar y destruir`
            : `${player.name} omitió el efecto de Glitter Bomb`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'unicorn_of_death') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'unicorn_of_death_sacrifice',
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usará Unicorn of Death para sacrificar y destruir`
            : `${player.name} omitió el efecto de Unicorn of Death`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'rainbow_lasso') {
        const used =
          choice === 'yes' &&
          (room.gameState.players.find((p) => p.id === player.id)?.hand
            .length ?? 0) >= 3;

        if (used) {
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'rainbow_lasso',
            playerId: player.id,
            cardsToDiscard: 3,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          used
            ? `${player.name} usará Rainbow Lasso para descartar 3 y robar un unicornio`
            : `${player.name} no pudo usar Rainbow Lasso (no tiene 3 cartas)`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'rainbow_sprinkles') {
        if (choice === 'yes') {
          for (let index = 0; index < 3; index += 1) {
            const drawn = room.gameState.deck.shift();
            if (!drawn) break;
            enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
            player.hand.push(drawn);
          }

          room.gameState.pendingAction = undefined;
          room.gameState.phase = TurnPhase.END;
          TurnManager.skipEndIfNoTriggers(room.gameState);
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó Rainbow Sprinkles, robó hasta 3 cartas y terminó su turno`
            : `${player.name} omitió el efecto de Rainbow Sprinkles`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'special_delivery') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_nursery_card',
            reason: 'special_delivery',
            playerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usará Special Delivery para traer un Baby Unicorn`
            : `${player.name} omitió el efecto de Special Delivery`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'stable_artillery') {
        const used =
          choice === 'yes' &&
          (room.gameState.players.find((p) => p.id === player.id)?.hand
            .length ?? 0) >= 2;

        if (used) {
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'stable_artillery',
            playerId: player.id,
            cardsToDiscard: 2,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          used
            ? `${player.name} usará Stable Artillery para descartar 2 y destruir un unicornio`
            : `${player.name} no pudo usar Stable Artillery (no tiene 2 cartas)`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'seductive_unicorn') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'seductive_unicorn',
            playerId: player.id,
            cardsToDiscard: 1,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Seductive Unicorn`
            : `${player.name} omitió el efecto de Seductive Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'swift_flying_unicorn') {
        if (choice === 'yes') {
          const neighInDiscard = room.gameState.discard.some(
            (card) =>
              card.cardType === 'instant' &&
              (card.effect === 'neigh' || card.effect === 'super_neigh'),
          );

          if (neighInDiscard) {
            room.gameState.pendingAction = {
              type: 'select_discard_card',
              reason: 'swift_flying_unicorn',
              playerId: player.id,
              cardType: 'instant',
            };
          } else {
            room.gameState.pendingAction = undefined;
            if (room.gameState.phase === TurnPhase.BEGINNING) {
              TurnManager.processBeginningQueue(room.gameState);
            }
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Swifty Flying Unicorn`
            : `${player.name} omitió el efecto de Swifty Flying Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'stabby_the_unicorn') {
        if (choice === 'yes') {
          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'stabby_the_unicorn',
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} usó el efecto de Stabby The Unicorn para destruir un unicornio`
            : `${player.name} omitió el efecto de Stabby The Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'shark_with_a_horn') {
        if (choice === 'yes') {
          const sharkIdx = player.stable.findIndex(
            (c) => c.id === 'shark_with_a_horn',
          );
          if (sharkIdx !== -1) {
            const [shark] = player.stable.splice(sharkIdx, 1);
            CardMovement.destroyOrSacrifice(
              room.gameState,
              player,
              shark,
              'sacrifice',
            );
          }

          room.gameState.pendingAction = {
            type: 'select_stable_card',
            reason: 'shark_with_a_horn',
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes'
            ? `${player.name} sacrificó a Shark With A Horn para destruir un unicornio`
            : `${player.name} omitió el efecto de Shark With A Horn`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      } else if (pending.reason === 'unicorn_phoenix') {
        const heldCard = pending.heldCard;

        if (choice === 'yes' && heldCard) {
          // Phoenix NUNCA abandonó el establo (se restauró al interceptar), así
          // que ya está en player.stable. No debe re-entrar: eso dispararía
          // efectos on-enter y Barbed Wire (entrada + salida), que no aplican.
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'unicorn_phoenix',
            playerId: player.id,
            cardsToDiscard: 1,
          };
        } else {
          if (heldCard) {
            const stableIdx = player.stable.findIndex(
              (c) => c.uid === heldCard.uid,
            );
            if (stableIdx !== -1) {
              player.stable.splice(stableIdx, 1);
            }
            enqueueCardAnimation(
              room.gameState.roomCode,
              'destroy',
              player.id,
              heldCard,
            );
            room.gameState.discard.push(heldCard);
          }
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === 'yes' && heldCard
            ? `${player.name} descartó una carta para salvar a Unicorn Phoenix`
            : `${player.name} dejó que Unicorn Phoenix fuera destruido`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      }
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
         pending.reason !== 'special_delivery'
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
          { playerId: player.id },
        );
        room.gameState.phase = TurnPhase.END;
        TurnManager.skipEndIfNoTriggers(room.gameState);
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
        selectedCard.effect !== 'super_neigh'
      ) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'La carta seleccionada no es un Neigh.',
          'select-discard-card',
        );
        return;
      }

      const [removed] = room.gameState.discard.splice(cardIdx, 1);
      room.gameState.pendingAction = undefined;

      if (
        pending.reason === 'magical_flying_unicorn' ||
        pending.reason === 'majestic_flying_unicorn' ||
        pending.reason === 'swift_flying_unicorn' ||
        pending.reason === 'frenchiecorn'
      ) {
        player.hand.push(removed);

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
        room.gameState.discard.push(removed);

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

  function registerSelectDeckCard(io: GameServer, socket: GameSocket): void {
    socket.on('select-deck-card', ({ roomCode, cardId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const player = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!player) return;

      const pending = room.gameState.pendingAction;
      if (
        !pending ||
        pending.type !== 'select_deck_card' ||
        pending.playerId !== player.id
      ) {
        return;
      }

      if (
        pending.reason !== 'classy_narwhal' &&
        pending.reason !== 'the_great_narwhal' &&
        pending.reason !== 'shabby_the_narwhal' &&
        pending.reason !== 'debug_draw' &&
        pending.reason !== 'exploding_kitten_defuse' &&
        pending.reason !== 'unicorns_of_the_apocalypse'
      )
        return;

      if (pending.reason === 'unicorns_of_the_apocalypse') {
        if (
          !Array.isArray(cardId) ||
          cardId.length !== 4 ||
          new Set(cardId).size !== cardId.length ||
          cardId.some(
            (uid) =>
              !pending.candidates.some((candidate) => candidate.uid === uid),
          )
        ) {
          emitGameError(
            socket,
            'INVALID_SELECTION',
            'Debes elegir exactamente 4 Unicornios del mazo.',
            'select-deck-card',
          );
          return;
        }

        const selected = cardId.map((uid) =>
          room.gameState!.deck.find((card) => card.uid === uid),
        );
        if (selected.some((card) => !card || card.cardType !== 'unicorn')) return;

        for (const uid of cardId) {
          const index = room.gameState.deck.findIndex((card) => card.uid === uid);
          const [unicorn] = room.gameState.deck.splice(index, 1);
          CardMovement.enterStable(room.gameState, player, unicorn);
        }
        for (let i = room.gameState.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [room.gameState.deck[i], room.gameState.deck[j]] = [
            room.gameState.deck[j],
            room.gameState.deck[i],
          ];
        }
        enqueueShuffleAnimation(room.gameState.roomCode, player.id);
        room.gameState.pendingAction = undefined;
        emitGameState(io, room, 'game-updated');
        return;
      }

      if (
        pending.candidates.length > 0 &&
        !pending.candidates.some((candidate) => candidate.uid === cardId)
      ) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'La carta seleccionada no es válida.',
          'select-deck-card',
        );
        return;
      }

      if (pending.reason === 'exploding_kitten_defuse') {
        const positionCardId = Array.isArray(cardId) ? cardId[0] : cardId;
        const position = Number(positionCardId.replace('deck-position-', ''));
        if (!Number.isInteger(position) || position < 0 || position > room.gameState.deck.length) {
          emitGameError(socket, 'INVALID_SELECTION', 'La posición del mazo no es válida.', 'select-deck-card');
          return;
        }

        if (!pending.card) return;
        room.gameState.deck.splice(position, 0, pending.card);
        room.gameState.pendingAction = undefined;
        const defusingPlayerIndex = room.gameState.players.findIndex(
          (candidate) => candidate.id === player.id,
        );
        if (defusingPlayerIndex >= 0) {
          room.gameState.currentPlayer = defusingPlayerIndex;
        }
        room.gameState.currentPlayer =
          (room.gameState.currentPlayer + 1) % room.gameState.players.length;
        room.gameState.turn += 1;
        room.gameState.turnsRemaining = 1;
        room.gameState.phase = TurnPhase.DRAW;
        room.gameState.actionUsed = false;
        room.gameState.actionPlaysRemaining = undefined;
        room.gameState.pendingAction = undefined;
        room.gameState.pendingPlay = undefined;
        addLog(room.gameState, `${player.name} terminó su turno después de usar Defuse`, {
          playerId: player.id,
        });
        emitGameState(io, room, 'game-updated');
        return;
      }

      const cardIdx = room.gameState.deck.findIndex((c) => c.uid === cardId);
      if (cardIdx === -1) return;

      const [upgrade] = room.gameState.deck.splice(cardIdx, 1);
      player.hand.push(upgrade);

      if (pending.reason !== 'debug_draw') {
        for (let i = room.gameState.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [room.gameState.deck[i], room.gameState.deck[j]] = [
            room.gameState.deck[j],
            room.gameState.deck[i],
          ];
        }
      }

      if (pending.reason === 'debug_draw') {
        enqueueDrawAnimation(room.gameState.roomCode, player.id, upgrade);
      }

      if (
        pending.reason === 'debug_draw' &&
        (room.settings?.gameId ?? room.game) === 'exploding-kittens' &&
        upgrade.id === 'exploding_kitten'
      ) {
        room.gameState.pendingAction = {
          type: 'exploding_kitten',
          playerId: player.id,
          card: upgrade,
        };
        addLog(room.gameState, `${player.name} robó un Exploding Kitten`, {
          playerId: player.id,
        });
        emitGameState(io, room, 'game-updated');
        return;
      }

      room.gameState.pendingAction = undefined;

      const isExplodingKittens =
        (room.settings?.gameId ?? room.game) === 'exploding-kittens';

      if (isExplodingKittens && pending.reason === 'debug_draw') {
        advanceTurnAfterDraw(room.gameState);
      } else if (room.gameState.phase === TurnPhase.BEGINNING) {
        TurnManager.processBeginningQueue(room.gameState);
      } else if (
        room.gameState.phase === TurnPhase.DRAW &&
        pending.reason === 'debug_draw'
      ) {
        room.gameState.phase = TurnPhase.ACTION;
        VictoryManager.checkWinner(room.gameState);
      }

      addLog(
        room.gameState,
        pending.reason === 'debug_draw'
          ? `${player.name} (debug) eligió ${upgrade.name} del mazo`
          : `${player.name} buscó un upgrade en el mazo y lo añadió a su mano`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    });
  }

  function registerSelectOracleCards(io: GameServer, socket: GameSocket): void {
    socket.on(
      'select-oracle-cards',
      ({ roomCode, handCardId, orderCardIds }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const player = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!player) return;

        const pending = room.gameState.pendingAction;
        if (
          !pending ||
          pending.type !== 'select_oracle_cards' ||
          pending.playerId !== player.id
        ) {
          return;
        }

        // Validar que handCardId sea una de las candidatas
        const kept = pending.candidates.find((c) => c.uid === handCardId);
        if (!kept) return;

        // Las restantes deben ser las candidatas que no se robaron
        const remaining = pending.candidates.filter(
          (c) => c.uid !== handCardId,
        );
        if (remaining.length !== 2) return;
        if (orderCardIds.length !== 2) return;

        const remainingUids = remaining.map((c) => c.uid);
        if (!orderCardIds.every((uid: string) => remainingUids.includes(uid))) {
          return;
        }
        if (new Set(orderCardIds).size !== 2) return;

        // Añadir la carta elegida a la mano
        player.hand.push(kept);

        // Devolver las otras dos al tope del mazo (orderCardIds[0] queda arriba)
        const ordered = remaining
          .slice()
          .sort(
            (a, b) => orderCardIds.indexOf(a.uid) - orderCardIds.indexOf(b.uid),
          );
        room.gameState.deck.unshift(...ordered);

        room.gameState.pendingAction = undefined;

        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }

        addLog(
          room.gameState,
          `${player.name} usó a Unicorn Oracle: añadió una carta a su mano y reordenó el mazo`,
          { playerId: player.id },
        );

        emitGameState(io, room, 'game-updated');
      },
    );
  }

  function registerSelectOwnHandCard(io: GameServer, socket: GameSocket): void {
    socket.on('select-own-hand-card', ({ roomCode, cardId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const player = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!player) return;

      const pending = room.gameState.pendingAction;
      if (
        !pending ||
        pending.type !== 'select_own_hand_card' ||
        pending.playerId !== player.id
      ) {
        return;
      }

      if (pending.reason !== 'rainbow_unicorn') return;

      const resolved = ActionResolver.handleSelectOwnHandCardToStable(
        room.gameState,
        player.id,
        cardId,
      );

      if (!resolved) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'La carta seleccionada no es un unicornio básico válido.',
          'select-own-hand-card',
        );
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
        `${player.name} trajo un unicornio básico de su mano a su establo`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    });
  }
}
