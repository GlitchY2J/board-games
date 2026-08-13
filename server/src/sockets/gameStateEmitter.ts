import type { GameServer } from './socketTypes.ts';
import type { Room } from '../game/models/Room.ts';
import type { GameState } from '../game/models/GameState.ts';
import type { Card } from '../game/models/Card.ts';
import { drainCardAnimations, drainNeighAnimations, drainDrawAnimations, drainDiscardAnimations } from '../game/cardAnimations.ts';

const CARD_BACK_IMAGE = '/cards/base/card_back.png';

function createHiddenCard(id: string): Card {
  return {
    uid: id,
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

function canViewerSeeTargetHand(
  game: GameState,
  viewerId: string,
  targetPlayerId: string,
): boolean {
  const pending = game.pendingAction;

  if (
    game.players.some(
      (p) =>
        p.id === targetPlayerId &&
        p.downgrades.some((c) => c.id === 'nanny_cam'),
    )
  ) {
    return true;
  }

  if (!pending || pending.type !== 'select_hand_card') {
    return false;
  }

  return (
    pending.reason === 'blatant_thievery' &&
    pending.sourcePlayerId === viewerId &&
    pending.targetPlayerId === targetPlayerId
  );
}

export function createGameStateForPlayer(
  game: GameState,
  viewerId: string,
): GameState {
  return {
    ...game,
    deck: game.deck.map((_, index) => createHiddenCard(`hidden-deck-${index}`)),
    players: game.players.map((player) => {
      const isViewer = player.id === viewerId;

      const canSeeHand = canViewerSeeTargetHand(game, viewerId, player.id);

      return {
        ...player,
        hand:
          isViewer || canSeeHand
            ? player.hand.map((card) => ({
                ...card,
              }))
            : player.hand.map((_, index) =>
                createHiddenCard(`hidden-hand-${player.id}-${index}`),
              ),
        stable: player.stable.map((card) => ({ ...card })),
        upgrades: player.upgrades.map((card) => ({ ...card })),
        downgrades: player.downgrades.map((card) => ({ ...card })),
      };
    }),
    nursery: game.nursery.map((card) => ({ ...card })),
    discard: game.discard.map((card) => ({ ...card })),
  };
}

export function emitGameState(
  io: GameServer,
  room: Room,
  eventName: 'game-started' | 'game-updated',
): void {
  const game = room.gameState;

  if (!game) {
    return;
  }

  // Reanuda el siguiente paso de un flujo encadenado (p. ej. efectos on-enter
  // interactivos disparados por Unicorn Swap) cuando la acción actual terminó.
  while (!game.pendingAction && game.pendingResume?.length) {
    game.pendingAction = game.pendingResume.pop();
  }

  const anims = drainCardAnimations(game.roomCode);
  if (anims.length > 0) {
    io.to(room.code).emit('card-animations', anims);
  }

  const neighAnims = drainNeighAnimations(game.roomCode);
  if (neighAnims.length > 0) {
    io.to(room.code).emit('neigh-animations', neighAnims);
  }

  const drawAnims = drainDrawAnimations(game.roomCode);
  if (drawAnims.length > 0) {
    io.to(room.code).emit('draw-animations', drawAnims);
  }

  const discardAnims = drainDiscardAnimations(game.roomCode);
  if (discardAnims.length > 0) {
    io.to(room.code).emit('discard-animations', discardAnims);
  }

  for (const roomPlayer of room.players) {
    const gamePlayer = game.players.find(
      (player) => player.id === roomPlayer.id,
    );

    if (!gamePlayer) {
      continue;
    }

    const state = createGameStateForPlayer(game, gamePlayer.id);

    if (!roomPlayer.socketId) {
      continue;
    }

    io.to(roomPlayer.socketId).emit(eventName, state);
  }
}
