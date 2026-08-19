import type { GameState } from '../../models/GameState.ts';
import type { PendingAction } from '../../models/PendingAction.ts';

/**
 * Motor central de resolución de efectos en orden LIFO (Last In, First Out).
 *
 * Los efectos interactivos se modelan como una pila de continuaciones. Cuando un
 * efecto está resolviéndose (su `pendingAction` está activo) y dispara OTRO efecto
 * que toma el control (abre un nuevo `pendingAction`), el primer efecto se
 * SUSPENDE: su continuación se apila en `GameState.pendingResume`. El efecto más
 * reciente se resuelve primero y, cuando termina (su `pendingAction` queda vacío),
 * el emisor desapila la continuación más reciente y la reanuda (LIFO).
 *
 * Convención de uso desde un manejador de acción:
 *  - Guardar `prev = state.pendingAction` ANTES de ejecutar la operación que puede
 *    disparar un efecto hijo (p. ej. `CardMovement.enterStable`).
 *  - Si el efecto tiene más pasos: `EffectStack.advance(state, prev, nextStep)`.
 *  - Si el efecto terminó: `EffectStack.finish(state, prev)`.
 *
 * `childOpened` detecta si durante la resolución se abrió un efecto hijo interactivo.
 */
export class EffectStack {
  /** ¿La resolución de `previous` abrió un NUEVO pendingAction (efecto hijo)?
   *  Si es así, el efecto hijo tomó el control y hay que suspender la continuación. */
  static childOpened(
    state: GameState,
    previous: PendingAction | undefined,
  ): boolean {
    return !!state.pendingAction && state.pendingAction !== previous;
  }

  /** Suspende `continuation` en la pila LIFO; se reanudará cuando el efecto
   *  actual termine. */
  static suspend(state: GameState, continuation: PendingAction): void {
    if (!state.pendingResume) state.pendingResume = [];
    state.pendingResume.push(continuation);
  }

  /** Desapila y devuelve la continuación suspendida más reciente (LIFO), o
   *  `undefined` si la pila está vacía. */
  static resume(state: GameState): PendingAction | undefined {
    return state.pendingResume?.pop();
  }

  /** Al terminar un paso de un efecto:
   *  - Si un efecto hijo tomó el control, se deja activo (el padre queda suspendido
   *    implícitamente en la pila si tenía continuación).
   *  - Si no, se limpia `pendingAction` (el emisor reanudará la pila LIFO). */
  static finish(
    state: GameState,
    previous: PendingAction | undefined,
  ): void {
    if (!EffectStack.childOpened(state, previous)) {
      state.pendingAction = undefined;
    }
  }

  /** Al pasar a un siguiente paso (`next`) de un efecto:
   *  - Si un efecto hijo tomó el control, se SUSPENDE `next` (se reanudará tras el hijo).
   *  - Si no, `next` se convierte en el `pendingAction` activo. */
  static advance(
    state: GameState,
    previous: PendingAction | undefined,
    next: PendingAction,
  ): void {
    if (EffectStack.childOpened(state, previous)) {
      EffectStack.suspend(state, next);
    } else {
      state.pendingAction = next;
    }
  }
}