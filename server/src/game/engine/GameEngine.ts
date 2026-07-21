import type { GameState } from '../models/GameState.ts';
import { TurnManager } from './TurnManager.ts';
import { UnstableUnicornsSetup } from '../unstable-unicorns/setup.ts';

export class GameEngine {
  constructor(public state: GameState) {}

  // Iniciar Juego
  startGame(): void {
    UnstableUnicornsSetup.initialize(this.state);
  }

  // Jugar Carta
  playCard(playerId: string, cardId: string): boolean {
    const player = this.state.players.find((p) => p.id === playerId);

    if (!player) return false;

    const index = player.hand.findIndex((c) => c.id === cardId);

    if (index === -1) return false;

    const card = player.hand.splice(index, 1)[0];

    player.stable.push(card);

    return true;
  }

  // Robar Carta
  drawCard(playerId: string): void {
    const player = this.state.players.find((p) => p.id === playerId);

    if (!player) return;

    const card = this.state.deck.draw();

    if (!card) return;

    player.hand.push(card);
  }

  // Terminar Turno
  endTurn(): void {
    TurnManager.nextTurn(this.state);
  }
}
