import type { GameDefinition, GameId } from '../../../shared/types/GameDefinition.ts';

export class GameRegistry {
  private readonly games = new Map<GameId, GameDefinition>();

  register(game: GameDefinition): void {
    if (this.games.has(game.id)) {
      throw new Error(`El juego ${game.id} ya está registrado`);
    }

    this.games.set(game.id, game);
  }

  getAll(): GameDefinition[] {
    return [...this.games.values()];
  }

  getById(gameId: GameId): GameDefinition | undefined {
    return this.games.get(gameId);
  }
}
