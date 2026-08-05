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

    if (pending.reason === 'americorn') {
      state.pendingAction = {
        type: 'select_hand_card',
        reason: 'americorn',
        sourcePlayerId,
        targetPlayerId,
      };
      return true;
    }

    if (pending.reason === 'unicorn_poison') {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'unicorn_poison',
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
    if (!pending) return false;

    // Solo procesar acciones que correspondan al jugador correcto
    if (
      pending.type !== 'select_stable_card' &&
      pending.type !== 'glitter_tornado' &&
      pending.type !== 'alluring_narwhal'
    ) {
      return false;
    }

    const expectedPlayerId =
      pending.type === 'alluring_narwhal'
        ? pending.playerId
        : pending.sourcePlayerId;

    if (expectedPlayerId !== sourcePlayerId) {
      return false;
    }

    // ──────────────────────────────────────────
    // Unicorn Poison: destruye una carta de Unicornio del establo rival
    // ──────────────────────────────────────────
    if (pending.type === 'select_stable_card' && pending.reason === 'unicorn_poison') {
      const targetPlayer = state.players.find((p) => p.id === pending.targetPlayerId);
      if (!targetPlayer) return false;

      const idx = targetPlayer.stable.findIndex((c) => c.id === cardId);
      if (idx === -1) return false;

      const [destroyedCard] = targetPlayer.stable.splice(idx, 1);
      CardMovement.destroyOrSacrifice(state, targetPlayer, destroyedCard);

      state.pendingAction = undefined;
      return true;
    }

    // ──────────────────────────────────────────
    // Back Kick: regresa una carta del establo al rival (incluyendo mejoras/desmejoras)
    // ──────────────────────────────────────────
    if (pending.type === 'select_stable_card' && pending.reason === 'back_kick') {
      const targetPlayer = state.players.find((p) => p.id === pending.targetPlayerId);
      if (!targetPlayer) return false;

      let removedCard;

      let idx = targetPlayer.stable.findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        [removedCard] = targetPlayer.stable.splice(idx, 1);
      } else {
        idx = targetPlayer.upgrades.findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          [removedCard] = targetPlayer.upgrades.splice(idx, 1);
        } else {
          idx = targetPlayer.downgrades.findIndex((c) => c.id === cardId);
          if (idx !== -1) {
            [removedCard] = targetPlayer.downgrades.splice(idx, 1);
          }
        }
      }

      if (!removedCard) return false;

      // Si es Baby Unicorn se desvía a la Nursery
      CardMovement.returnToHand(state, targetPlayer, removedCard);

      state.pendingAction = {
        type: 'discard',
        reason: 'back_kick',
        playerId: targetPlayer.id,
        cardsToDiscard: 1,
      };
      return true;
    }

    // ──────────────────────────────────────────
    // Alluring Narwhal: robar una carta de Mejora de otro jugador a tu establo
    // ──────────────────────────────────────────
    if (pending.type === 'alluring_narwhal') {
      let targetPlayer = null;
      let cardIdx = -1;
      let stolenCard;

      for (const p of state.players) {
        if (p.id === sourcePlayerId) continue;
        
        cardIdx = p.upgrades.findIndex((c) => c.id === cardId);
        if (cardIdx !== -1) {
          targetPlayer = p;
          [stolenCard] = p.upgrades.splice(cardIdx, 1);
          break;
        }

        cardIdx = p.stable.findIndex((c) => c.id === cardId);
        if (cardIdx !== -1) {
          targetPlayer = p;
          [stolenCard] = p.stable.splice(cardIdx, 1);
          break;
        }
      }

      if (!stolenCard) return false;

      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!sourcePlayer) return false;

      sourcePlayer.upgrades.push(stolenCard);
      state.pendingAction = undefined;
      return true;
    }

    // ──────────────────────────────────────────
    // Glitter Tornado: el jugador activo elige una carta por cada establo en la cola
    // ──────────────────────────────────────────
    if (pending.type === 'glitter_tornado') {
      const [currentTargetId, ...rest] = pending.remainingPlayerIds;

      const targetPlayer = state.players.find((p) => p.id === currentTargetId);
      if (!targetPlayer) return false;

      const cardIdx = targetPlayer.stable.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return false;

      const [card] = targetPlayer.stable.splice(cardIdx, 1);

      // Baby Unicorns van a la Nursery; las demás cartas vuelven a la mano
      CardMovement.returnToHand(state, targetPlayer, card);

      if (rest.length === 0) {
        // Todos los establos procesados → limpiar acción pendiente
        state.pendingAction = undefined;
      } else {
        // Avanzar a la siguiente persona en la cola
        state.pendingAction = {
          type: 'glitter_tornado',
          sourcePlayerId,
          remainingPlayerIds: rest,
        };
      }
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

    const targetPlayer = state.players.find((p) => p.id === pending.targetPlayerId);
    const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);

    if (!targetPlayer || !sourcePlayer) return false;

    const cardIdx = targetPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return false;

    const [stolenCard] = targetPlayer.hand.splice(cardIdx, 1);
    sourcePlayer.hand.push(stolenCard);

    state.pendingAction = undefined;
    return true;
  }

  static advanceMysticalVortex(state: GameState, remaining: string[]) {
    while (remaining.length > 0) {
      const nextPlayerId = remaining[0];
      const player = state.players.find((p) => p.id === nextPlayerId);
      if (player && player.hand.length > 0) {
        state.pendingAction = {
          type: 'mystical_vortex',
          remainingPlayerIds: remaining,
        };
        return;
      }
      remaining.shift();
    }

    // Si nadie queda en la cola, revuelve el descarte con el deck
    state.deck.push(...state.discard);
    state.discard = [];

    // Shuffle (Fisher-Yates)
    for (let i = state.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }

    state.pendingAction = undefined;
  }

  static handleMysticalVortexDiscard(
    state: GameState,
    playerId: string,
    cardIds: string[],
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'mystical_vortex' ||
      pending.remainingPlayerIds[0] !== playerId
    ) {
      return false;
    }

    if (cardIds.length !== 1) {
      return false;
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return false;

    const cardId = cardIds[0];
    const idx = player.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) return false;

    const [discarded] = player.hand.splice(idx, 1);
    state.discard.push(discarded);

    const [_, ...rest] = pending.remainingPlayerIds;
    this.advanceMysticalVortex(state, rest);
    return true;
  }
}
