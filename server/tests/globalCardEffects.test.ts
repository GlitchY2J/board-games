import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { Card } from '../src/game/models/Card.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { maybeMagicElexirIntercept } from '../src/game/cards/effects/magicElexir.ts';
import { paranormalAffection } from '../src/game/cards/effects/paranormalAffection.ts';
import { nightmareCurrentlyIndisposed } from '../src/game/cards/effects/nightmareCurrentlyIndisposed.ts';
import { CardMovement } from '../src/game/unstable-unicorns/engine/CardMovement.ts';
import { CardZoneMovement } from '../src/game/unstable-unicorns/engine/CardZoneMovement.ts';
import { getCardPassive } from '../src/game/unstable-unicorns/engine/effects/CardPassive.ts';
import { removeStableCardFromGame } from '../src/game/unstable-unicorns/engine/StableCardRemoval.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';
import { isReactionEffect } from '../src/sockets/gameHandlers.ts';

let sequence = 0;

function card(id: string, expansions = ['rainbow_apocalypse', 'nightmares']): Card {
  const found = CardRepository.load(expansions).find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Carta no encontrada: ${id}`);
  sequence += 1;
  return { ...found, uid: `${id}__global_effect_test${sequence}` };
}

function player(id: string): Player {
  return {
    id,
    sessionToken: id,
    socketId: id,
    connected: true,
    name: id,
    avatar: '',
    hand: [],
    stable: [],
    upgrades: [],
    downgrades: [],
  };
}

function state(players: Player[]): GameState {
  return {
    roomCode: 'global-effects-test',
    started: true,
    turn: 1,
    currentPlayer: 0,
    players,
    deck: [],
    nursery: [],
    discard: [],
    phase: TurnPhase.ACTION,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

test('Magic Elexir intercepta destrucción solo con carta en mano', () => {
  const target = player('A');
  const destroyed = card('basic_unicorn_red');
  target.downgrades = [card('magic_elexir')];
  const game = state([target]);

  assert.equal(maybeMagicElexirIntercept(game, target, destroyed, 'destroy'), false);

  target.hand = [card('basic_unicorn_blue')];
  assert.equal(maybeMagicElexirIntercept(game, target, destroyed, 'destroy'), true);
  assert.equal(game.pendingAction?.type, 'select_choice');
  assert.equal(game.pendingAction?.reason, 'magic_elexir');
  assert.equal(game.pendingAction?.destructionType, 'destroy');
});

test('Demonicorn abre su elección al ser destruido', () => {
  const owner = player('owner');
  const demonicorn = card('demonicorn');
  owner.stable.push(demonicorn);
  const game = state([owner, player('opponent')]);

  assert.equal(CardZoneMovement.removeFromStable(owner, demonicorn.uid), demonicorn);
  CardMovement.destroyOrSacrifice(game, owner, demonicorn, 'destroy');

  assert.equal(game.pendingAction?.type, 'select_choice');
  assert.equal(game.pendingAction?.reason, 'demonicorn');
});

test('Demonicorn permite retirar una carta rival aunque sea la única carta de su establo', () => {
  const owner = player('owner');
  const opponent = player('opponent');
  const demonicorn = card('demonicorn');
  const target = card('basic_unicorn_red');
  owner.stable.push(demonicorn);
  opponent.stable.push(target);
  const game = state([owner, opponent]);

  CardZoneMovement.removeFromStable(owner, demonicorn.uid);
  CardMovement.destroyOrSacrifice(game, owner, demonicorn, 'destroy');
  game.pendingAction = {
    type: 'select_stable_card',
    reason: 'demonicorn_remove',
    sourcePlayerId: owner.id,
    remainingPlayerIds: [opponent.id],
  };

  assert.equal(ActionResolver.handleSelectStableCard(game, owner.id, target.uid), true);
  assert.equal(game.removedCards?.some((card) => card.uid === target.uid), true);
});

test('Paranormal Affection ofrece robar dos cartas al entrar si el mazo no está vacío', () => {
  const target = player('A');
  const game = state([target]);
  target.upgrades = [card('paranormal_affection')];
  game.deck = [card('basic_unicorn_red')];

  paranormalAffection.onEnterStable?.(game, target, card('basic_unicorn_red'));

  assert.equal(game.pendingAction?.type, 'select_choice');
  assert.equal(game.pendingAction?.reason, 'paranormal_affection');
});

test('Saved by the Sigil impide colocar Downgrades en el establo', () => {
  const target = player('A');
  target.downgrades = [card('saved_by_the_sigil')];

  assert.equal(CardMovement.enterStableCard(target, card('pandamonium')), false);
  assert.equal(target.downgrades.length, 1);
});

test('Hex Neigh pertenece a la ventana de reacciones Neigh', () => {
  assert.equal(isReactionEffect('hex_neigh', false), true);
  assert.equal(isReactionEffect('ordinary_card', false), false);
});

test('Nightmare Currently Indisposed exige sacrificar un unicornio no protegido', () => {
  const target = player('A');
  const game = state([target]);
  target.stable = [card('nightmare_currently_indisposed'), card('basic_unicorn_red')];

  nightmareCurrentlyIndisposed.onEnterStable?.(game, target, target.stable[0]);

  assert.equal(game.pendingAction?.type, 'select_stable_card');
  assert.equal(game.pendingAction?.reason, 'nightmare_currently_indisposed_sacrifice');
});

test('removeStableCardFromGame retira la carta sin enviarla al descarte', () => {
  const target = player('A');
  const removed = card('basic_unicorn_red');
  target.stable = [removed];
  const game = state([target]);

  const result = removeStableCardFromGame(game, removed.uid, [target.id]);

  assert.equal(result?.card.uid, removed.uid);
  assert.equal(target.stable.length, 0);
  assert.deepEqual(game.removedCards?.map((item) => item.uid), [removed.uid]);
  assert.equal(game.discard.length, 0);
});

test('CardZoneMovement mantiene cada transición en una sola zona', () => {
  const target = player('A');
  const handCard = card('basic_unicorn_red');
  const stableCard = card('basic_unicorn_blue');
  target.hand = [handCard];
  target.stable = [stableCard];
  const game = state([target]);

  assert.equal(CardZoneMovement.removeFromHand(target, handCard.uid)?.uid, handCard.uid);
  CardZoneMovement.addToHand(target, handCard);
  assert.equal(CardZoneMovement.removeFromStable(target, stableCard.uid)?.uid, stableCard.uid);
  CardZoneMovement.toDiscard(game, stableCard);

  assert.deepEqual(target.hand.map((item) => item.uid), [handCard.uid]);
  assert.equal(target.stable.length, 0);
  assert.deepEqual(game.discard.map((item) => item.uid), [stableCard.uid]);
});

test('CardPassive expone consultas declarativas de protección e inmunidad', () => {
  assert.equal(getCardPassive({ id: 'pandamonium' }).protectsUnicorns, true);
  assert.equal(
    getCardPassive({ id: 'queen_bee_unicorn' }).blocksBasicUnicornEntry,
    true,
  );
  assert.equal(
    getCardPassive({ id: 'phantom_unicorn' }).immuneToSacrifice,
    true,
  );
  assert.equal(
    getCardPassive({ id: 'magical_kittencorn' }).immuneToMagicDestruction,
    true,
  );
  assert.equal(getCardPassive({ id: 'broken_stable' }).blocksUpgradePlay, true);
  assert.equal(
    getCardPassive({ id: 'barbed_wire' }).requiresDiscardToPlayUnicorn,
    true,
  );
  assert.equal(getCardPassive({ id: 'ginormous_unicorn' }).stablePowerDelta, 1);
});
