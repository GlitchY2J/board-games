import type { PendingAction } from './PendingAction.ts';

export type PlayerSelectionAction = Extract<
  PendingAction,
  { type: 'select_player' | 'select_players' }
>;

export type CardSelectionAction = Extract<
  PendingAction,
  { type: 'select_stable_card' | 'select_hand_card' | 'select_discard_card' | 'select_own_hand_card' }
>;

export type DiscardAction = Extract<
  PendingAction,
  { type: 'discard' | 'select_discard_count' | 'pestilence_discard' | 'mystical_vortex' | 'llamacorn' | 'frenchiecorn' }
>;

export type ChoiceAction = Extract<PendingAction, { type: 'select_choice' }>;

export type DeckSelectionAction = Extract<
  PendingAction,
  { type: 'select_deck_card' | 'select_oracle_cards' }
>;

export type PendingActionCategory =
  | 'player_selection'
  | 'card_selection'
  | 'discard'
  | 'choice'
  | 'deck_selection'
  | 'other';

export function isPendingActionType<T extends PendingAction['type']>(
  action: PendingAction | undefined,
  type: T,
): action is Extract<PendingAction, { type: T }> {
  return action?.type === type;
}

export function getPendingActionCategory(
  action: PendingAction | undefined,
): PendingActionCategory {
  if (!action) return 'other';
  if (action.type === 'select_player' || action.type === 'select_players') {
    return 'player_selection';
  }
  if (
    action.type === 'select_stable_card' ||
    action.type === 'select_hand_card' ||
    action.type === 'select_discard_card' ||
    action.type === 'select_own_hand_card'
  ) {
    return 'card_selection';
  }
  if (
    action.type === 'discard' ||
    action.type === 'select_discard_count' ||
    action.type === 'pestilence_discard' ||
    action.type === 'mystical_vortex' ||
    action.type === 'llamacorn' ||
    action.type === 'frenchiecorn'
  ) {
    return 'discard';
  }
  if (action.type === 'select_choice') return 'choice';
  if (action.type === 'select_deck_card' || action.type === 'select_oracle_cards') {
    return 'deck_selection';
  }
  return 'other';
}
