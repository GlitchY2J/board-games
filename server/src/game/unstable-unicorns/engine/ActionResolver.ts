import type { GameState } from '../../models/GameState.ts';
import { TurnManager } from '../../turn/TurnManager.ts';
import { TurnPhase } from '../../turn/TurnPhase.ts';
import { CardMovement } from './CardMovement.ts';
import { EffectStack } from './EffectStack.ts';
import type { Card } from '../../models/Card.ts';
import { enqueueDiscardAnimation } from '../../cardAnimations.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';
import { isImmuneToMagicDestruction } from '../../cards/effects/magicalKittencorn.ts';
import { isPandamoniumProtected } from '../../cards/effects/pandamonium.ts';
import { maybeTriggerBarbedWireLeave } from '../../cards/effects/barbedWire.ts';
import { drawForSadisticRitual } from '../../cards/effects/sadisticRitual.ts';
import { addLog } from '../../../sockets/gameLog.ts';
import { enqueueShuffleAnimation } from '../../cardAnimations.ts';
import { isImmuneToUnicornOrUpgradeDestruction } from '../../cards/effects/theTiniestUnicorn.ts';
import { isImmuneToDestruction } from '../../cards/effects/theTiniestUnicorn.ts';
import { hasBlindingLight } from '../../cards/effects/blindingLight.ts';
import { nextUnicornOfWarChoice } from '../../cards/effects/unicornOfWar.ts';
import {
  drawRainbowPrincessCards,
  nextRainbowPrincessChoice,
} from '../../cards/effects/unicornRainbowPrincess.ts';
import { nextSprayBottleChoice } from '../../cards/effects/sprayBottleOfYouth.ts';

export class ActionResolver {
  static handleSelectPlayers(
    state: GameState,
    sourcePlayerId: string,
    playerIds: string[],
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'select_players' ||
      pending.sourcePlayerId !== sourcePlayerId ||
      new Set(playerIds).size !== playerIds.length ||
      playerIds.some((id) => !pending.playerIds.includes(id))
    ) {
      return false;
    }

    const player = state.players.find(
      (candidate) => candidate.id === sourcePlayerId,
    );
    if (!player) return false;

