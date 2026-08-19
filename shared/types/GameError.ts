export type GameErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'PLAYER_NOT_IN_ROOM'
  | 'GAME_NOT_STARTED'
  | 'GAME_ALREADY_STARTED'
  | 'NOT_HOST'
  | 'NOT_YOUR_TURN'
  | 'INVALID_PLAYER'
  | 'INVALID_PHASE'
  | 'ACTION_ALREADY_USED'
  | 'PENDING_ACTION'
  | 'NO_PENDING_ACTION'
  | 'INVALID_PENDING_ACTION'
  | 'INVALID_SELECTION'
  | 'PLAYER_NOT_FOUND'
  | 'CARD_NOT_FOUND'
  | 'DECK_EMPTY'
  | 'ACTION_NOT_ALLOWED'
  | 'EMPTY_CHAT'
  | 'INTERNAL_ERROR';

export type GameActionName =
  | 'start-game'
  | 'confirm-start-game'
  | 'play-card'
  | 'draw-action-card'
  | 'discard-card'
  | 'select-player'
  | 'select-stable-card'
  | 'select-hand-card'
  | 'next-phase'
  | 'end-turn'
  | 'restart-game'
  | 'cancel-action'
  | 'select-choice'
  | 'select-discard-card'
  | 'select-deck-card'
  | 'select-nursery-card'
  | 'select-own-hand-card'
  | 'neigh-accept'
  | 'play-neigh'
  | 'toggle-debug-mode'
  | 'send-chat'
  | 'unknown';

export interface GameError {
  code: GameErrorCode;
  message: string;
  action: GameActionName;
}
