/** Reasons that are resolved through the select-choice socket event. */
export const choiceReasons = new Set<string>([
  'three_of_a_kind',
  'favor',
  'neigh_thank_you',
  'beginning_effect_picker',
  'ghost_guide',
  'unicorn_of_war',
  'unicorn_rainbow_princess',
  'zombie_unicorn',
]);

export function isChoiceReason(reason: string): boolean {
  return choiceReasons.has(reason);
}

/** Registers the choice transport while the reason-specific branches migrate here. */
export function registerChoiceHandlers(
  io: GameServer,
  socket: GameSocket,
  legacyHandler: (io: GameServer, socket: GameSocket) => void,
): void {
  legacyHandler(io, socket);
}
import type { GameServer, GameSocket } from './socketTypes.ts';
