import type { GameLogEvent } from '../../../shared/types/Game.ts';
import type { GameState } from './models/GameState.ts';

let logSeq = 0;

function getBasicEvent(text: string): GameLogEvent | undefined {
  if (text.startsWith('Comienza el turno de')) return 'turn-start';
  if (text.includes('terminó su turno')) return 'turn-end';
  if (text.includes('jugó') || text.includes('apiló')) return 'play-card';
  if (text.includes('descartó')) return 'discard-card';
  if (
    text.includes('del mazo') ||
    text.includes('robó una carta y terminó su turno') ||
    text.includes('robó un Exploding Kitten') ||
    text.includes('robó un Imploding Kitten')
  ) {
    return 'draw-card';
  }
  return undefined;
}

export function addLog(
  game: GameState,
  text: string,
  opts: {
    playerId?: string;
    cardImage?: string;
    cardImages?: string[];
    reactionCardImage?: string;
    reactionCardImages?: string[];
    relatedCardImage?: string;
    cardStatus?: 'sacrificed' | 'destroyed';
    relatedCardStatus?: 'sacrificed' | 'destroyed';
    event?: GameLogEvent;
  } = {},
): void {
  const player = opts.playerId
    ? game.players.find((candidate) => candidate.id === opts.playerId)
    : undefined;

  game.log.push({
    id: `log-${Date.now()}-${++logSeq}`,
    text,
    event: opts.event ?? getBasicEvent(text),
    playerId: opts.playerId,
    playerName: player?.name,
    cardImage: opts.cardImage,
    cardImages: opts.cardImages,
    reactionCardImage: opts.reactionCardImage,
    reactionCardImages: opts.reactionCardImages,
    relatedCardImage: opts.relatedCardImage,
    cardStatus: opts.cardStatus,
    relatedCardStatus: opts.relatedCardStatus,
    turn: game.turn,
    timestamp: Date.now(),
  });
}
