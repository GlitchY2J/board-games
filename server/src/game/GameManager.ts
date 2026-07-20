import { loadCards } from './CardLoader.ts';
import { DeckManager } from './DeckManager.ts';
import { GamePlayer } from './Player.ts';
import { GameState } from './GameState.ts';

export class GameManager {
  static create(players: GamePlayer[]): GameState {
    const cards = loadCards();
    const deck = new DeckManager(cards);

    deck.shuffle();

    for (const player of players) {
      player.hand = [];
      for (let i = 0; i < 5; i++) {
        const card = deck.draw();

        if (card) {
          player.hand.push(card);
        }
      }
    }

    return {
      players,
      deck,
      currentPlayer: 0,
      turn: 1,
      started: true,
    };
  }
}