    drawRainbowPrincessCards(state, player, playerIds.length);
    state.pendingAction = nextRainbowPrincessChoice(
      state,
      sourcePlayerId,
      playerIds,
    );
    return true;
  }

  static handlePestilenceDiscardCount(
    state: GameState,
    playerId: string,
    cardIds: string[],
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'select_discard_count' ||
      pending.playerId !== playerId ||
      cardIds.length > pending.maxCards
    ) {
      return false;
    }

    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player || new Set(cardIds).size !== cardIds.length) return false;

    for (const cardId of cardIds) {
      const idx = player.hand.findIndex((card) => card.uid === cardId);
      if (idx === -1) return false;
    }

    for (const cardId of cardIds) {
      const idx = player.hand.findIndex((card) => card.uid === cardId);
      const [discarded] = player.hand.splice(idx, 1);
      enqueueDiscardAnimation(state.roomCode, player.id, discarded);
      state.discard.push(discarded);
    }

    const remainingPlayerIds = state.players
      .filter(
        (candidate) => candidate.id !== playerId && candidate.hand.length > 0,
      )
      .map((candidate) => candidate.id);

    state.pendingAction = undefined;
    ActionResolver.advancePestilence(
      state,
      playerId,
      remainingPlayerIds,
      cardIds.length,
    );
    return true;
  }

  static handlePestilenceDiscard(
    state: GameState,
    playerId: string,
    cardIds: string[],
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'pestilence_discard' ||
      pending.playerId !== playerId ||
      cardIds.length !== pending.cardsToDiscard
    ) {
      return false;
    }

    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player || new Set(cardIds).size !== cardIds.length) return false;

    for (const cardId of cardIds) {
      const idx = player.hand.findIndex((card) => card.uid === cardId);
      if (idx === -1) return false;
    }

    for (const cardId of cardIds) {
      const idx = player.hand.findIndex((card) => card.uid === cardId);
      const [discarded] = player.hand.splice(idx, 1);
      enqueueDiscardAnimation(state.roomCode, player.id, discarded);
      state.discard.push(discarded);
    }

    ActionResolver.advancePestilence(
      state,
      pending.sourcePlayerId,
      pending.remainingPlayerIds.filter((id) => id !== playerId),
      pending.cardsToDiscard,
    );
    return true;
  }

  private static advancePestilence(
    state: GameState,
    sourcePlayerId: string,
    remainingPlayerIds: string[],
    cardsToDiscard: number,
  ): void {
    while (remainingPlayerIds.length > 0) {
      const playerId = remainingPlayerIds[0];
      const player = state.players.find(
        (candidate) => candidate.id === playerId,
      );
      const amount = Math.min(cardsToDiscard, player?.hand.length ?? 0);
      remainingPlayerIds = remainingPlayerIds.slice(1);

      if (amount > 0) {
        state.pendingAction = {
          type: 'pestilence_discard',
          reason: 'unicorn_of_pestilence',
          sourcePlayerId,
          playerId,
          remainingPlayerIds,
          cardsToDiscard: amount,
        };
        return;
      }
    }

    state.pendingAction = undefined;
  }

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

    if (reason === 'claw_machine') {
      const drawn = state.deck.shift();
      if (drawn) {
        enqueueDrawAnimation(state.roomCode, player.id, drawn);
        player.hand.push(drawn);
      }
      addLog(
        state,
        `${player.name} descartó una carta y robó otra por Claw Machine`,
        { playerId },
      );
      return true;
    }

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
          p.id !== playerId && p.stable.some((c) => c.cardType === 'unicorn'),
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

    // Rainbow Lasso: tras descartar 3 cartas, robar un unicornio de otro jugador.
    if (reason === 'rainbow_lasso') {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'rainbow_lasso_steal',
        sourcePlayerId: playerId,
      };
      return true;
    }

    if (reason === 'extremely_fertile_unicorn') {
      if (
        state.nursery.some(
          (card) => card.cardType === 'unicorn' && card.unicornClass === 'baby',
        )
      ) {
        state.pendingAction = {
          type: 'select_nursery_card',
          reason: 'extremely_fertile_unicorn',
          playerId,
        };
      }
      return true;
    }

    // Stable Artillery: tras descartar 2 cartas, destruir un unicornio.
    if (reason === 'stable_artillery') {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'stable_artillery_destroy',
        sourcePlayerId: playerId,
      };
      return true;
    }

    if (reason === 'hand_limit') {
      TurnManager.nextPhase(state);
    }

    // Change of Luck grants an extra turn, but Double Dutch must still allow
    // the remaining action play before the current turn ends.
    if (
      reason === 'change_of_luck' &&
      state.actionPlaysRemaining === undefined
    ) {
      TurnManager.nextPhase(state);
    }

    // Good Deal can be the first card played with Double Dutch. In that case
    // the discard resolves the card effect, but the player still has one play
    // remaining in the action phase.
    if (
      reason === 'good_deal' &&
      state.actionPlaysRemaining === undefined
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

    if (pending.reason === 'a_cute_attack') {
      const target = state.players.find((p) => p.id === targetPlayerId);
      if (!target || target.id === sourcePlayerId) return false;
      const available = target.stable.filter(
        (card) =>
          card.cardType === 'unicorn' &&
          !isImmuneToDestruction(card.id) &&
          !isPandamoniumProtected(target, card),
      );
      if (available.length === 0) return false;
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'a_cute_attack_destroy',
        sourcePlayerId,
        targetPlayerId,
        remainingToDestroy: Math.min(3, available.length),
      };
      return true;
    }

    if (pending.reason === 'unicorn_nap') {
      if (targetPlayerId === sourcePlayerId) return false;
      const target = state.players.find((p) => p.id === targetPlayerId);
      if (!target) return false;
      target.skipTurns = (target.skipTurns ?? 0) + 1;
      state.pendingAction = undefined;
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

    if (pending.reason === 're_target_source') {
      const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
      if (
        !targetPlayer ||
        (targetPlayer.upgrades.length === 0 &&
          targetPlayer.downgrades.length === 0)
      ) {
        return false;
      }

      // Debe existir al menos un destino válido (distinto del lanzador y del
      // origen). En partidas de 2 jugadores, solo se puede mover desde el
      // propio establo.
      const hasValidDest = state.players.some(
        (p) => p.id !== sourcePlayerId && p.id !== targetPlayerId,
      );
      if (!hasValidDest) return false;

      state.pendingAction = {
        type: 'select_stable_card',
        reason: 're_target_card',
        sourcePlayerId,
        targetPlayerId,
      };
      return true;
    }

    if (pending.reason === 're_target_destination') {
      const card = pending.card;
      const destPlayer = state.players.find((p) => p.id === targetPlayerId);
      if (!destPlayer || !card) return false;

      // No puede moverse al propio establo del lanzador ni al mismo jugador
      // de origen.
      if (
        targetPlayerId === sourcePlayerId ||
        targetPlayerId === pending.fromPlayerId
      ) {
        return false;
      }

      if (card.cardType === 'upgrade') {
        destPlayer.upgrades.push(card);
      } else if (card.cardType === 'downgrade') {
        destPlayer.downgrades.push(card);
      } else {
        return false;
      }

      const caster = state.players.find((p) => p.id === sourcePlayerId);
      const fromPlayer = state.players.find(
        (p) => p.id === pending.fromPlayerId,
      );

      addLog(
        state,
        `${caster?.name ?? 'Alguien'} usó Re-Target: movió "${card.name}" de ${fromPlayer?.name ?? 'otro jugador'} a ${destPlayer.name}`,
        { playerId: sourcePlayerId },
      );

      state.pendingAction = undefined;
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
      pending.type !== 'extremely_destructive_unicorn' &&
      pending.type !== 'adorable_flying_unicorn' &&
      pending.type !== 'cotton_candy_unicorn' &&
      pending.type !== 'plague_of_death'
    ) {
      return false;
    }

    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'unicorns_of_the_apocalypse_sacrifice'
    ) {
      if (pending.sourcePlayerId !== sourcePlayerId) return false;
      const ids = Array.isArray(cardId) ? cardId : [cardId];
      const player = state.players.find((p) => p.id === sourcePlayerId);
      if (!player || ids.length === 0 || new Set(ids).size !== ids.length) return false;

      const selected = ids.map((uid) => player.stable.find((card) => card.uid === uid));
      if (selected.some((card) => !card || card.cardType !== 'unicorn')) return false;
      const sacrificeValue = selected.reduce(
        (total, card) => total + (card?.id === 'ginormous_unicorn' ? 2 : 1),
        0,
      );
      if (sacrificeValue !== 4) return false;

      for (const uid of ids) {
        const index = player.stable.findIndex((card) => card.uid === uid);
        const [sacrificed] = player.stable.splice(index, 1);
        CardMovement.destroyOrSacrifice(state, player, sacrificed, 'sacrifice');
      }

      state.pendingAction = {
        type: 'select_deck_card',
        reason: 'unicorns_of_the_apocalypse',
        playerId: sourcePlayerId,
        candidates: state.deck.filter((card) => card.cardType === 'unicorn'),
        requiredCards: 4,
      };
      return true;
    }

    if (pending.type === 'plague_of_death') {
      if (pending.sourcePlayerId !== sourcePlayerId) return false;
      const ids = Array.isArray(cardId) ? cardId : [cardId];
      if (pending.phase === 'sacrifice') {
        const player = state.players.find((p) => p.id === sourcePlayerId);
        if (!player || new Set(ids).size !== ids.length) return false;
        const zones = ['stable', 'upgrades', 'downgrades'] as const;
        const selected = ids.map((uid) => {
          for (const zone of zones) {
            const index = player[zone].findIndex((card) => card.uid === uid);
            if (index !== -1) return { zone, index };
          }
          return undefined;
        });
        if (selected.some((entry) => !entry)) return false;

        for (const uid of ids) {
          for (const zone of zones) {
            const index = player[zone].findIndex((card) => card.uid === uid);
            if (index !== -1) {
              const [sacrificed] = player[zone].splice(index, 1);
              CardMovement.destroyOrSacrifice(
                state,
                player,
                sacrificed,
                'sacrifice',
              );
              break;
            }
          }
        }

        if (ids.length === 0) {
          state.pendingAction = undefined;
        } else {
          state.pendingAction = {
            type: 'plague_of_death',
            sourcePlayerId,
            phase: 'destroy',
            cardsToDestroy: ids.length,
          };
        }
        return true;
      }

      if (
        ids.length !== pending.cardsToDestroy ||
        new Set(ids).size !== ids.length
      ) {
        return false;
      }

      const zones = ['stable', 'upgrades', 'downgrades'] as const;
      const located = ids.map((uid) => {
        for (const player of state.players) {
          for (const zone of zones) {
            const index = player[zone].findIndex((card) => card.uid === uid);
            if (index !== -1) return { player, zone, index };
          }
        }
        return undefined;
      });
      if (
        located.some(
          (entry) =>
            !entry ||
            isImmuneToDestruction(entry.player[entry.zone][entry.index].id) ||
            isPandamoniumProtected(
              entry.player,
              entry.player[entry.zone][entry.index],
            ),
        )
      ) {
        return false;
      }

      for (const uid of ids) {
        for (const player of state.players) {
          for (const zone of zones) {
            const index = player[zone].findIndex((card) => card.uid === uid);
            if (index !== -1) {
              const [destroyed] = player[zone].splice(index, 1);
              CardMovement.destroyOrSacrifice(state, player, destroyed, 'destroy');
              break;
            }
          }
        }
      }
      state.pendingAction = undefined;
      return true;
    }

    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'a_cute_attack_destroy'
    ) {
      const ids = Array.isArray(cardId) ? cardId : [cardId];
      const target = state.players.find((p) => p.id === pending.targetPlayerId);
      const count = pending.remainingToDestroy ?? 0;
      if (!target || ids.length !== count || new Set(ids).size !== ids.length) {
        return false;
      }

      const selected = ids.map((uid) =>
        target.stable.find((card) => card.uid === uid),
      );
      if (
        selected.some(
          (card) =>
            !card ||
            card.cardType !== 'unicorn' ||
            isImmuneToDestruction(card.id) ||
            isPandamoniumProtected(target, card),
        )
      ) {
        return false;
      }

      for (const uid of ids) {
        const index = target.stable.findIndex((card) => card.uid === uid);
        const [destroyed] = target.stable.splice(index, 1);
        CardMovement.destroyOrSacrifice(state, target, destroyed, 'destroy');
      }

      const babyIndexes = state.nursery
        .map((card, index) =>
          card.cardType === 'unicorn' && card.unicornClass === 'baby'
            ? index
            : -1,
        )
        .filter((index) => index !== -1)
        .slice(0, count)
        .reverse();
      for (const index of babyIndexes) {
        const [baby] = state.nursery.splice(index, 1);
        CardMovement.enterStable(state, target, baby);
      }

      state.pendingAction = undefined;
      return true;
    }

    if (
      pending.type === 'select_stable_card' &&
      (pending.reason === 'fire_and_brimstone_destroy' ||
        pending.reason === 'overpopulation_destroy' ||
        pending.reason === 'llamapocalypse_destroy' ||
        pending.reason === 'heavenly_smite_destroy' ||
        pending.reason === 'storm_of_cuteness_destroy' ||
        pending.reason === 'zombie_apocalypse_destroy' ||
         pending.reason === 'ultimate_destruction_destroy' ||
         pending.reason === 'spray_bottle_of_youth_destroy')
    ) {
      if (pending.reason === 'spray_bottle_of_youth_destroy' && pending.sourcePlayerId !== sourcePlayerId) {
        return false;
      }

      const target = state.players.find((p) => p.id === pending.targetPlayerId);
      if (!target) return false;
      const index = target.stable.findIndex((card) => card.uid === cardId);
      if (index === -1) return false;
      const card = target.stable[index];
      if (
        card.cardType !== 'unicorn' ||
        isImmuneToDestruction(card.id) ||
        isPandamoniumProtected(target, card)
      ) {
        return false;
      }

      const [removed] = target.stable.splice(index, 1);
      CardMovement.destroyOrSacrifice(state, target, removed, 'destroy');

      const remaining = (pending.remainingPlayerIds ?? []).filter(
        (id) => id !== target.id,
      );
      const nextTarget = remaining.find((id) => {
        const player = state.players.find((candidate) => candidate.id === id);
        return player?.stable.some(
          (stableCard) =>
            stableCard.cardType === 'unicorn' &&
            !isImmuneToDestruction(stableCard.id) &&
            !isPandamoniumProtected(player, stableCard),
        );
      });

      if (nextTarget) {
        state.pendingAction = {
          ...pending,
          targetPlayerId: nextTarget,
          remainingPlayerIds: remaining,
        };
        return true;
      }

      const searchedCardId =
        pending.reason === 'overpopulation_destroy'
          ? 'extremely_fertile_unicorn'
          : pending.reason === 'llamapocalypse_destroy'
            ? 'llamacorn'
            : pending.reason === 'heavenly_smite_destroy'
              ? 'angel_unicorn'
              : pending.reason === 'storm_of_cuteness_destroy'
              ? 'magical_kittencorn'
                : pending.reason === 'zombie_apocalypse_destroy'
                  ? 'zombie_unicorn'
                  : pending.reason === 'ultimate_destruction_destroy'
                    ? 'extremely_destructive_unicorn'
                    : 'unicorn_phoenix';
      if (pending.reason === 'spray_bottle_of_youth_destroy') {
        state.pendingAction = nextSprayBottleChoice(
          state,
          pending.sourcePlayerId,
          pending.sprayPlayerIds ?? [],
        );
        return true;
      }

      const phoenixIndex = state.deck.findIndex(
        (deckCard) => deckCard.id === searchedCardId,
      );
      if (phoenixIndex !== -1) {
        const [searchedCard] = state.deck.splice(phoenixIndex, 1);
        const source = state.players.find((p) => p.id === pending.sourcePlayerId);
        if (source) CardMovement.enterStable(state, source, searchedCard);
      }

      for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
      }
      enqueueShuffleAnimation(state.roomCode, pending.sourcePlayerId);
      state.pendingAction = undefined;
      return true;
    }

    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'unicorn_of_war_destroy'
    ) {
      const targetPlayer = state.players.find(
        (player) =>
          player.id !== sourcePlayerId &&
          player.stable.some((card) => card.uid === cardId),
      );
      if (!targetPlayer) return false;

      const idx = targetPlayer.stable.findIndex((card) => card.uid === cardId);
      const target = targetPlayer.stable[idx];
      if (
        !target ||
        target.cardType !== 'unicorn' ||
        isPandamoniumProtected(targetPlayer, target) ||
        isImmuneToDestruction(target.id)
      ) {
        return false;
      }

      const next = nextUnicornOfWarChoice(
        state,
        pending.sourcePlayerId,
        pending.remainingPlayerIds ?? [],
      );

      if (CardMovement.maybeBlackKnightIntercept(state, targetPlayer, target)) {
        if (next) {
          if (!state.pendingResume) state.pendingResume = [];
          state.pendingResume.push(next);
        }
        return true;
      }

      const [destroyed] = targetPlayer.stable.splice(idx, 1);
      const previousPending = state.pendingAction;
      CardMovement.destroyOrSacrifice(
        state,
        targetPlayer,
        destroyed,
        'destroy',
      );

      if (state.pendingAction !== previousPending) {
        if (next) {
          if (!state.pendingResume) state.pendingResume = [];
          state.pendingResume.push(next);
        }
      } else {
        state.pendingAction = next;
      }
      return true;
    }

    if (pending.type === 'two_for_one') {
      if (pending.sourcePlayerId !== sourcePlayerId) return false;

      if (pending.phase === 'sacrifice') {
        const player = state.players.find((p) => p.id === sourcePlayerId);
        if (!player) return false;

        // El sacrificio puede ser cualquier carta del establo: unicornio,
        // upgrade o downgrade.
        let sacrificed: Card | undefined;
        let zone: 'stable' | 'upgrades' | 'downgrades' | null = null;
        for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
          const i = player[z].findIndex((c) => c.uid === cardId);
          if (i !== -1) {
            sacrificed = player[z][i];
            zone = z;
            break;
          }
        }
        if (!sacrificed || !zone) return false;

        const idx = player[zone].findIndex((c) => c.uid === cardId);
        const [removed] = player[zone].splice(idx, 1);
        CardMovement.destroyOrSacrifice(
          state,
          player,
          removed,
          'sacrifice',
          false,
        );

        // Resolución LIFO centralizada: si el sacrificio disparó un efecto
        // onDestroyed interactivo (p. ej. Stabby The Unicorn), la fase 'destroy'
        // se suspende en la pila y se reanuda después del efecto hijo.
        EffectStack.advance(state, pending, {
          type: 'two_for_one',
          sourcePlayerId,
          phase: 'destroy',
          remainingToDestroy: 2,
        });
        return true;
      }

      // phase 'destroy': puede destruir varias cartas a la vez
      const ids = Array.isArray(cardId) ? cardId : [cardId];

      let destroyedCount = 0;
      let openedInteractive = false;

      for (const uid of ids) {
        let destroyedCard: Card | undefined;
        let targetPlayer: (typeof state.players)[number] | undefined;
        let zone: 'stable' | 'upgrades' | 'downgrades' | null = null;

        for (const p of state.players) {
          for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
            const i = p[z].findIndex((c) => c.uid === uid);
            if (i !== -1) {
              destroyedCard = p[z][i];
              targetPlayer = p;
              zone = z;
              break;
            }
          }
          if (zone) break;
        }

        if (!destroyedCard || !targetPlayer || !zone) {
          continue;
        }

        if (isImmuneToMagicDestruction(destroyedCard.id)) {
          continue;
        }

        const idx = targetPlayer[zone].findIndex((c) => c.uid === uid);
        const [removed] = targetPlayer[zone].splice(idx, 1);
        const prevPending = state.pendingAction;
        CardMovement.destroyOrSacrifice(
          state,
          targetPlayer,
          removed,
          'destroy',
          false,
        );
        // Si el efecto onDestroyed abrió su propio pendingAction interactivo
        // (p. ej. Unicorn Phoenix, Stabby The Unicorn), hay que preservarlo y
        // reanudar Two For One después de resolverlo.
        if (state.pendingAction !== prevPending) {
          openedInteractive = true;
        }
        destroyedCount++;
      }

      const remaining = pending.remainingToDestroy - destroyedCount;
      const destroyStep = {
        type: 'two_for_one',
        sourcePlayerId,
        phase: 'destroy',
        remainingToDestroy: Math.max(0, remaining),
      } as const;

      if (openedInteractive) {
        // Phoenix (u otro efecto interactivo) abrió su propio pendingAction y
        // se reanuda Two For One después de resolverlo, solo si quedan cartas.
        if (remaining > 0) {
          if (!state.pendingResume) state.pendingResume = [];
          state.pendingResume.push(destroyStep);
        }
      } else if (remaining > 0) {
        state.pendingAction = destroyStep;
      } else {
        state.pendingAction = undefined;
      }
      return true;
    }

    if (Array.isArray(cardId)) {
      return false;
    }

    // ──────────────────────────────────────────
    // Tiny Stable: sacrificar un unicornio propio (efecto continuo obligatorio)
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'tiny_stable'
    ) {
      if (pending.sourcePlayerId !== sourcePlayerId) return false;

      const player = state.players.find((p) => p.id === sourcePlayerId);
      if (!player) return false;

      const idx = player.stable.findIndex((c) => c.uid === cardId);
      if (idx === -1) return false;

      const target = player.stable[idx];
      if (target.cardType !== 'unicorn') return false;
      if (isPandamoniumProtected(player, target)) return false;

      const [sacrificed] = player.stable.splice(idx, 1);
      const intercepted = CardMovement.destroyOrSacrifice(
        state,
        player,
        sacrificed,
        'sacrifice',
      );

      // Si el sacrificio abrió su propio efecto interactivo (p. ej. Stabby
      // The Unicorn), dejarlo activo; el chequeo invariante de Tiny Stable se
      // re-evalúa en el siguiente emit.
      if (
        intercepted &&
        state.pendingAction &&
        state.pendingAction !== pending
      ) {
        return true;
      }

      if (state.pendingAction === pending || !state.pendingAction) {
        state.pendingAction = undefined;
      }
      return true;
    }

    // ──────────────────────────────────────────
    // Sadistic Ritual: sacrificar un unicornio propio y luego robar una carta
    // (al inicio del turno). El sacrificio es obligatorio; sin sacrificio no hay
    // robo. Si el sacrificio dispara otro efecto (p. ej. Barbed Wire), la roba
    // ocurre igual en la fase de inicio de turno y el descarte se resuelve
    // después.
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'sadistic_ritual'
    ) {
      if (pending.sourcePlayerId !== sourcePlayerId) return false;

      const player = state.players.find((p) => p.id === sourcePlayerId);
      if (!player) return false;

      const idx = player.stable.findIndex((c) => c.uid === cardId);
      if (idx === -1) return false;

      const target = player.stable[idx];
      if (target.cardType !== 'unicorn') return false;
      if (isPandamoniumProtected(player, target)) return false;

      const [sacrificed] = player.stable.splice(idx, 1);
      CardMovement.destroyOrSacrifice(state, player, sacrificed, 'sacrifice');

      drawForSadisticRitual(state, player);

      // Resolución LIFO centralizada: si el sacrificio abrió un efecto hijo
      // (p. ej. Barbed Wire), se mantiene activo; si no, se cierra el sacrificio.
      EffectStack.finish(state, pending);

      return true;
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

      if (isPandamoniumProtected(sourcePlayer, sourcePlayer.stable[idx])) {
        return false;
      }

      const [moved] = sourcePlayer.stable.splice(idx, 1);
      maybeTriggerBarbedWireLeave(state, sourcePlayer);

      // Resolución LIFO centralizada: si el on-enter de la carta movida abre su
      // propio efecto hijo (p. ej. Seductive Unicorn), el paso de robo
      // (unicorn_swap_steal) se suspende en la pila y se reanuda después.
      CardMovement.enterStable(state, targetPlayer, moved, {
        type: 'select_stable_card',
        reason: 'unicorn_swap_steal',
        sourcePlayerId,
        targetPlayerId: pending.targetPlayerId,
      });

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

      if (isPandamoniumProtected(targetPlayer, targetPlayer.stable[idx])) {
        return false;
      }

      const [stolen] = targetPlayer.stable.splice(idx, 1);
      maybeTriggerBarbedWireLeave(state, targetPlayer);
      const prevPending = state.pendingAction;
      CardMovement.enterStable(state, sourcePlayer, stolen);

      // Resolución LIFO centralizada: si el on-enter del unicornio robado abrió
      // su propio efecto hijo interactivo, se mantiene activo; si no, termina el
      // paso actual (el emisor reanudará la pila LIFO si hay continuaciones).
      EffectStack.finish(state, prevPending);

      return true;
    }

    // Re-Target: mover una carta de Upgrade/Downgrade al establo de otro jugador
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 're_target_card'
    ) {
      const fromPlayer = state.players.find(
        (p) => p.id === pending.targetPlayerId,
      );
      if (!fromPlayer) return false;

      const card = Array.isArray(cardId)
        ? fromPlayer.upgrades.find((c) => c.uid === cardId[0]) ||
          fromPlayer.downgrades.find((c) => c.uid === cardId[0])
        : fromPlayer.upgrades.find((c) => c.uid === cardId) ||
          fromPlayer.downgrades.find((c) => c.uid === cardId);

      if (!card) return false;

      const upIdx = fromPlayer.upgrades.findIndex((c) => c.uid === card.uid);
      if (upIdx !== -1) {
        fromPlayer.upgrades.splice(upIdx, 1);
      } else {
        const downIdx = fromPlayer.downgrades.findIndex(
          (c) => c.uid === card.uid,
        );
        if (downIdx !== -1) fromPlayer.downgrades.splice(downIdx, 1);
      }

      state.pendingAction = {
        type: 'select_player',
        reason: 're_target_destination',
        sourcePlayerId,
        card,
        fromPlayerId: pending.targetPlayerId,
      };
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
      let zone: 'stable' | 'upgrades' | 'downgrades' | null = null;
      for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
        const i = player[z].findIndex((c) => c.uid === cardId);
        if (i !== -1) {
          sacrificed = player[z][i];
          player[z].splice(i, 1);
          zone = z;
          break;
        }
      }
      if (!sacrificed || !zone) return false;

      CardMovement.destroyOrSacrifice(
        state,
        player,
        sacrificed,
        'sacrifice',
        false,
      );

      for (let i = 0; i < 2; i++) {
        const drawn = state.deck.shift();
        if (drawn) {
          enqueueDrawAnimation(state.roomCode, player.id, drawn);
          player.hand.push(drawn);
        }
      }

      if (state.pendingAction === pending || !state.pendingAction) {
        state.pendingAction = undefined;
      }
      return true;
    }

    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'unicorn_of_death_sacrifice'
    ) {
      const player = state.players.find((p) => p.id === sourcePlayerId);
      if (!player) return false;

      const idx = player.stable.findIndex(
        (card) =>
          card.uid === cardId &&
          card.cardType === 'unicorn' &&
          !isPandamoniumProtected(player, card),
      );
      if (idx === -1) return false;

      const [sacrificed] = player.stable.splice(idx, 1);
      const destroyStep = {
        type: 'select_stable_card',
        reason: 'unicorn_of_death_destroy',
        sourcePlayerId,
      } as const;
      const previousPending = state.pendingAction;
      const intercepted = CardMovement.destroyOrSacrifice(
        state,
        player,
        sacrificed,
        'sacrifice',
        false,
      );

      if (intercepted || state.pendingAction !== previousPending) {
        if (!state.pendingResume) state.pendingResume = [];
        state.pendingResume.push(destroyStep);
      } else {
        state.pendingAction = destroyStep;
      }
      return true;
    }

    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'unicorn_of_death_destroy'
    ) {
      for (const targetPlayer of state.players) {
        if (targetPlayer.id === sourcePlayerId) continue;

        const idx = targetPlayer.stable.findIndex(
          (card) => card.uid === cardId,
        );
        if (idx === -1) continue;

        const target = targetPlayer.stable[idx];
        if (
          target.cardType !== 'unicorn' ||
          isPandamoniumProtected(targetPlayer, target) ||
          isImmuneToUnicornOrUpgradeDestruction(target.id)
        ) {
          return false;
        }

        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        CardMovement.destroyOrSacrifice(
          state,
          targetPlayer,
          destroyed,
          'destroy',
        );
        EffectStack.finish(state, pending);
        return true;
      }

      return false;
    }

    // Glitter Bomb: sacrificar una carta propia, luego destruir una carta
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'glitter_bomb_sacrifice'
    ) {
      const player = state.players.find((p) => p.id === sourcePlayerId);
      if (!player) return false;

      for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
        const i = player[z].findIndex((c) => c.uid === cardId);
        if (i !== -1) {
          const target = player[z][i];
          const [sacrificed] = player[z].splice(i, 1);
          const prevPending = state.pendingAction;
          const intercepted = CardMovement.destroyOrSacrifice(
            state,
            player,
            sacrificed,
            'sacrifice',
            false,
          );

          const destroyStep = {
            type: 'select_stable_card',
            reason: 'glitter_bomb_destroy',
            sourcePlayerId,
          } as const;

          // Si la carta sacrificada intercepta (p. ej. Unicorn Phoenix) o
          // abrió su propio pendingAction (p. ej. Stabby The Unicorn),
          // suspender la segunda parte de Glitter Bomb.
          if (intercepted || state.pendingAction !== prevPending) {
            if (!state.pendingResume) state.pendingResume = [];
            state.pendingResume.push(destroyStep);
          } else {
            state.pendingAction = destroyStep;
          }
          return true;
        }
      }
      return false;
    }

    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'glitter_bomb_destroy'
    ) {
      for (const p of state.players) {
        if (p.id === sourcePlayerId) continue;
        for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
          const i = p[z].findIndex((c) => c.uid === cardId);
          if (i !== -1) {
            const target = p[z][i];

            if (isImmuneToUnicornOrUpgradeDestruction(target.id)) {
              return false;
            }

            if (CardMovement.maybeBlackKnightIntercept(state, p, target)) {
              return true;
            }

            const [destroyed] = p[z].splice(i, 1);
            const prevPending = state.pendingAction;
            const intercepted = CardMovement.destroyOrSacrifice(
              state,
              p,
              destroyed,
              'destroy',
              false,
            );

            // Si la carta intercepta (p. ej. Unicorn Phoenix) o abrió su propio
            // pendingAction (p. ej. Stabby The Unicorn), preservarlo.
            if (intercepted || state.pendingAction !== prevPending) {
              return true;
            }

            addLog(
              state,
              `${state.players.find((x) => x.id === sourcePlayerId)?.name} destruyó ${destroyed.name} con Glitter Bomb`,
              { playerId: sourcePlayerId },
            );

            state.pendingAction = undefined;
            return true;
          }
        }
      }
      return false;
    }

    if (
      pending.type === 'extremely_destructive_unicorn' ||
      pending.type === 'adorable_flying_unicorn' ||
      pending.type === 'cotton_candy_unicorn'
    ) {
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

      // Pandamonium: no se puede destruir un unicornio protegido.
      if (isPandamoniumProtected(targetPlayer, targetCard)) {
        return false;
      }

      // Magical Kittencorn no puede ser destruido por Magic cards
      if (isImmuneToMagicDestruction(targetCard.id)) {
        return false;
      }

      // Black Knight Unicorn solo protege Unicornios (no Upgrades ni Downgrades)
      const hasBlackKnight = targetPlayer.stable.some(
        (c) => c.id === 'black_knight_unicorn',
      );
      if (
        targetCard.cardType === 'unicorn' &&
        hasBlackKnight &&
        !hasBlindingLight(targetPlayer) &&
        targetCard.id !== 'black_knight_unicorn'
      ) {
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
      const prevPending = state.pendingAction;
      const intercepted = CardMovement.destroyOrSacrifice(
        state,
        targetPlayer,
        destroyedCard,
      );

      // Si la destrucción abrió un pendingAction interactivo (p. ej. Stabby
      // The Unicorn), preservarlo; si no, limpiar el pendingAction.
      if (state.pendingAction === prevPending && !intercepted) {
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
            const target = targetPlayer.upgrades[idx];
            if (
              CardMovement.maybeBlackKnightIntercept(
                state,
                targetPlayer,
                target,
              )
            ) {
              return true;
            }
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
    // Targeted Destruction: destruye un Upgrade o sacrifica un Downgrade
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'targeted_destruction'
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
            const target = targetPlayer.upgrades[idx];
            if (
              CardMovement.maybeBlackKnightIntercept(
                state,
                targetPlayer,
                target,
              )
            ) {
              return true;
            }
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
    // Back Kick: regresa una carta del establo al rival (incluyendo upgrades/downgrades)
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

      if (state.pendingAction === pending || !state.pendingAction) {
        state.pendingAction = undefined;
      }
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

      if (isPandamoniumProtected(sourcePlayer, sourcePlayer.stable[idx])) {
        return false;
      }

      const [sacrificedCard] = sourcePlayer.stable.splice(idx, 1);
      const intercepted = CardMovement.destroyOrSacrifice(
        state,
        sourcePlayer,
        sacrificedCard,
        'sacrifice',
      );

      if (intercepted) return true;

      // Si no hay ningún unicornio válido (distinto de Dark Angel) en el descarte
      // para traer de vuelta, se omite la segunda parte del efecto. Esto ocurre
      // p. ej. cuando Dark Angel se sacrifica a sí mismo sobre un descarte sin
      // otros unicornios.
      const hasValidTarget = state.discard.some(
        (c) => c.cardType === 'unicorn' && c.id !== 'dark_angel_unicorn',
      );

      if (!hasValidTarget) {
        state.pendingAction = undefined;
        return true;
      }

      // Resolución LIFO centralizada: si el sacrificio disparó un efecto
      // onDestroyed interactivo (p. ej. Stabby The Unicorn), el siguiente paso
      // se suspende en la pila y se reanuda después del efecto hijo.
      EffectStack.advance(state, pending, {
        type: 'select_discard_card',
        reason: 'dark_angel_unicorn',
        playerId: sourcePlayerId,
        cardType: 'unicorn',
      });
      return true;
    }

    // ──────────────────────────────────────────
    // Alluring Narwhal: robar una carta de Upgrade de otro jugador a tu establo
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
          if (isPandamoniumProtected(p, p.stable[cardIdx])) {
            return false;
          }
          targetPlayer = p;
          [stolenCard] = p.stable.splice(cardIdx, 1);
          maybeTriggerBarbedWireLeave(state, p);
          break;
        }
      }

      if (!stolenCard || !targetPlayer) return false;

      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!sourcePlayer) return false;

      sourcePlayer.upgrades.push(stolenCard);
      if (state.pendingAction === pending || !state.pendingAction) {
        state.pendingAction = undefined;
      }

      addLog(
        state,
        `${sourcePlayer.name} usó Alluring Narwhal y robó "${stolenCard.name}" de ${targetPlayer.name}`,
        { playerId: sourcePlayer.id },
      );
      return true;
    }

    // ──────────────────────────────────────────
    // Glitter Tornado: el jugador activo elige una carta por cada establo en la cola
    // ──────────────────────────────────────────
    if (pending.type === 'glitter_tornado') {
      const [currentTargetId, ...rest] = pending.remainingPlayerIds;

      const targetPlayer = state.players.find((p) => p.id === currentTargetId);
      if (!targetPlayer) return false;

      let zone: 'stable' | 'upgrades' | 'downgrades' | null = null;
      let card: Card | undefined;
      for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
        const i = targetPlayer[z].findIndex((c) => c.uid === cardId);
        if (i !== -1) {
          [card] = targetPlayer[z].splice(i, 1);
          zone = z;
          break;
        }
      }

      if (!card || !zone) return false;

      // Baby Unicorns van a la Nursery; las demás cartas vuelven a la mano
      CardMovement.returnToHand(state, targetPlayer, card);

      const nextStep = {
        type: 'glitter_tornado',
        sourcePlayerId,
        remainingPlayerIds: rest,
      } as const;

      // Si la carta devuelta disparó Barbed Wire (discard pendiente), preservar
      // el discard y encolar el siguiente paso del tornado para reanudarlo.
      if (state.pendingAction !== pending) {
        if (!state.pendingResume) state.pendingResume = [];
        if (rest.length > 0) {
          state.pendingResume.push(nextStep);
        }
        return true;
      }

      if (rest.length === 0) {
        // Todos los establos procesados → limpiar acción pendiente
        state.pendingAction = undefined;
      } else {
        // Avanzar a la siguiente persona en la cola
        state.pendingAction = nextStep;
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

      if (isPandamoniumProtected(targetPlayer, card)) {
        return false;
      }

      const [sacrificed] = targetPlayer.stable.splice(cardIdx, 1);
      CardMovement.destroyOrSacrifice(
        state,
        targetPlayer,
        sacrificed,
        'sacrifice',
      );

      const resolvedPlayerIds = [...pending.resolvedPlayerIds, sourcePlayerId];
      const onDestroyedOpened = EffectStack.childOpened(state, pending);

      if (resolvedPlayerIds.length >= pending.remainingPlayerIds.length) {
        // Último jugador: cerrar el flujo. Si el sacrificio abrió un efecto
        // onDestroyed interactivo (p. ej. Stabby), mantenerlo activo.
        EffectStack.finish(state, pending);
      } else {
        const nextStep = {
          ...pending,
          type: 'extremely_destructive_unicorn',
          remainingPlayerIds: pending.remainingPlayerIds,
          resolvedPlayerIds,
        } as typeof pending;
        EffectStack.advance(state, pending, nextStep);
      }

      return true;
    }

    // ──────────────────────────────────────────
    // Adorable Flying Unicorn: cada jugador sacrifica 1 carta de su establo
    // ──────────────────────────────────────────
    if (pending.type === 'adorable_flying_unicorn') {
      const targetPlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!targetPlayer) return false;

      if (!pending.remainingPlayerIds.includes(sourcePlayerId)) {
        return false;
      }

      if (pending.resolvedPlayerIds.includes(sourcePlayerId)) {
        return false;
      }

      let sacrificed: Card | undefined;
      let zone: 'stable' | 'upgrades' | 'downgrades' | null = null;
      for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
        const i = targetPlayer[z].findIndex((c) => c.uid === cardId);
        if (i !== -1) {
          sacrificed = targetPlayer[z][i];
          zone = z;
          break;
        }
      }

      if (!sacrificed || !zone) return false;

      const idx = targetPlayer[zone].findIndex((c) => c.uid === cardId);
      const [removed] = targetPlayer[zone].splice(idx, 1);
      CardMovement.destroyOrSacrifice(
        state,
        targetPlayer,
        removed,
        'sacrifice',
        false,
      );

      const resolvedPlayerIds = [...pending.resolvedPlayerIds, sourcePlayerId];

      if (resolvedPlayerIds.length >= pending.remainingPlayerIds.length) {
        EffectStack.finish(state, pending);
      } else {
        const nextStep = {
          ...pending,
          type: 'adorable_flying_unicorn',
          remainingPlayerIds: pending.remainingPlayerIds,
          resolvedPlayerIds,
        } as typeof pending;
        EffectStack.advance(state, pending, nextStep);
      }

      return true;
    }

    // ──────────────────────────────────────────
    // Cotton Candy Unicorn: cada jugador sacrifica 1 unicornio; al finalizar,
    // cada jugador que sacrificó roba 1 carta.
    // ──────────────────────────────────────────
    if (pending.type === 'cotton_candy_unicorn') {
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

      if (isPandamoniumProtected(targetPlayer, card)) {
        return false;
      }

      const [sacrificed] = targetPlayer.stable.splice(cardIdx, 1);
      CardMovement.destroyOrSacrifice(
        state,
        targetPlayer,
        sacrificed,
        'sacrifice',
      );

      const resolvedPlayerIds = [...pending.resolvedPlayerIds, sourcePlayerId];

      if (resolvedPlayerIds.length >= pending.remainingPlayerIds.length) {
        for (const resolvedPlayerId of resolvedPlayerIds) {
          const resolvedPlayer = state.players.find(
            (p) => p.id === resolvedPlayerId,
          );
          if (!resolvedPlayer) continue;

          const drawn = state.deck.shift();
          if (drawn) {
            enqueueDrawAnimation(state.roomCode, resolvedPlayer.id, drawn);
            resolvedPlayer.hand.push(drawn);
          }
          addLog(
            state,
            `${resolvedPlayer.name} robó 1 carta por efecto de Cotton Candy Unicorn`,
            { playerId: resolvedPlayer.id },
          );
        }

        EffectStack.finish(state, pending);
      } else {
        const nextStep = {
          ...pending,
          type: 'cotton_candy_unicorn',
          sourcePlayerId: pending.sourcePlayerId,
          remainingPlayerIds: pending.remainingPlayerIds,
          resolvedPlayerIds,
        } as typeof pending;
        EffectStack.advance(state, pending, nextStep);
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

        if (isPandamoniumProtected(targetPlayer, card)) {
          return false;
        }

        if (isImmuneToUnicornOrUpgradeDestruction(card.id)) return false;

        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        const intercepted = CardMovement.destroyOrSacrifice(
          state,
          targetPlayer,
          destroyed,
        );

        // Resolución LIFO centralizada: si la destrucción abrió un efecto hijo
        // interactivo (p. ej. Unicorn Phoenix), se mantiene activo y se resuelve
        // después. Rhinocorn avanza el turno igual.
        EffectStack.finish(state, pending);
        state.beginningEffectsQueue = [];

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

        if (isPandamoniumProtected(targetPlayer, card)) {
          return false;
        }

        if (isImmuneToUnicornOrUpgradeDestruction(card.id)) return false;

        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        CardMovement.destroyOrSacrifice(state, targetPlayer, destroyed);

        // Resolución LIFO centralizada: si la carta destruida disparó su propio
        // efecto (p. ej. Stabby The Unicorn), se mantiene activo.
        EffectStack.finish(state, pending);

        if (state.phase === TurnPhase.BEGINNING) {
          state.beginningEffectsQueue = [];
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

        if (isPandamoniumProtected(targetPlayer, card)) {
          return false;
        }

        const [stolen] = targetPlayer.stable.splice(idx, 1);
        maybeTriggerBarbedWireLeave(state, targetPlayer);
        const entered = CardMovement.enterStable(state, sourcePlayer, stolen);

        if (!entered) {
          targetPlayer.stable.push(stolen);
          return false;
        }

        // Resolución LIFO centralizada: si la carta robada abrió un efecto hijo
        // interactivo al entrar, se mantiene activo; si no, termina el paso.
        EffectStack.finish(state, pending);

        return true;
      }

      return false;
    }

    // ──────────────────────────────────────────
    // Rainbow Lasso: roba un unicornio de otro jugador
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'rainbow_lasso_steal'
    ) {
      const sourcePlayer = state.players.find((p) => p.id === sourcePlayerId);
      if (!sourcePlayer) return false;

      for (const targetPlayer of state.players) {
        if (targetPlayer.id === sourcePlayerId) continue;

        const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
        if (idx === -1) continue;

        const card = targetPlayer.stable[idx];
        if (card.cardType !== 'unicorn') return false;

        if (isPandamoniumProtected(targetPlayer, card)) {
          return false;
        }

        const [stolen] = targetPlayer.stable.splice(idx, 1);
        maybeTriggerBarbedWireLeave(state, targetPlayer);
        const prevPending = state.pendingAction;
        const entered = CardMovement.enterStable(state, sourcePlayer, stolen);

        if (!entered) {
          targetPlayer.stable.push(stolen);
          return false;
        }

        // Rainbow Lasso ya terminó en el momento en que roba el unicornio.
        // Si el unicornio abre un efecto interactivo al entrar, ese efecto
        // debe resolverse sin reanudar Rainbow Lasso después.
        if (state.pendingAction !== prevPending) {
          return true;
        }

        state.pendingAction = undefined;
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

        if (isPandamoniumProtected(targetPlayer, card)) {
          return false;
        }

        if (isImmuneToUnicornOrUpgradeDestruction(card.id)) return false;

        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        CardMovement.destroyOrSacrifice(state, targetPlayer, destroyed);

        // Resolución LIFO centralizada: si la destrucción abrió un efecto hijo
        // interactivo (p. ej. Stabby), se mantiene activo.
        EffectStack.finish(state, pending);
        return true;
      }

      return false;
    }

    // ──────────────────────────────────────────
    // Stable Artillery: destruye un unicornio
    // ──────────────────────────────────────────
    if (
      pending.type === 'select_stable_card' &&
      pending.reason === 'stable_artillery_destroy'
    ) {
      for (const targetPlayer of state.players) {
        if (targetPlayer.id === sourcePlayerId) continue;

        const idx = targetPlayer.stable.findIndex((c) => c.uid === cardId);
        if (idx === -1) continue;

        const card = targetPlayer.stable[idx];
        if (card.cardType !== 'unicorn') return false;

        if (isPandamoniumProtected(targetPlayer, card)) {
          return false;
        }

        if (isImmuneToUnicornOrUpgradeDestruction(card.id)) return false;

        const [destroyed] = targetPlayer.stable.splice(idx, 1);
        CardMovement.destroyOrSacrifice(state, targetPlayer, destroyed);

        // Resolución LIFO centralizada: si la destrucción abrió un efecto hijo
        // interactivo (p. ej. Stabby), se mantiene activo.
        EffectStack.finish(state, pending);
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

    if (pending.reason === 'glitter_unicorn') {
      if (targetPlayer.id !== sourcePlayer.id) return false;

      const cardIdx = sourcePlayer.hand.findIndex((c) => c.uid === cardId);
      if (cardIdx === -1 || sourcePlayer.hand[cardIdx].cardType !== 'upgrade') {
        return false;
      }

      const [upgrade] = sourcePlayer.hand.splice(cardIdx, 1);
      sourcePlayer.upgrades.push(upgrade);
      state.pendingAction = undefined;
      return true;
    }

    if (pending.reason === 'zombie_unicorn') {
      if (targetPlayer.id !== sourcePlayer.id) return false;

      const cardIdx = sourcePlayer.hand.findIndex(
        (card) => card.uid === cardId && card.cardType === 'unicorn',
      );
      if (cardIdx === -1) return false;

      const [discarded] = sourcePlayer.hand.splice(cardIdx, 1);
      enqueueDiscardAnimation(state.roomCode, sourcePlayer.id, discarded);
      state.discard.push(discarded);
      state.pendingAction = {
        type: 'select_discard_card',
        reason: 'zombie_unicorn',
        playerId: sourcePlayerId,
        cardType: 'unicorn',
      };
      return true;
    }

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

    if (state.pendingAction === pending || !state.pendingAction) {
      state.pendingAction = undefined;
    }
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

    enqueueShuffleAnimation(state.roomCode, state.players[state.currentPlayer]?.id ?? '');
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

  static handleFrenchiecornDiscard(
    state: GameState,
    playerId: string,
    cardIds: string[],
  ): boolean {
    const pending = state.pendingAction;
    if (
      !pending ||
      pending.type !== 'frenchiecorn' ||
      !pending.remainingPlayerIds.includes(playerId)
    ) {
      return false;
    }

    if (cardIds.length !== 1) return false;

    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) return false;

    const idx = player.hand.findIndex((card) => card.uid === cardIds[0]);
    if (idx === -1) return false;

    const [discarded] = player.hand.splice(idx, 1);
    enqueueDiscardAnimation(state.roomCode, player.id, discarded);
    state.discard.push(discarded);

    const remainingPlayerIds = pending.remainingPlayerIds.filter(
      (id) => id !== playerId,
    );
    const resolvedPlayerIds = [...pending.resolvedPlayerIds, playerId];
    const discardedCardIds = [...pending.discardedCardIds, discarded.uid];

    if (remainingPlayerIds.length > 0) {
      state.pendingAction = {
        type: 'frenchiecorn',
        sourcePlayerId: pending.sourcePlayerId,
        remainingPlayerIds,
        resolvedPlayerIds,
        discardedCardIds,
      };
    } else {
      state.pendingAction = {
        type: 'select_discard_card',
        reason: 'frenchiecorn',
        playerId: pending.sourcePlayerId,
        discardedCardIds,
      };
    }

    return true;
  }
}
