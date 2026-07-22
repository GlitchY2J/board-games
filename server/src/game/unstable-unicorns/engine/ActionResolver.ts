import { GameState } from '../../models/GameState.ts';
import { ResolveActionPayload } from '../../models/ResolveActionPayload.ts';

export class ActionResolver {
  static resolve(state: GameState, payload: ResolveActionPayload) {
    switch (state.pendingAction?.type) {
      case 'alluring_narwhal':
        // resolver efecto
        break;
    }
  }
}
