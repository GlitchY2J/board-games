import type { PendingAction } from './PendingAction.ts';

export type PlayerSelectionAction = Extract<
  PendingAction,
  { type: 'select_player' | 'select_players' }
>;

export type CardSelectionAction = Extract<
  PendingAction,
  {
    type:
      | 'select_stable_card'
      | 'select_hand_card'
      | 'select_discard_card'
      | 'select_own_hand_card'
      | 'select_nursery_card';
  }
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

export type PendingActionType = PendingAction['type'];

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

export function isPlayerSelectionAction(
  action: PendingAction | undefined,
): action is PlayerSelectionAction {
  return action?.type === 'select_player' || action?.type === 'select_players';
}

export function isCardSelectionAction(
  action: PendingAction | undefined,
): action is CardSelectionAction {
  return (
    action?.type === 'select_stable_card' ||
    action?.type === 'select_hand_card' ||
    action?.type === 'select_discard_card' ||
    action?.type === 'select_own_hand_card' ||
    action?.type === 'select_nursery_card'
  );
}

export function isDiscardAction(
  action: PendingAction | undefined,
): action is DiscardAction {
  return (
    action?.type === 'discard' ||
    action?.type === 'select_discard_count' ||
    action?.type === 'pestilence_discard' ||
    action?.type === 'mystical_vortex' ||
    action?.type === 'llamacorn' ||
    action?.type === 'frenchiecorn'
  );
}

export function getPendingActionCategory(
  action: PendingAction | undefined,
): PendingActionCategory {
  if (!action) return 'other';
  switch (action.type) {
    case 'select_player':
    case 'select_players':
      return 'player_selection';
    case 'select_stable_card':
    case 'select_hand_card':
    case 'select_discard_card':
    case 'select_own_hand_card':
    case 'select_nursery_card':
      return 'card_selection';
    case 'discard':
    case 'select_discard_count':
    case 'pestilence_discard':
    case 'mystical_vortex':
    case 'llamacorn':
    case 'frenchiecorn':
      return 'discard';
    case 'select_choice':
      return 'choice';
    case 'select_deck_card':
    case 'select_oracle_cards':
      return 'deck_selection';
    default:
      return 'other';
  }
}
