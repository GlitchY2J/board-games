import type {
  GameDefinition,
  GameId,
  RoomSettings,
} from '../../../shared/types/GameDefinition.ts';
import type { GameEngine } from './GameEngine.ts';

export interface SettingsValidationResult {
  valid: boolean;
  code?:
    | 'GAME_NOT_AVAILABLE'
    | 'INVALID_ROOM_SETTINGS'
    | 'INVALID_GAME_VERSION'
    | 'INVALID_GAME_EXPANSION'
    | 'DUPLICATE_GAME_EXPANSION'
    | 'NOT_ENOUGH_PLAYERS'
    | 'TOO_MANY_PLAYERS';
  message?: string;
}

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

  validateSettings(
    settings: RoomSettings,
    connectedPlayers?: number,
  ): SettingsValidationResult {
    if (settings.gameId === null) {
      if (settings.versionId !== null || settings.expansionIds.length > 0) {
        return {
          valid: false,
          code: 'INVALID_ROOM_SETTINGS',
          message: 'No puedes seleccionar una versión o expansión sin elegir un juego.',
        };
      }
      return { valid: true };
    }

    const game = this.getById(settings.gameId);
    if (!game || !game.available) {
      return {
        valid: false,
        code: 'GAME_NOT_AVAILABLE',
        message: 'El juego seleccionado no existe o no está disponible.',
      };
    }

    const version = game.versions.find((candidate) => candidate.id === settings.versionId);
    if (!version || !version.available || version.gameId !== game.id) {
      return {
        valid: false,
        code: 'INVALID_GAME_VERSION',
        message: 'La versión seleccionada no es válida o no está disponible.',
      };
    }

    if (new Set(settings.expansionIds).size !== settings.expansionIds.length) {
      return {
        valid: false,
        code: 'DUPLICATE_GAME_EXPANSION',
        message: 'No puedes seleccionar una expansión más de una vez.',
      };
    }

    for (const expansionId of settings.expansionIds) {
      const expansion = game.expansions.find((candidate) => candidate.id === expansionId);
      if (
        !expansion ||
        expansion.gameId !== game.id ||
        !expansion.available ||
        (expansion.versionIds && !expansion.versionIds.includes(version.id))
      ) {
        return {
          valid: false,
          code: 'INVALID_GAME_EXPANSION',
          message: 'Una o más expansiones no son compatibles con el juego seleccionado.',
        };
      }
    }

    if (connectedPlayers !== undefined && connectedPlayers < game.minPlayers) {
      return {
        valid: false,
        code: 'NOT_ENOUGH_PLAYERS',
        message: `Se necesitan al menos ${game.minPlayers} jugadores para iniciar.`,
      };
    }

    if (connectedPlayers !== undefined && connectedPlayers > game.maxPlayers) {
      return {
        valid: false,
        code: 'TOO_MANY_PLAYERS',
        message: `Este juego permite como máximo ${game.maxPlayers} jugadores.`,
      };
    }

    return { valid: true };
  }
}
