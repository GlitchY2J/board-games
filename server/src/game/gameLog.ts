import type { GameLogAction, GameLogCardRef, GameLogEvent } from '../../../shared/types/Game.ts';
import type { GameState } from './models/GameState.ts';

let logSeq = 0;

export function addDeckSearchLog(
  game: GameState,
  playerId: string,
  card?: { name: string; image: string },
  count = 1,
  sourceCard?: { name?: string; image: string },
  visibility?: { playerIds: string[]; publicText: string },
): void {
  const player = game.players.find((candidate) => candidate.id === playerId);
  const text = card
    ? `${player?.name ?? 'Jugador'} buscó "${card.name}" en el mazo`
    : `${player?.name ?? 'Jugador'} buscó ${count > 1 ? 'cartas' : 'una carta'} en el mazo`;

  addLog(game, text, {
    playerId,
    event: 'search-deck',
    cardImage: card?.image,
    action: 'search-deck',
    cards: [
      ...(sourceCard ? [{ ...sourceCard, role: 'source' as const }] : []),
      ...(card ? [{ ...card, role: 'result' as const, status: 'searched' as const }] : []),
    ],
    visibleToPlayerIds: visibility?.playerIds,
    publicText: visibility?.publicText,
  });
}

function getBasicEvent(text: string): GameLogEvent | undefined {
  if (text.startsWith('Comienza el turno de')) return 'turn-start';
  if (text.includes('terminó su turno')) return 'turn-end';
  if (text.includes('jugó') || text.includes('apiló')) return 'play-card';
  if (text.includes('buscó') && text.includes('mazo')) return 'search-deck';
  if (text.includes('descartó')) return 'discard-card';
  if (text.includes('destruyó')) return 'destroy-card';
  if (text.includes('sacrificó')) return 'sacrifice-card';
  if (text.includes('trajo') && text.includes('descarte')) return 'recover-card';
  if (text.includes('robó') && (text.includes('mano') || text.includes('establo'))) return 'steal-card';
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
    playerName?: string;
    targetPlayerId?: string;
    targetPlayerName?: string;
    action?: GameLogAction;
    cards?: GameLogCardRef[];
    cardImage?: string;
    cardImages?: string[];
    reactionCardImage?: string;
    reactionCardImages?: string[];
    reactionPlayerNames?: string[];
    reactionCardBlocked?: boolean[];
    originalCardBlocked?: boolean;
    relatedCardImage?: string;
    cardStatus?: 'sacrificed' | 'destroyed';
    relatedCardStatus?: 'sacrificed' | 'destroyed';
    event?: GameLogEvent;
    visibleToPlayerIds?: string[];
    publicText?: string;
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
    playerName: opts.playerName ?? player?.name,
    targetPlayerId: opts.targetPlayerId,
    targetPlayerName: opts.targetPlayerName,
    action: opts.action,
    cards: opts.cards,
    cardImage: opts.cardImage,
    cardImages: opts.cardImages,
    reactionCardImage: opts.reactionCardImage,
    reactionCardImages: opts.reactionCardImages,
    reactionPlayerNames: opts.reactionPlayerNames,
    reactionCardBlocked: opts.reactionCardBlocked,
    originalCardBlocked: opts.originalCardBlocked,
    relatedCardImage: opts.relatedCardImage,
    cardStatus: opts.cardStatus,
    relatedCardStatus: opts.relatedCardStatus,
    visibleToPlayerIds: opts.visibleToPlayerIds,
    publicText: opts.publicText,
    turn: game.turn,
    timestamp: Date.now(),
  });
}
