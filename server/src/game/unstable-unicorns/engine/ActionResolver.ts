import type { GameState } from '../../models/GameState.ts';
import { TurnManager } from '../../turn/TurnManager.ts';
import { TurnPhase } from '../../turn/TurnPhase.ts';
import { CardMovement } from './CardMovement.ts';
import type { Card } from '../../models/Card.ts';
import { enqueueDiscardAnimation } from '../../cardAnimations.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';
import { isImmuneToMagicDestruction } from '../../cards/effects/magicalKittencorn.ts';

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

    const reason = pending.reason;
    const isNecromancer = reason === 'necromancer_unicorn';

    for (const cardId of cardIds) {
      const idx = player.hand.findIndex((c) => c.uid === cardId);
      if (idx === -1) return false;
      if (isNecromancer && player.hand[idx].cardType !== 'unicorn') {
        return false;
      }
      const [discarded] = player.hand.splice(idx, 1);
      enqueueDiscardAnimation(state.roomCode, player.id, discarded);
      state.discard.push(discarded);
    }

    state.pendingAction = undefined;

    if (isNecromancer) {
      state.pendingAction = {
        type: 'select_discard_card',
        reason: 'necromancer_unicorn',
        playerId,
        cardType: 'unicorn',
      };
      return true;
    }

    if (reason === 'seductive_unicorn') {
      const canSteal = state.players.some(
        (p) =>
          p.id !== playerId &&
          p.stable.some((c) => c.cardType === 'unicorn'),
      );

      if (canSteal) {
        state.pendingAction = {
          type: 'select_stable_card',
          reason: 'seductive_unicorn',
          sourcePlayerId: playerId,
        };
      }
      return true;
    }

    if (
      reason === 'hand_limit' ||
      reason === 'good_deal' ||
      reason === 'change_of_luck'
    ) {
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

    if (pending.reason === 'annoying_flying_unicorn') {
      state.pendingAction = {
        type: 'discard',
        reason: 'annoying_flying_unicorn',
        playerId: targetPlayerId,
        cardsToDiscard: 1,
      };
      return true;
    }

    if (pending.reason === 'mermaid_unicorn') {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'mermaid_unicorn',
        sourcePlayerId,
        targetPlayerId,
      };
      return true;
    }

    if (pending.reason === 'play_downgrade') {
      const card = (pending as any).card;
      if (card) {
        targetPlayer.downgrades.push(card);
      }
      state.pendingAction = undefined;
      return true;
    }

    if (pending.reason === 'unfair_bargain') {
      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!sourcePlayer) return false;

      const sourceHand = sourcePlayer.hand;
      sourcePlayer.hand = targetPlayer.hand;
      targetPlayer.hand = sourceHand;

      state.pendingAction = undefined;
      return true;
    }

    if (pending.reason === 'unicorn_swap') {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'unicorn_swap_give',
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
    cardId: string | string[],
  ): boolean {
    const pending = state.pendingAction;
    if (!pending) return false;

    // Solo procesar acciones que correspondan al jugador correcto
    if (
      pending.type !== 'select_stable_card' &&
      pending.type !== 'two_for_one' &&
      pending.type !== 'glitter_tornado' &&
      pending.type !== 'alluring_narwhal' &&
      pending.type !== 'extremely_destructive_unicorn'
    ) {
      return false;
    }

    if (pending.type === 'two_for_one') {
      if (pending.sourcePlayerId !== sourcePlayerId) return false;

      if (pending.phase === 'sacrifice') {
        const player = state.players.find((p) => p.id === sourcePlayerId);
        if (!player) return false;

        const idx = player.stable.findIndex((c) => c.uid === cardId);
        if (idx === -1) return false;

        const [sacrificed] = player.stable.splice(idx, 1);
        CardMovement.destroyOrSacrifice(
          state,
          player,
          sacrificed,
          'sacrifice',
        );

        const nextPending = state.pendingAction;
        if (nextPending && nextPending !== pending) {
          // El sacrificio disparó un efecto onDestroyed interactivo (p. ej.
          // Stabby The Unicorn). Encolar la fase 'destroy' para reanudarla después.
          if (!state.pendingResume) state.pendingResume = [];
          state.pendingResume.push({
            type: 'two_for_one',
            sourcePlayerId,
            phase: 'destroy',
            remainingToDestroy: 2,
          });
        } else {
          state.pendingAction = {
            type: 'two_for_one',
            sourcePlayerId,
            phase: 'destroy',
            remainingToDestroy: 2,
          };
        }
        return true;
      }

      // phase 'destroy': puede destruir varias cartas a la vez
      const ids = Array.isArray(cardId) ? cardId : [cardId];

      let destroyedCount = 0;
      let interceptedOnce = false;

      for (const uid of ids) {
        const destroyedCard = state.players
          .flatMap((p) => p.stable)
          .find((c) => c.uid === uid);
        if (!destroyedCard) {
          interceptedOnce = true;
          continue;
        }

        const targetPlayer = state.players.find((p) =>
          p.stable.some((c) => c.uid === uid),
        );
        if (!targetPlayer) continue;

        if (isImmuneToMagicDestruction(destroyedCard.id)) {
          interceptedOnce = true;
          continue;
        }

        const idx = targetPlayer.stable.findIndex((c) => c.uid === uid);
        const [removed] = targetPlayer.stable.splice(idx, 1);
        const intercepted = CardMovement.destroyOrSacrifice(
          state,
          targetPlayer,
          removed,
        );
        if (intercepted) interceptedOnce = true;
        destroyedCount++;
      }

      const remaining = pending.remainingToDestroy - destroyedCount;
      if (remaining > 0 && !interceptedOnce) {
        state.pendingAction = {
          type: 'two_for_one',
          sourcePlayerId,
          phase: 'destroy',
          remainingToDestroy: remaining,
        };
      } else {
        state.pendingAction = undefined;
      }
      return true;
    }

    if (Array.isArray(cardId)) {
      return false;
    }

    // Unicorn Swap: mover un unicornio propio al establo del objetivo
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'unicorn_swap_give'
    ) {
      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      const targetPlayer = state.players.find(
        (p) => p.id === pending.targetPlayerId,
      );
      if (!sourcePlayer || !targetPlayer) return false;

      const idx = sourcePlayer.stable.findIndex((c) => c.uid === cardId);
      if (idx === -1) return false;

      const [moved] = sourcePlayer.stable.splice(idx, 1);
      CardMovement.enterStable(state, targetPlayer, moved);

      // Si el efecto on-enter de la carta entrante abrió su propio pendingAction
      // interactivo (p. ej. Seductive Unicorn), priorizarlo; el steal se reanuda después.
      const nextPending = state.pendingAction;
      if (
        nextPending &&
        nextPending !== pending &&
        !(
          nextPending.type === 'select_stable_card' &&
          'reason' in nextPending &&
          nextPending.reason === 'unicorn_swap_steal'
        )
      ) {
        if (!state.pendingResume) state.pendingResume = [];
        state.pendingResume.push({
          type: 'select_stable_card',
          reason: 'unicorn_swap_steal',
          sourcePlayerId,
          targetPlayerId: pending.targetPlayerId,
        });
      } else {
        state.pendingAction = {
          type: 'select_stable_card',
          reason: 'unicorn_swap_steal',
          sourcePlayerId,
          targetPlayerId: pending.targetPlayerId,
        };
      }
      return true;
    }

    // Unicorn Swap: robar un unicornio del establo del objetivo
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'unicorn_swap_steal'
    ) {
      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      const targetPlayer = state.players.find(
        (p) => p.id === pending.targetPlayerId,
      );
      if (!sourcePlayer || !targetPlayer) return false;

      const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
      if (idx === -1) return false;

      const [stolen] = targetPlayer.stable.splice(idx, 1);
      CardMovement.enterStable(state, sourcePlayer, stolen);

      // Si el on-enter del unicornio robado abrió su propio pendingAction interactivo,
      // dejarlo activo; de lo contrario cierra el flujo.
      if (
        state.pendingAction === pending ||
        !state.pendingAction
      ) {
        state.pendingAction = undefined;
      }

      return true;
    }

    // Caffeine Overload: sacrificar una carta del propio establo y robar 2
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'caffeine_overload'
    ) {
      const player = state.players.find((p) => p.id === sourcePlayerId);
      if (!player) return false;

      let sacrificed: Card | undefined;
      let zone: 'stable' | 'upgrades' | 'downgrades' | 'hand' | null = null;
      for (const z of ['hand', 'stable', 'upgrades', 'downgrades'] as const) {
        const i = player[z].findIndex((c) => c.uid === cardId);
        if (i !== -1) {
          sacrificed = player[z][i];
          player[z].splice(i, 1);
          zone = z;
          break;
        }
      }
      if (!sacrificed || !zone) return false;

      CardMovement.destroyOrSacrifice(state, player, sacrificed, 'sacrifice');

      for (let i = 0; i < 2; i++) {
        const drawn = state.deck.shift();
        if (drawn) {
          enqueueDrawAnimation(state.roomCode, player.id, drawn);
          player.hand.push(drawn);
        }
      }

      state.pendingAction = undefined;
      return true;
    }

    if (pending.type === 'extremely_destructive_unicorn') {
      if (
        !pending.remainingPlayerIds.includes(sourcePlayerId) ||
        pending.resolvedPlayerIds.includes(sourcePlayerId)
      ) {
        return false;
      }
    } else {
      const expectedPlayerId =
        pending.type === 'alluring_narwhal'
          ? pending.playerId
          : pending.sourcePlayerId;

      if (expectedPlayerId !== sourcePlayerId) {
        return false;
      }
    }

    // ──────────────────────────────────────────
    // Unicorn Poison: destruye una carta de Unicornio del establo rival
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'unicorn_poison'
    ) {
      const targetPlayer = state.players.find(
        (p) => p.id === pending.targetPlayerId,
      );
      if (!targetPlayer) return false;

      const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
      if (idx === -1) return false;

      const targetCard = targetPlayer.stable[idx];

      // Magical Kittencorn no puede ser destruido por Magic cards
      if (isImmuneToMagicDestruction(targetCard.id)) {
        return false;
      }

      // Si el oponente tiene Black Knight Unicorn en su establo y la carta elegida no es Black Knight Unicorn
      const hasBlackKnight = targetPlayer.stable.some(
        (c) => c.id === 'black_knight_unicorn',
      );
      if (hasBlackKnight && targetCard.id !== 'black_knight_unicorn') {
        state.pendingAction = {
          type: 'select_choice',
          reason: 'black_knight_unicorn',
          playerId: targetPlayer.id,
          title: '🛡️ Black Knight Unicorn',
          description: `¿Deseas sacrificar a Black Knight Unicorn para evitar que ${targetCard.name} sea destruido?`,
          options: [
            { value: 'yes', text: 'Sí, sacrificar Black Knight' },
            { value: 'no', text: `No, destruir ${targetCard.name}` },
          ],
          targetCardId: cardId,
          originalTargetPlayerId: targetPlayer.id,
        };
        return true;
      }

      const [destroyedCard] = targetPlayer.stable.splice(idx, 1);
      const intercepted = CardMovement.destroyOrSacrifice(
        state,
        targetPlayer,
        destroyedCard,
      );

      if (!intercepted) {
        state.pendingAction = undefined;
      }
      return true;
    }

    // ──────────────────────────────────────────
    // Chainsaw Unicorn: destruye un Upgrade o sacrifica un Downgrade
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'chainsaw_unicorn'
    ) {
      try {
        const {
          cardId: actualCardId,
          targetPlayerId,
          type,
        } = JSON.parse(cardId);
        const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
        if (!targetPlayer) return false;

        if (type === 'upgrade') {
          if (targetPlayerId === sourcePlayerId) return false;
          const idx = targetPlayer.upgrades.findIndex(
            (c) => c.uid === actualCardId,
          );
          if (idx !== -1) {
            const [card] = targetPlayer.upgrades.splice(idx, 1);
            CardMovement.destroyOrSacrifice(state, targetPlayer, card);
          }
        } else if (type === 'downgrade') {
          if (targetPlayerId !== sourcePlayerId) return false;
          const idx = targetPlayer.downgrades.findIndex(
            (c) => c.uid === actualCardId,
          );
          if (idx !== -1) {
            const [card] = targetPlayer.downgrades.splice(idx, 1);
            CardMovement.destroyOrSacrifice(
              state,
              targetPlayer,
              card,
              'sacrifice',
            );
          }
        }

        state.pendingAction = undefined;
        return true;
      } catch (e) {
        return false;
      }
    }

    // ──────────────────────────────────────────
    // Back Kick: regresa una carta del establo al rival (incluyendo mejoras/desmejoras)
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'back_kick'
    ) {
      const targetPlayer = state.players.find(
        (p) => p.id === pending.targetPlayerId,
      );
      if (!targetPlayer) return false;

      let removedCard;

      let idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
      if (idx !== -1) {
        [removedCard] = targetPlayer.stable.splice(idx, 1);
      } else {
        idx = targetPlayer.upgrades.findIndex((c) => c.uid === cardId);
        if (idx !== -1) {
          [removedCard] = targetPlayer.upgrades.splice(idx, 1);
        } else {
          idx = targetPlayer.downgrades.findIndex((c) => c.uid === cardId);
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
    // Mermaid Unicorn: devuelve una carta del establo al jugador elegido (sin descarte)
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'mermaid_unicorn'
    ) {
      const targetPlayer = state.players.find(
        (p) => p.id === pending.targetPlayerId,
      );
      if (!targetPlayer) return false;

      let removedCard;

      let idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
      if (idx !== -1) {
        [removedCard] = targetPlayer.stable.splice(idx, 1);
      } else {
        idx = targetPlayer.upgrades.findIndex((c) => c.uid === cardId);
        if (idx !== -1) {
          [removedCard] = targetPlayer.upgrades.splice(idx, 1);
        } else {
          idx = targetPlayer.downgrades.findIndex((c) => c.uid === cardId);
          if (idx !== -1) {
            [removedCard] = targetPlayer.downgrades.splice(idx, 1);
          }
        }
      }

      if (!removedCard) return false;

      CardMovement.returnToHand(state, targetPlayer, removedCard);

      state.pendingAction = undefined;
      return true;
    }

    // ──────────────────────────────────────────
    // Dark Angel Unicorn: sacrifica un Unicornio propio, luego trae uno del descarte
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'dark_angel_unicorn'
    ) {
      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!sourcePlayer) return false;

      const idx = sourcePlayer.stable.findIndex((c) => c.uid === cardId);
      if (idx === -1) return false;

      const [sacrificedCard] = sourcePlayer.stable.splice(idx, 1);
      const intercepted = CardMovement.destroyOrSacrifice(
        state,
        sourcePlayer,
        sacrificedCard,
        'sacrifice',
      );

      if (intercepted) return true;

      const nextPending = state.pendingAction;
      if (nextPending && nextPending !== pending) {
        // El sacrificio disparó un efecto onDestroyed interactivo (p. ej.
        // Stabby The Unicorn). Encolar el siguiente paso para reanudarlo después.
        if (!state.pendingResume) state.pendingResume = [];
        state.pendingResume.push({
          type: 'select_discard_card',
          reason: 'dark_angel_unicorn',
          playerId: sourcePlayerId,
          cardType: 'unicorn',
        });
      } else {
        state.pendingAction = {
          type: 'select_discard_card',
          reason: 'dark_angel_unicorn',
          playerId: sourcePlayerId,
          cardType: 'unicorn',
        };
      }
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

        cardIdx = p.upgrades.findIndex((c) => c.uid === cardId);
        if (cardIdx !== -1) {
          targetPlayer = p;
          [stolenCard] = p.upgrades.splice(cardIdx, 1);
          break;
        }

        cardIdx = p.stable.findIndex((c) => c.uid === cardId);
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

      const cardIdx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
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

    // ──────────────────────────────────────────
    // Extremely Destructive Unicorn: cada jugador sacrifica un unicornio
    // ──────────────────────────────────────────
    if (pending.type === 'extremely_destructive_unicorn') {
      const targetPlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!targetPlayer) return false;

      if (!pending.remainingPlayerIds.includes(sourcePlayerId)) {
        return false;
      }

      if (pending.resolvedPlayerIds.includes(sourcePlayerId)) {
        return false;
      }

      const cardIdx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
      if (cardIdx === -1) return false;

      const card = targetPlayer.stable[cardIdx];
      if (card.cardType !== 'unicorn') return false;

      const [sacrificed] = targetPlayer.stable.splice(cardIdx, 1);
      const intercepted = CardMovement.destroyOrSacrifice(
        state,
        targetPlayer,
        sacrificed,
        'sacrifice',
      );

      if (intercepted) return true;

      const resolvedPlayerIds = [...pending.resolvedPlayerIds, sourcePlayerId];
      const onDestroyedOpened = state.pendingAction && state.pendingAction !== pending;

      if (resolvedPlayerIds.length >= pending.remainingPlayerIds.length) {
        // Último jugador: cerrar el flujo. Si el sacrificio abrió un efecto
        // onDestroyed interactivo (p. ej. Stabby), mantenerlo activo.
        if (!onDestroyedOpened) {
          state.pendingAction = undefined;
        }
      } else {
        const nextStep = {
          ...pending,
          type: 'extremely_destructive_unicorn',
          remainingPlayerIds: pending.remainingPlayerIds,
          resolvedPlayerIds,
        } as typeof pending;
        if (onDestroyedOpened) {
          if (!state.pendingResume) state.pendingResume = [];
          state.pendingResume.push(nextStep);
        } else {
          state.pendingAction = nextStep;
        }
      }

      return true;
    }

    // ──────────────────────────────────────────
    // Rhinocorn: destruye un unicornio de otro jugador y pasa a ACTION sin acciones
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'rhinocorn'
    ) {
      for (const targetPlayer of state.players) {
        if (targetPlayer.id === sourcePlayerId) continue;

        const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
        if (idx === -1) continue;

        const card = targetPlayer.stable[idx];
        if (card.cardType !== 'unicorn') return false;

        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        const intercepted = CardMovement.destroyOrSacrifice(
          state,
          targetPlayer,
          destroyed,
        );

        // Rhinocorn avanza el turno igual si la destrucción fue interceptada
        // (p. ej. protegida por Rainbow Aura), para no dejar el juego colgado.
        state.pendingAction = undefined;

        // Pasa a la fase de acción pero sin acciones, obligando a "Terminar Turno"
        if (state.phase === TurnPhase.BEGINNING) {
          state.phase = TurnPhase.ACTION;
          state.actionUsed = true;
        }

        return true;
      }

      return false;
    }

    // ──────────────────────────────────────────
    // Shark With A Horn: destruye un unicornio (el propio se sacrificó antes)
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'shark_with_a_horn'
    ) {
      for (const targetPlayer of state.players) {
        const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
        if (idx === -1) continue;

        const card = targetPlayer.stable[idx];
        if (card.cardType !== 'unicorn') return false;

        const prevReason = pending.reason;
        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        CardMovement.destroyOrSacrifice(state, targetPlayer, destroyed);

        // Si la carta destruida disparó su propio efecto (p. ej. Stabby The
        // Unicorn), mantener su pendingAction en lugar de limpiarlo.
        if (
          !state.pendingAction ||
          !('reason' in state.pendingAction) ||
          state.pendingAction.reason === prevReason
        ) {
          state.pendingAction = undefined;
        }

        if (state.phase === TurnPhase.BEGINNING) {
          state.phase = TurnPhase.ACTION;
          state.actionUsed = true;
        }

        return true;
      }

      return false;
    }

    // ──────────────────────────────────────────
    // Seductive Unicorn: roba un unicornio de otro jugador a tu establo
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'seductive_unicorn'
    ) {
      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!sourcePlayer) return false;

      for (const targetPlayer of state.players) {
        if (targetPlayer.id === sourcePlayerId) continue;

        const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
        if (idx === -1) continue;

        const card = targetPlayer.stable[idx];
        if (card.cardType !== 'unicorn') return false;

        const prevReason = pending.reason;
        const [stolen] = targetPlayer.stable.splice(idx, 1);
        const entered = CardMovement.enterStable(state, sourcePlayer, stolen);

        if (!entered) {
          targetPlayer.stable.push(stolen);
          return false;
        }

        // Si la carta robada disparó su propio efecto al entrar al establo,
        // mantener su pendingAction en lugar de limpiarlo.
        if (
          !state.pendingAction ||
          !('reason' in state.pendingAction) ||
          state.pendingAction.reason === prevReason
        ) {
          state.pendingAction = undefined;
        }

        return true;
      }

      return false;
    }

    // ──────────────────────────────────────────
    // Stabby The Unicorn: destruye un unicornio
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'stabby_the_unicorn'
    ) {
      for (const targetPlayer of state.players) {
        const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
        if (idx === -1) continue;

        const card = targetPlayer.stable[idx];
        if (card.cardType !== 'unicorn') return false;

        const prevReason = pending.reason;
        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        CardMovement.destroyOrSacrifice(state, targetPlayer, destroyed);

        if (
          !state.pendingAction ||
          !('reason' in state.pendingAction) ||
          state.pendingAction.reason === prevReason
        ) {
          state.pendingAction = undefined;
        }
        return true;
      }

      return false;
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

    const cardIdx = targetPlayer.hand.findIndex((c) => c.uid === cardId);
    if (cardIdx === -1) return false;

    const [stolenCard] = targetPlayer.hand.splice(cardIdx, 1);
    sourcePlayer.hand.push(stolenCard);

    state.pendingAction = undefined;
    return true;
  }

  static handleSelectOwnHandCardToStable(
    state: GameState,
    playerId: string,
    cardId: string,
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'select_own_hand_card' ||
      pending.playerId !== playerId
    ) {
      return false;
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return false;

    const cardIdx = player.hand.findIndex((c) => c.uid === cardId);
    if (cardIdx === -1) return false;

    const card = player.hand[cardIdx];
    if (card.cardType !== 'unicorn' || card.unicornClass !== 'basic') {
      return false;
    }

    const [moved] = player.hand.splice(cardIdx, 1);
    const entered = CardMovement.enterStable(state, player, moved);

    if (!entered) {
      player.hand.push(moved);
      return false;
    }

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
    const idx = player.hand.findIndex((c) => c.uid === cardId);
    if (idx === -1) return false;

    const [discarded] = player.hand.splice(idx, 1);
    enqueueDiscardAnimation(state.roomCode, player.id, discarded);
    state.discard.push(discarded);

    const [_, ...rest] = pending.remainingPlayerIds;
    this.advanceMysticalVortex(state, rest);
    return true;
  }

  static handleLlamacornDiscard(
    state: GameState,
    playerId: string,
    cardIds: string[],
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'llamacorn' ||
      !pending.remainingPlayerIds.includes(playerId)
    ) {
      return false;
    }

    if (cardIds.length !== 1) {
      return false;
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return false;

    const cardId = cardIds[0];
    const idx = player.hand.findIndex((c) => c.uid === cardId);
    if (idx === -1) return false;

    const [discarded] = player.hand.splice(idx, 1);
    enqueueDiscardAnimation(state.roomCode, player.id, discarded);
    state.discard.push(discarded);

    const remainingPlayerIds = pending.remainingPlayerIds.filter(
      (id) => id !== playerId,
    );

    if (remainingPlayerIds.length > 0) {
      state.pendingAction = {
        type: 'llamacorn',
        remainingPlayerIds,
        resolvedPlayerIds: [...pending.resolvedPlayerIds, playerId],
      };
    } else {
      state.pendingAction = undefined;
    }

    return true;
  }
}
