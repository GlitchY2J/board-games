import type { Room } from '../models/Room.js';
import type { GameState } from '../models/GameState.ts';
import type { Card } from '../models/Card.ts';
import { DeckManager } from '../DeckManager.ts';
import { CardRepository } from './CardRepository.ts';
import { Player } from '../models/Player.ts';
import { TurnPhase } from '../turn/TurnPhase.ts';
import { TurnManager } from '../turn/TurnManager.ts';

export function createGameState(room: Room): GameState {
  let deck = CardRepository.load(room.expansions);
  const isTwoPlayerGame = room.players.length === 2;
  const guaranteedNeighs: Card[] = [];

  if (isTwoPlayerGame) {
    const removedCardIds = new Set([
      'queen_bee_unicorn',
      'seductive_unicorn',
      'rainbow_unicorn',
      'nanny_cam',
      'sadistic_ritual',
      'slowdown',
      'yay',
      'mother_goose_unicorn',
      'necromancer_unicorn',
      'fire_and_brimstone',
      'unicorn_phoenix',
      'storm_of_cuteness',
      'magical_kittencorn',
      'llamapocalypse',
      'llamacorn',
      'adorable_flying_unicorn',
      'unicorn_nap',
    ]);

    deck = deck.filter(
      (card) =>
        card.unicornClass !== 'basic' && !removedCardIds.has(card.id),
    );

    for (let index = 0; index < 2; index += 1) {
      const neighIndex = deck.findIndex((card) => card.effect === 'neigh');
      if (neighIndex === -1) break;
      guaranteedNeighs.push(deck.splice(neighIndex, 1)[0]);
    }

  }

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

  if (isTwoPlayerGame) {
    players.forEach((player, index) => {
      const neigh = guaranteedNeighs[index];
      if (neigh) player.hand.push(neigh);
    });
  }

  // Repartir 5 cartas adicionales (6 cartas totales en partidas de 2 jugadores)
  for (const player of players) {
    for (let i = 0; i < 5; i++) {
      const card = deckManager.draw();
      if (card) {
        player.hand.push(card);
      }
    }
  }

  const gameState: GameState = {
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
    chat: [],
    eliminatedPlayers: [],
  };

  TurnManager.skipBeginningIfNoTriggers(gameState);

  return gameState;
}
