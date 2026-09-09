import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getPendingActionCategory,
  isPendingActionType,
} from '../../shared/types/PendingActionCategories.ts';

test('PendingAction categoriza selecciones y descartes por dominio', () => {
  assert.equal(
    getPendingActionCategory({
      type: 'select_player',
      reason: 'americorn',
      sourcePlayerId: 'player-1',
    }),
    'player_selection',
  );
  assert.equal(
    getPendingActionCategory({
      type: 'select_nursery_card',
      reason: 'mother_goose_unicorn',
      playerId: 'player-1',
    }),
    'card_selection',
  );
  assert.equal(
    getPendingActionCategory({
      type: 'discard',
      reason: 'hand_limit',
      playerId: 'player-1',
      cardsToDiscard: 1,
    }),
    'discard',
  );
  assert.equal(
    getPendingActionCategory({
      type: 'select_deck_card',
      reason: 'debug_draw',
      playerId: 'player-1',
      candidates: [],
    }),
    'deck_selection',
  );
});

test('isPendingActionType estrecha una acción por su tipo', () => {
  const action = {
    type: 'select_choice' as const,
    reason: 'magic_elexir' as const,
    playerId: 'player-1',
    title: '',
    description: '',
    options: [],
  };

  assert.equal(isPendingActionType(action, 'select_choice'), true);
  assert.equal(isPendingActionType(action, 'discard'), false);
});
