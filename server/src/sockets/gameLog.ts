import type { GameState } from '../game/models/GameState.ts';

let logSeq = 0;

export function addLog(
  game: GameState,
  text: string,
  opts: { playerId?: string; cardImage?: string; reactionCardImage?: string; reactionCardImages?: string[]; relatedCardImage?: string; cardStatus?: 'sacrificed' | 'destroyed'; relatedCardStatus?: 'sacrificed' | 'destroyed' } = {},
): void {
  const player = opts.playerId
    ? game.players.find((p) => p.id === opts.playerId)
    : undefined;

  game.log.push({
    id: `log-${Date.now()}-${++logSeq}`,
    text,
    playerId: opts.playerId,
    playerName: player?.name,
    cardImage: opts.cardImage,
    reactionCardImage: opts.reactionCardImage,
    reactionCardImages: opts.reactionCardImages,
    relatedCardImage: opts.relatedCardImage,
    cardStatus: opts.cardStatus,
    relatedCardStatus: opts.relatedCardStatus,
    turn: game.turn,
    timestamp: Date.now(),
  });
}
