import type { Room } from '../models/Room.js';
import type { GameState } from '../models/GameState.ts';
import type { Card } from '../models/Card.ts';
import { DeckManager } from '../DeckManager.ts';
import { CardRepository } from './CardRepository.ts';
import { Player } from '../models/Player.ts';
import { TurnPhase } from '../turn/TurnPhase.ts';

export function createGameState(room: Room): GameState {
  const deck = CardRepository.load();
  const { nursery, deck: gameDeck } = extractNursery(deck);
  const deckManager = new DeckManager(gameDeck);

  deckManager.shuffle();

  const players = room.players.map((player) => ({
    ...player,
    hand: [] as Card[],
    stable: [] as Card[],
    upgrades: [] as Card[],
    downgrades: [] as Card[],
  }));

  function extractNursery(deck: Card[]) {
    const nursery = deck.filter(
      (card) => card.cardType === 'unicorn' && card.unicornClass === 'baby',
    );

    const newDeck = deck.filter(
      (card) => !(card.cardType === 'unicorn' && card.unicornClass === 'baby'),
    );

    return {
      nursery,
      deck: newDeck,
    };
  }

  function giveBabyUnicorn(nursery: Card[], player: Player) {
    const index = Math.floor(Math.random() * nursery.length);
    const baby = nursery.splice(index, 1)[0];
    if (baby) {
      player.stable.push(baby);
    }
  }

  for (const player of players) {
    giveBabyUnicorn(nursery, player);
  }

  // Repartir 5 cartas
  for (const player of players) {
    for (let i = 0; i < 5; i++) {
      const card = deckManager.draw();
      if (card) {
        player.hand.push(card);
      }
    }
  }

  return {
    roomCode: room.code,
    started: true,
    turn: 1,
    currentPlayer: 0,
    players,
    deck: deckManager.drawPile,
    nursery,
    discard: [],
    phase: TurnPhase.BEGINNING,
    actionUsed: false,
    log: [],
  };
}
