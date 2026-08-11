import type { GameState } from '../game/models/GameState.ts';

let logSeq = 0;

export function addLog(
  game: GameState,
  text: string,
  opts: { playerId?: string } = {},
): void {
  const player = opts.playerId
    ? game.players.find((p) => p.id === opts.playerId)
    : undefined;

  game.log.push({
    id: `log-${Date.now()}-${++logSeq}`,
    text,
    playerId: opts.playerId,
    playerName: player?.name,
    turn: game.turn,
    timestamp: Date.now(),
  });
}
