import type { GameServer, GameSocket } from './socketTypes.ts';
import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { emitGameError, getSocketGameContext } from './socketContext.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import type { GameState } from '../game/models/GameState.ts';
import { isDiscardAction } from '../../../shared/types/PendingActionCategories.ts';

function continueBeginningPhaseIfReady(game: GameState): void {
  if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
    TurnManager.processBeginningQueue(game);
  }
}

export function registerDiscardHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('discard-cards', ({ roomCode, playerId, cardIds }) => {
    const context = getSocketGameContext(socket, roomCode);
    if (!context) return;

    const { game, player, room } = context;
    if (playerId !== player.id) {
      emitGameError(socket, 'INVALID_PLAYER', 'El jugador enviado no coincide con tu sesión.', 'discard-card');
      return;
    }
    if (!game.pendingAction) {
      emitGameError(socket, 'NO_PENDING_ACTION', 'No hay una acción de descarte pendiente.', 'discard-card');
      return;
    }

    if (!isDiscardAction(game.pendingAction)) {
      emitGameError(socket, 'INVALID_SELECTION', 'La selección de descarte no es válida.', 'discard-card');
      return;
    }

    let resolved = false;
    const discardReason = game.pendingAction.type === 'discard'
      ? game.pendingAction.reason
      : undefined;
    const isLlamacorn = game.pendingAction.type === 'llamacorn';
    const pendingSourceImageValue = 'sourceCardImage' in game.pendingAction
      ? game.pendingAction.sourceCardImage
      : 'effectCardImage' in game.pendingAction
        ? game.pendingAction.effectCardImage
        : undefined;
    const pendingSourceImage = typeof pendingSourceImageValue === 'string'
      ? pendingSourceImageValue
      : undefined;
    const selectedDiscardCards = cardIds
      .map((cardId) => player.hand.find((card) => card.uid === cardId))
      .filter((card): card is NonNullable<typeof card> => !!card);
    const selectedDiscardedCard = discardReason === 'unicorn_on_the_cob'
      ? player.hand.find((card) => card.uid === cardIds[0])
      : undefined;

    switch (game.pendingAction.type) {
      case 'select_discard_count':
        resolved = ActionResolver.handlePestilenceDiscardCount(game, player.id, cardIds);
        break;
      case 'pestilence_discard':
        resolved = ActionResolver.handlePestilenceDiscard(game, player.id, cardIds);
        break;
      case 'mystical_vortex':
        resolved = ActionResolver.handleMysticalVortexDiscard(game, player.id, cardIds);
        break;
      case 'llamacorn':
        resolved = ActionResolver.handleLlamacornDiscard(game, player.id, cardIds);
        break;
      case 'frenchiecorn':
        resolved = ActionResolver.handleFrenchiecornDiscard(game, player.id, cardIds);
        break;
      case 'discard':
        resolved = ActionResolver.handleDiscard(game, player.id, cardIds, discardReason === 'hand_limit');
        break;
    }

    if (!resolved) {
      emitGameError(socket, 'INVALID_SELECTION', 'La selección de descarte no es válida.', 'discard-card');
      return;
    }

    continueBeginningPhaseIfReady(game);
    if (discardReason === 'necromancer_unicorn') {
      emitGameState(io, room, 'game-updated');
      return;
    }
    const discardedCard = selectedDiscardedCard ?? game.discard.find((card) => card.uid === cardIds[0]);
    const discardedImages = cardIds
      .map((cardId) => game.discard.find((card) => card.uid === cardId)?.image)
      .filter((image): image is string => !!image);
    const annoyingFlyingCard = discardReason === 'annoying_flying_unicorn'
      ? game.players
        .flatMap((candidate) => candidate.stable)
        .find((card) => card.id === 'annoying_flying_unicorn')
        : undefined;
    const llamacornCard = isLlamacorn
      ? game.players
        .flatMap((candidate) => candidate.stable)
        .find((card) => card.id === 'llamacorn')
      : undefined;
    addLog(
      game,
      isLlamacorn && discardedCard
        ? `${player.name} descartó "${discardedCard.name}" por el efecto de "Llamacorn"`
        : discardReason === 'annoying_flying_unicorn' && discardedCard
        ? `${player.name} descartó "${discardedCard.name}" por el efecto de "Annoying Flying Unicorn"`
        : `${player.name} descartó`,
      {
        playerId: player.id,
        cardImage: discardedCard?.image,
        cardImages: isLlamacorn
          ? [discardedCard?.image, llamacornCard?.image].filter(
            (image): image is string => !!image,
          )
          : discardReason === 'annoying_flying_unicorn'
          ? [discardedCard?.image, annoyingFlyingCard?.image].filter(
            (image): image is string => !!image,
          )
          : discardedImages,
        event: isLlamacorn || discardReason === 'annoying_flying_unicorn' ? 'discard-card' : undefined,
        action: 'discard',
        cards: [
          ...(pendingSourceImage || llamacornCard?.image || annoyingFlyingCard?.image
            ? [{ image: pendingSourceImage ?? llamacornCard?.image ?? annoyingFlyingCard!.image, role: 'source' as const }]
            : []),
          ...selectedDiscardCards.map((card) => ({
            uid: card.uid,
            id: card.id,
            name: card.name,
            image: card.image,
            role: 'cost' as const,
            status: 'discarded' as const,
          })),
        ],
      },
    );
    if (discardReason === 'hand_limit') {
      TurnManager.nextPhase(game);
    }
    emitGameState(io, room, 'game-updated');
  });
}
