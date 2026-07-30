import type { GameState } from '../../models/GameState.ts';
import { TurnManager } from '../../turn/TurnManager.ts';
import { CardMovement } from './CardMovement.ts';

export class ActionResolver {
  static handleDiscard(
    state: GameState,
    playerId: string,
    cardIds: string[],
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'discard' ||
      pending.playerId !== playerId
    ) {
      return false;
    }

    if (cardIds.length !== pending.cardsToDiscard) {
      return false;
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return false;

    for (const cardId of cardIds) {
      const idx = player.hand.findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        const [discarded] = player.hand.splice(idx, 1);
        state.discard.push(discarded);
      }
    }

    const reason = pending.reason;
    state.pendingAction = undefined;

    if (reason === 'hand_limit') {
      TurnManager.nextPhase(state);
    }

    return true;
  }

  static handleSelectPlayer(
    state: GameState,
    sourcePlayerId: string,
    targetPlayerId: string,
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'select_player' ||
      pending.sourcePlayerId !== sourcePlayerId
    ) {
      return false;
    }

    const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) return false;

    if (pending.reason === 'back_kick') {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'back_kick',
        sourcePlayerId,
        targetPlayerId,
      };
      return true;
    }

    if (pending.reason === 'blatant_thievery') {
      state.pendingAction = {
        type: 'select_hand_card',
        reason: 'blatant_thievery',
        sourcePlayerId,
        targetPlayerId,
      };
      return true;
    }

    return false;
  }

  static handleSelectStableCard(
    state: GameState,
    sourcePlayerId: string,
    cardId: string,
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'select_stable_card' ||
      pending.sourcePlayerId !== sourcePlayerId
    ) {
      return false;
    }

    const targetPlayer = state.players.find(
      (p) => p.id === pending.targetPlayerId,
    );
    if (!targetPlayer) return false;

    if (pending.reason === 'back_kick') {
      let cardIdx = targetPlayer.stable.findIndex((c) => c.id === cardId);
      let removedCard;

      if (cardIdx !== -1) {
        [removedCard] = targetPlayer.stable.splice(cardIdx, 1);
      } else {
        cardIdx = targetPlayer.upgrades.findIndex((c) => c.id === cardId);
        if (cardIdx !== -1) {
          [removedCard] = targetPlayer.upgrades.splice(cardIdx, 1);
        } else {
          cardIdx = targetPlayer.downgrades.findIndex((c) => c.id === cardId);
          if (cardIdx !== -1) {
            [removedCard] = targetPlayer.downgrades.splice(cardIdx, 1);
          }
        }
      }

      if (!removedCard) return false;

      // Usar CardMovement.returnToHand: si es Baby Unicorn se desvía a la Nursery
      CardMovement.returnToHand(state, targetPlayer, removedCard);

      state.pendingAction = {
        type: 'discard',
        reason: 'back_kick',
        playerId: targetPlayer.id,
        cardsToDiscard: 1,
      };

      return true;
    }

    return false;
  }

  static handleSelectHandCard(
    state: GameState,
    sourcePlayerId: string,
    cardId: string,
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'select_hand_card' ||
      pending.sourcePlayerId !== sourcePlayerId
    ) {
      return false;
    }

    const targetPlayer = state.players.find(
      (p) => p.id === pending.targetPlayerId,
    );
    const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);

    if (!targetPlayer || !sourcePlayer) return false;

    const cardIdx = targetPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return false;

    const [stolenCard] = targetPlayer.hand.splice(cardIdx, 1);
    sourcePlayer.hand.push(stolenCard);

    state.pendingAction = undefined;
    return true;
  }
}
