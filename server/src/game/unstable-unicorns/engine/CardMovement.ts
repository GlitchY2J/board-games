import type { Card } from '../../models/Card.ts';
import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import type { PendingAction } from '../../models/PendingAction.ts';
import { effects } from './effects/index.ts';
import { EffectStack } from './EffectStack.ts';
import { isBasicUnicornEntryBlocked } from '../../cards/effects/queenBeeUnicorn.ts';
import { isPandamoniumProtected } from '../../cards/effects/pandamonium.ts';
import {
  maybeTriggerBarbedWireLeave,
  triggerBarbedWireDiscard,
} from '../../cards/effects/barbedWire.ts';

export function hasUpgrade(player: Player, id: string): boolean {
  return player.upgrades.some((c) => c.id === id);
}

export function hasDowngrade(player: Player, id: string): boolean {
  return player.downgrades.some((c) => c.id === id);
}
import {
  enqueueCardAnimation,
  type CardAnimType,
} from '../../cardAnimations.ts';

export class CardMovement {
  /**
   * Coloca una carta de Unicornio en el establo de un jugador y dispara sus efectos de entrada.
   * Retorna `false` si no puede entrar (p. ej. bloqueado por Queen Bee Unicorn).
   *
   * `continuation`: si el efecto on-enter de la carta entrante abre un efecto hijo
   * interactivo (nuevo pendingAction), la continuación del llamador se SUSPENDE en la
   * pila LIFO y se reanudará cuando el efecto hijo termine. Si no abre ningún efecto
   * hijo, la continuación se convierte directamente en el pendingAction activo.
   */
  static enterStable(
    state: GameState,
    player: Player,
    card: Card,
    continuation?: PendingAction,
  ): boolean {
    if (
      card.cardType === 'unicorn' &&
      card.unicornClass === 'basic' &&
      isBasicUnicornEntryBlocked(state, player.id)
    ) {
      return false;
    }

    player.stable.push(card);

    // Barbed Wire: se captura ANTES de resolver los efectos on-enter porque la
    // entrada de este unicornio podría provocar que Barbed Wire abandone el
    // establo; aun así la carta debe descartarse (el efecto es simultáneo).
    const hadBarbedWire = hasDowngrade(player, 'barbed_wire');

    const prevPending = state.pendingAction;

    // Blinding Light: bloquea la activación de efectos de tus Unicornios
    // (los Baby Unicorn son inmunes).
    if (
      !hasDowngrade(player, 'blinding_light') &&
      card.effect &&
      card.cardType === 'unicorn' &&
      card.unicornClass !== 'baby'
    ) {
      const effect = effects[card.effect];
      effect?.onEnterStable?.(state, player, card);
    }

    // Barbed Wire: al entrar un unicornio, si el jugador tiene Barbed Wire
    // (aunque su entrada lo haga abandonar), debe descartar una carta.
    if (hadBarbedWire) {
      triggerBarbedWireDiscard(state, player);
    }

    // Resolución LIFO: si el efecto on-enter abrió un efecto hijo interactivo y el
    // llamador tenía continuación, se suspende para reanudarla después del hijo.
    if (continuation) {
      if (EffectStack.childOpened(state, prevPending)) {
        EffectStack.suspend(state, continuation);
      } else {
        state.pendingAction = continuation;
      }
    }

    return true;
  }

  /**
   * Regresa una carta del establo a la mano del jugador.
   * Regla Especial: Si la carta es un Baby Unicorn, regresa a la Nursery en lugar de a la mano.
   */
  static returnToHand(state: GameState, player: Player, card: Card): void {
    if (card.cardType === 'unicorn') {
      maybeTriggerBarbedWireLeave(state, player);
    }

    if (card.cardType === 'unicorn' && card.unicornClass === 'baby') {
      state.nursery.push(card);
    } else {
      player.hand.push(card);
    }
  }

  /**
   * Black Knight Unicorn: si una carta del establo de un jugador va a ser
   * DESTRUÍDA, puede sacrificar a Black Knight Unicorn en su lugar.
   * Si intercepta, setea el pendingAction correspondiente y devuelve `true`.
   * Hay que llamarlo ANTES de remover la carta objetivo.
   */
  static maybeBlackKnightIntercept(
    state: GameState,
    player: Player,
    card: Card,
  ): boolean {
    if (card.id === 'black_knight_unicorn') return false;
    if (card.cardType !== 'unicorn') return false;

    const hasBlackKnight = player.stable.some(
      (c) => c.id === 'black_knight_unicorn',
    );
    if (!hasBlackKnight) return false;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'black_knight_unicorn',
      playerId: player.id,
      title: '🛡️ Black Knight Unicorn',
      description: `¿Deseas sacrificar a Black Knight Unicorn para evitar que ${card.name} sea destruido?`,
      options: [
        { value: 'yes', text: 'Sí, sacrificar Black Knight' },
        { value: 'no', text: `No, destruir ${card.name}` },
      ],
      targetCardId: card.uid,
      originalTargetPlayerId: player.id,
    };
    return true;
  }

  /**
   * Destruye o sacrifica una carta del establo mandándola al descarte.
   * Regla Especial: Si la carta es un Baby Unicorn, regresa a la Nursery en lugar del montón de descarte.
   * Regla Especial: Si es un Flying Unicorn, regresa a la mano del jugador.
   */
  static destroyOrSacrifice(
    state: GameState,
    player: Player,
    card: Card,
    animType: CardAnimType = 'destroy',
  ): boolean {
    // Pandamonium: los unicornios de un establo protegido no pueden ser
    // destruidos ni sacrificados por nadie.
    if (isPandamoniumProtected(player, card)) return true;

    if (card.cardType === 'unicorn' && card.unicornClass === 'baby') {
      maybeTriggerBarbedWireLeave(state, player);
      state.nursery.push(card);
      return false;
    }

    // Rainbow Aura: tus Unicornios no pueden ser DESTRUIDOS (el sacrificio no se bloquea)
    if (
      card.cardType === 'unicorn' &&
      animType !== 'sacrifice' &&
      hasUpgrade(player, 'rainbow_aura')
    ) {
      if (!player.stable.some((c) => c.uid === card.uid)) {
        player.stable.push(card);
      }
      return true;
    }

    if (card.id.includes('flying_unicorn') || card.effect === 'llamacorn') {
      maybeTriggerBarbedWireLeave(state, player);
      player.hand.push(card);
      return false;
    }

    // Blinding Light: bloquea la activación de efectos al destruir/sacrificar
    // tus Unicornios (los Baby Unicorn son inmunes).
    const blindingLightActive =
      card.cardType === 'unicorn' &&
      card.unicornClass !== 'baby' &&
      hasDowngrade(player, 'blinding_light');

    if (card.effect && !blindingLightActive) {
      const effect = effects[card.effect];
      const intercepted = effect?.onDestroyed?.(state, card, player);
      if (intercepted) {
        maybeTriggerBarbedWireLeave(state, player);
        return true;
      }
    }

    if (card.cardType === 'unicorn') {
      maybeTriggerBarbedWireLeave(state, player);
    }

    enqueueCardAnimation(state.roomCode, animType, player.id, card);
    state.discard.push(card);
    return false;
  }
}
