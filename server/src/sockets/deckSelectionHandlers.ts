import type { GameServer, GameSocket } from './socketTypes.ts';
import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { emitGameError, getSocketGameContext } from './socketContext.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import { CardMovement } from '../game/unstable-unicorns/engine/CardMovement.ts';
import { CardZoneMovement } from '../game/unstable-unicorns/engine/CardZoneMovement.ts';
import {
  enqueueDrawAnimation,
  enqueueShuffleAnimation,
} from '../game/cardAnimations.ts';
import {
  advanceTurnAfterDraw,
  beginExplodingKittenResolution,
  beginImplodingKittenResolution,
} from '../game/exploding-kittens/turn.ts';
import { VictoryManager } from '../game/VictoryManager.ts';

export function registerDeckSelectionHandlers(io: GameServer, socket: GameSocket): void {
socket.on('select-oracle-cards', ({ roomCode, handCardId, orderCardIds }) => {
  const room = roomManager.getRoom(roomCode);
  if (!room?.gameState) return;
  const player = room.gameState.players.find((candidate) => candidate.socketId === socket.id);
  const pending = room.gameState.pendingAction;
  if (!player || !pending || pending.type !== 'select_oracle_cards' || pending.playerId !== player.id) return;
  const kept = pending.candidates.find((card) => card.uid === handCardId);
  const remaining = pending.candidates.filter((card) => card.uid !== handCardId);
  if (!kept || remaining.length !== 2 || orderCardIds.length !== 2 || new Set(orderCardIds).size !== 2) return;
  if (!orderCardIds.every((uid) => remaining.some((card) => card.uid === uid))) return;

  CardZoneMovement.addToHand(player, kept);
  room.gameState.deck.unshift(...remaining.slice().sort((a, b) => orderCardIds.indexOf(a.uid) - orderCardIds.indexOf(b.uid)));
  room.gameState.pendingAction = undefined;
  if (room.gameState.phase === TurnPhase.BEGINNING) TurnManager.processBeginningQueue(room.gameState);
  addLog(room.gameState, `${player.name} añadió una carta a su mano`, { playerId: player.id });
  emitGameState(io, room, 'game-updated');
});

socket.on('select-own-hand-card', ({ roomCode, cardId }) => {
  const context = getSocketGameContext(socket, roomCode);
  if (!context) return;
  const { room, game, player } = context;
  const pending = game.pendingAction;
  if (!pending || pending.type !== 'select_own_hand_card' || pending.playerId !== player.id || pending.reason !== 'rainbow_unicorn') return;
  if (!ActionResolver.handleSelectOwnHandCardToStable(game, player.id, cardId)) {
    emitGameError(socket, 'INVALID_SELECTION', 'La carta seleccionada no es un unicornio básico válido.', 'select-own-hand-card');
    return;
  }
  if (game.phase === TurnPhase.BEGINNING && !game.pendingAction) TurnManager.processBeginningQueue(game);
  addLog(game, `${player.name} trajo un unicornio básico de su mano a su establo`, { playerId: player.id });
  emitGameState(io, room, 'game-updated');
});

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
    pending.reason !== 'imploding_kitten_place' &&
    pending.reason !== 'unicorns_of_the_apocalypse' &&
    pending.reason !== 'the_cornjuring'
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

  if (pending.reason === 'the_cornjuring') {
    const selectedId = Array.isArray(cardId) ? cardId[0] : cardId;
    const index = room.gameState.deck.findIndex((card) => card.uid === selectedId);
    const target = room.gameState.players.find(
      (candidate) => candidate.id === pending.targetPlayerId,
    );
    if (
      !target ||
      index === -1 ||
      !pending.candidates.some((candidate) => candidate.uid === selectedId)
    )
      return;

    const [downgrade] = room.gameState.deck.splice(index, 1);
    CardMovement.enterStableCard(target, downgrade);
    for (let i = room.gameState.deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [room.gameState.deck[i], room.gameState.deck[j]] = [
        room.gameState.deck[j],
        room.gameState.deck[i],
      ];
    }
    enqueueShuffleAnimation(room.gameState.roomCode, player.id);
    room.gameState.pendingAction = undefined;
    addLog(
      room.gameState,
      `${player.name} llevó ${downgrade.name} al establo de ${target.name} por The Cornjuring y barajó el mazo`,
      { playerId: player.id },
    );
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
    advanceTurnAfterDraw(room.gameState);
    addLog(room.gameState, `${player.name} terminó su turno después de usar Defuse`, {
      playerId: player.id,
    });
    emitGameState(io, room, 'game-updated');
    return;
  }

  if (pending.reason === 'imploding_kitten_place') {
    const positionCardId = Array.isArray(cardId) ? cardId[0] : cardId;
    const position = Number(positionCardId.replace('deck-position-', ''));
    if (!Number.isInteger(position) || position < 0 || position > room.gameState.deck.length) {
      emitGameError(socket, 'INVALID_SELECTION', 'La posición del mazo no es válida.', 'select-deck-card');
      return;
    }

    if (!pending.card) return;
    pending.card.faceUp = true;
    room.gameState.deck.splice(position, 0, pending.card);
    room.gameState.pendingAction = undefined;
    advanceTurnAfterDraw(room.gameState);
    addLog(room.gameState, `${player.name} colocó el Imploding Kitten boca arriba en el mazo`, {
      playerId: player.id,
    });
    emitGameState(io, room, 'game-updated');
    return;
  }

  const cardIdx = room.gameState.deck.findIndex((c) => c.uid === cardId);
  if (cardIdx === -1) return;

  const [upgrade] = room.gameState.deck.splice(cardIdx, 1);
  const isExplodingKittens =
    room.settings.gameId === 'exploding-kittens';
  const isDebugImplodingKitten =
    isExplodingKittens &&
    pending.reason === 'debug_draw' &&
    upgrade.id === 'imploding_kitten';
  if (!isDebugImplodingKitten) {
    CardZoneMovement.addToHand(player, upgrade);
  }

  if (pending.reason !== 'debug_draw') {
    for (let i = room.gameState.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [room.gameState.deck[i], room.gameState.deck[j]] = [
        room.gameState.deck[j],
        room.gameState.deck[i],
      ];
    }
    enqueueShuffleAnimation(room.gameState.roomCode, player.id);
  }

  if (pending.reason === 'debug_draw') {
    enqueueDrawAnimation(
      room.gameState.roomCode,
      player.id,
      upgrade,
      isDebugImplodingKitten,
    );
  }

  if (isDebugImplodingKitten) {
    const stage = beginImplodingKittenResolution(room.gameState, player, upgrade);
    addLog(
      room.gameState,
      stage === 'revealed'
        ? `${player.name} reveló un Imploding Kitten`
        : `${player.name} robó un Imploding Kitten boca arriba`,
      { playerId: player.id },
    );
    emitGameState(io, room, 'game-updated');
    return;
  }

  if (
    pending.reason === 'debug_draw' &&
    room.settings.gameId === 'exploding-kittens' &&
    beginExplodingKittenResolution(room.gameState, player, upgrade)
  ) {
    addLog(room.gameState, `${player.name} robó un Exploding Kitten`, {
      playerId: player.id,
    });
    emitGameState(io, room, 'game-updated');
    return;
  }

  room.gameState.pendingAction = undefined;

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
