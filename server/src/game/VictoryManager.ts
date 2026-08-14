import type { GameState } from './models/GameState.ts';
import type { Player } from './models/Player.ts';
import { getStablePower } from './unstable-unicorns/engine/stablePower.ts';

function getUnicornCount(player: Player): number {
  return player.stable.filter((c) => c.cardType === 'unicorn').length;
}

function getUnicornNameLetters(player: Player): number {
  return player.stable
    .filter((c) => c.cardType === 'unicorn')
    .reduce((total, card) => total + card.name.length, 0);
}

export class VictoryManager {
  static checkWinner(game: GameState) {
    if (game.winnerId) return;

    // Regla 1: el primer jugador en alcanzar la cantidad objetivo de unicornios
    // (7 unicornios, o 6 si se juega con 6 a 8 jugadores).
    const target = game.players.length >= 6 ? 6 : 7;

    for (const player of game.players) {
      if (getStablePower(player) >= target) {
        game.winnerId = player.id;
        return;
      }
    }

    // Reglas 2 y 3: si el mazo se agotó y aún no hay ganador.
    if (game.deck.length === 0) {
      this.resolveDeckOutcome(game);
    }
  }

  private static resolveDeckOutcome(game: GameState) {
    if (game.players.length === 0) return;

    // Regla 2: gana el jugador con más cartas de unicornio en su establo.
    const maxCount = Math.max(...game.players.map(getUnicornCount));
    const leaders = game.players.filter((p) => getUnicornCount(p) === maxCount);

    if (leaders.length === 1) {
      game.winnerId = leaders[0].id;
      return;
    }

    // Regla 3: desempate por el número de letras en los nombres de los
    // unicornios del establo.
    const maxLetters = Math.max(...leaders.map(getUnicornNameLetters));
    const letterLeaders = leaders.filter(
      (p) => getUnicornNameLetters(p) === maxLetters,
    );

    if (letterLeaders.length === 1) {
      game.winnerId = letterLeaders[0].id;
    }
    // Si persiste el empate en letras, no se declara ganador.
  }
}