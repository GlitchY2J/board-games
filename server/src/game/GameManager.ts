import { CardLoader } from './CardLoader.ts';
import { DeckManager } from './DeckManager.ts';
import { GamePlayer } from './Player.ts';
import { GameState } from './models/GameState.ts';

export class GameManager {
  static create(players: GamePlayer[]): GameState {
    const cards = CardLoader.load();
    const deck = new DeckManager(cards);

    deck.shuffle();

    for (const player of players) {
      player.hand = [];
      player.stable = [];
      player.upgrades = [];
      player.downgrades = [];
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
