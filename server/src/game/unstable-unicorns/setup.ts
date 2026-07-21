import crypto from 'crypto';
import type { Room } from '../models/Room.js';
import type { GameState } from '../models/GameState.ts';
import type { Card } from '../models/Card.ts';
import { DeckManager } from '../DeckManager.ts';

function createDeck(): Card[] {
  const deck: Card[] = [];

  for (let i = 1; i <= 60; i++) {
    deck.push({
      id: crypto.randomUUID(),
      name: `Carta ${i}`,
      type: 'unicorn',
      description: '',
      image: '',
      effects: [],
    });
  }
  return deck;
}

export function createGameState(room: Room): GameState {
  const deck = new DeckManager(createDeck());

  deck.shuffle();

  const players = room.players.map((player) => ({
    ...player,
    hand: [] as Card[],
    stable: [] as Card[],
    upgrades: [] as Card[],
    downgrades: [] as Card[],
  }));

  // Repartir 5 cartas
  for (const player of players) {
    for (let i = 0; i < 5; i++) {
      const card = deck.draw();
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
    deck: [],
    discardPile: [],
  };
}
