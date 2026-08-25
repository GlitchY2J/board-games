import type { GameDefinition, GameId } from '../../../shared/types/GameDefinition.ts';
import type { GameEngine } from './GameEngine.ts';

export class GameRegistry {
  private readonly games = new Map<GameId, GameDefinition>();
  private readonly engines = new Map<GameId, GameEngine>();

  register(game: GameDefinition, engine?: GameEngine): void {
    if (this.games.has(game.id)) {
      throw new Error(`El juego ${game.id} ya está registrado`);
    }

    this.games.set(game.id, game);
    if (engine) {
      this.engines.set(game.id, engine);
    }
  }

  getAll(): GameDefinition[] {
    return [...this.games.values()];
  }

  getById(gameId: GameId): GameDefinition | undefined {
    return this.games.get(gameId);
  }

  getEngine(gameId: GameId): GameEngine | undefined {
    return this.engines.get(gameId);
  }
}
