import type { GameServer } from './socketTypes.ts';
import type { Room } from '../game/models/Room.ts';
import type { GameState } from '../game/models/GameState.ts';
import type { Card } from '../game/models/Card.ts';
import { drainCardAnimations, drainNeighAnimations, drainDrawAnimations, drainDiscardAnimations, drainPlayAnimations, drainStealAnimations, drainShuffleAnimations } from '../game/cardAnimations.ts';
import { checkTinyStable } from '../game/cards/effects/tinyStable.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';

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

  const isTwoOfAKindViewer =
    pending?.type === 'select_hand_card' &&
    pending.reason === 'two_of_a_kind' &&
    pending.sourcePlayerId === viewerId &&
    pending.targetPlayerId === targetPlayerId;

  if (isTwoOfAKindViewer) return false;

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
    deck: game.debugMode
      ? game.deck.map((card) => ({ ...card }))
      : game.deck.map((_, index) => createHiddenCard(`hidden-deck-${index}`)),
    players: game.players.map((player) => {
      const isViewer = player.id === viewerId;
      const { sessionToken: _sessionToken, ...publicPlayer } = player;

      const canSeeHand = canViewerSeeTargetHand(game, viewerId, player.id);

      // El jugador que usa Americorn ve la mano objetivo boca abajo, pero en
      // orden aleatorio (sin filtrar el orden real de la mano).
  const isAmericornViewer =
        game.pendingAction?.type === 'select_hand_card' &&
        game.pendingAction?.reason === 'americorn' &&
        game.pendingAction?.sourcePlayerId === viewerId &&
        game.pendingAction?.targetPlayerId === player.id;
  const isTwoOfAKindViewer =
    game.pendingAction?.type === 'select_hand_card' &&
    (game.pendingAction.reason === 'two_of_a_kind' ||
      game.pendingAction.reason === 'three_of_a_kind') &&
        game.pendingAction.sourcePlayerId === viewerId &&
        game.pendingAction.targetPlayerId === player.id;
      const isThreeOfAKindViewer =
        game.pendingAction?.type === 'select_hand_card' &&
        game.pendingAction.reason === 'three_of_a_kind' &&
        game.pendingAction.sourcePlayerId === viewerId &&
        game.pendingAction.targetPlayerId === player.id;

      return {
        ...publicPlayer,
        hand:
          isViewer || canSeeHand
            ? player.hand.map((card) => ({
                ...card,
              }))
            : (() => {
                const hidden = player.hand.map((_, index) =>
                  createHiddenCard(
                    `${isTwoOfAKindViewer
                      ? isThreeOfAKindViewer
                        ? 'three-of-a-kind'
                        : 'two-of-a-kind'
                      : 'hidden-hand'}-${player.id}-${index}`,
                  ),
                );

                if ((isAmericornViewer || isTwoOfAKindViewer) && hidden.length > 1) {
                  for (let i = hidden.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [hidden[i], hidden[j]] = [hidden[j], hidden[i]];
                  }
                }

                return hidden;
              })(),
        stable: player.stable.map((card) => ({ ...card })),
        upgrades: player.upgrades.map((card) => ({ ...card })),
        downgrades: player.downgrades.map((card) => ({ ...card })),
      } as typeof player;
    }),
    nursery: game.nursery.map((card) => ({ ...card })),
    discard: game.discard.map((card) => ({ ...card })),
  };
}

export function emitGameState(
  io: GameServer,
  room: Room,
  eventName: 'game-started' | 'game-updated' | 'game-restarted',
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

  // Tiny Stable: invariante continuo y obligatorio (sacrificar unicornios si
  // se supera el límite de 5). Se ejecuta después de cada acción.
  checkTinyStable(game);

  // Double Dutch: al entrar en la fase de acción, permitir jugar hasta 2
  // cartas (sin overlay) si el jugador activo tiene Double Dutch.
  TurnManager.applyDoubleDutch(game);

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
  const stealAnims = drainStealAnimations(game.roomCode);
  if (stealAnims.length > 0) {
    io.to(room.code).emit('steal-animations', stealAnims);
  }

  const discardAnims = drainDiscardAnimations(game.roomCode);
  if (discardAnims.length > 0) {
    io.to(room.code).emit('discard-animations', discardAnims);
  }

  const playAnims = drainPlayAnimations(game.roomCode);
  if (playAnims.length > 0) {
    io.to(room.code).emit('play-animations', playAnims);
  }
  const shuffleAnims = drainShuffleAnimations(game.roomCode);
  if (shuffleAnims.length > 0) {
    io.to(room.code).emit('shuffle-animations', shuffleAnims);
  }

  for (const roomPlayer of room.players) {
    const gamePlayer = game.players.find(
      (player) => player.id === roomPlayer.id,
    );

    if (!roomPlayer.socketId) {
      continue;
    }

    io.to(roomPlayer.socketId).emit(
      eventName,
      createGameStateForPlayer(game, gamePlayer?.id ?? roomPlayer.id),
    );
  }
}
