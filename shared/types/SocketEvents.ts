import type { GameState } from './Game.ts';
import type { GameError } from './GameError.ts';
import type { ChatMessage } from './Game.ts';
import type { RoomSettings } from './GameDefinition.ts';
import type { PublicRoom } from './PublicRoom.ts';

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  avatar?: string;
}

export interface CreateRoomPayload {
  hostName: string;
  game?: string;
  avatar?: string;
}

export interface KickPlayerPayload {
  roomCode: string;
  playerId: string;
}

export interface PlayCardPayload {
  roomCode: string;
  playerId: string;
  cardId: string;
  cardIds?: string[];
}

export interface DrawActionCardPayload {
  roomCode: string;
  playerId: string;
}

export interface DiscardCardsPayload {
  roomCode: string;
  playerId: string;
  cardIds: string[];
}

export interface SelectPlayerPayload {
  roomCode: string;
  playerId: string;
}

export interface SelectPlayersPayload {
  roomCode: string;
  playerIds: string[];
}

export interface SelectStableCardPayload {
  roomCode: string;
  cardId: string | string[];
}

export interface SelectHandCardPayload {
  roomCode: string;
  cardId: string;
}

export interface CancelActionPayload {
  roomCode: string;
}

export interface ToggleExpansionPayload {
  roomCode: string;
  expansionId: string;
}

export interface UpdateRoomSettingsPayload {
  roomCode: string;
  settings: RoomSettings;
}

export interface SelectChoicePayload {
  roomCode: string;
  choice: string;
}

export interface SelectDiscardCardPayload {
  roomCode: string;
  cardId: string;
}

export interface SelectOracleCardsPayload {
  roomCode: string;
  handCardId: string;
  orderCardIds: string[];
}

export interface NeighAcceptPayload {
  roomCode: string;
}

export interface PlayNeighPayload {
  roomCode: string;
  cardId: string;
}

export interface RoomCreateResponse {
  success: boolean;
  room?: PublicRoom;
  error?: string;
}

export interface ResumeSessionPayload {
  roomCode: string;
  sessionToken: string;
}

export interface LeaveRoomPayload {
  roomCode: string;
}

export interface SendChatPayload {
  roomCode: string;
  text: string;
}

export interface ChatMessageEvent {
  roomCode: string;
  message: ChatMessage;
}

export type CardAnimType = 'sacrifice' | 'destroy';

export interface CardAnimation {
  animId: string;
  type: CardAnimType;
  ownerId: string;
  card: {
    uid: string;
    id: string;
    name: string;
    image: string;
  };
}

export interface NeighAnimation {
  animId: string;
  playerId: string;
  playerName: string;
  cardName: string;
  type: 'neigh' | 'super_neigh';
}

export interface DrawAnimation {
  animId: string;
  playerId: string;
  card: {
    uid: string;
    id: string;
    name: string;
    image: string;
  };
}

export interface ResolveExplodingKittenPayload {
  roomCode: string;
  useDefuse: boolean;
}

export interface ResolveSeeTheFuturePayload {
  roomCode: string;
}

export interface StealAnimation {
  animId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  card: {
    uid: string;
    id: string;
    name: string;
    image: string;
  };
}

export interface DiscardAnimation {
  animId: string;
  playerId: string;
  card: {
    uid: string;
    id: string;
    name: string;
    image: string;
  };
}

export interface PlayAnimation {
  animId: string;
  playerId: string;
  card: {
    uid: string;
    id: string;
    name: string;
    image: string;
  };
}

export interface ShuffleAnimation {
  animId: string;
  playerId: string;
}

export interface ResumeSessionResponse {
  success: boolean;
  playerId?: string;
  room?: PublicRoom;
  gameState?: GameState;
  error?: string;
}

export interface ServerToClientEvents {
  'room-updated': (room: PublicRoom) => void;
  'game-started': (gameState: GameState) => void;
  'game-updated': (gameState: GameState) => void;
  'game-restarted': (gameState: GameState) => void;
  'game-error': (error: GameError) => void;
  'card-animations': (animations: CardAnimation[]) => void;
  'neigh-animations': (animations: NeighAnimation[]) => void;
  'draw-animations': (animations: DrawAnimation[]) => void;
  'steal-animations': (animations: StealAnimation[]) => void;
  'discard-animations': (animations: DiscardAnimation[]) => void;
  'play-animations': (animations: PlayAnimation[]) => void;
  'shuffle-animations': (animations: ShuffleAnimation[]) => void;
  'turn-order-assigned': (players: { id: string; name: string }[]) => void;
  'chat-message': (payload: ChatMessageEvent) => void;
  'kicked-from-room': (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  // Join Room
  'join-room': (payload: JoinRoomPayload) => void;

  // Create Room
  'room:create': (
    payload: CreateRoomPayload,
    callback: (response: RoomCreateResponse) => void,
  ) => void;

  // Leave Room
  'leave-room': (payload: LeaveRoomPayload) => void;
  'leave-game': (payload: LeaveRoomPayload) => void;
  'kick-player': (payload: KickPlayerPayload) => void;

  // Toggle Expansion
  'toggle-expansion': (payload: ToggleExpansionPayload) => void;
  'update-room-settings': (payload: UpdateRoomSettingsPayload) => void;
  'add-dummy-player': (roomCode: string) => void;
  'remove-dummy-player': (payload: { roomCode: string; playerId: string }) => void;

  // Start Game
  'start-game': (roomCode: string) => void;

  // Confirm Start Game (after turn order is shown)
  'confirm-start-game': (roomCode: string) => void;
  'confirm-restart-game': (roomCode: string) => void;

  // Play Card
  'play-card': (payload: PlayCardPayload) => void;

  // Draw Action Card
  'draw-action-card': (payload: DrawActionCardPayload) => void;

  // Discard Cards
  'discard-cards': (payload: DiscardCardsPayload) => void;

  // Select Player
  'select-player': (payload: SelectPlayerPayload) => void;
  'select-players': (payload: SelectPlayersPayload) => void;

  // Select Stable Card
  'select-stable-card': (payload: SelectStableCardPayload) => void;

  // Select Hand Card
  'select-hand-card': (payload: SelectHandCardPayload) => void;
  'resolve-exploding-kitten': (payload: ResolveExplodingKittenPayload) => void;
  'resolve-see-the-future': (payload: ResolveSeeTheFuturePayload) => void;

  // Next Phase
  'next-phase': (roomCode: string) => void;

  // End Turn
  'end-turn': (roomCode: string) => void;

  // Restart Game
  'restart-game': (roomCode: string) => void;
  'ready-restart': (roomCode: string) => void;

  // Toggle Debug Mode
  'toggle-debug-mode': (roomCode: string) => void;

  // Cancel Action
  'cancel-action': (payload: CancelActionPayload) => void;

  // Select Choice
  'select-choice': (payload: SelectChoicePayload) => void;

  // Select Discard Card
  'select-discard-card': (payload: SelectDiscardCardPayload) => void;

  // Select Deck Card
  'select-deck-card': (payload: SelectDiscardCardPayload) => void;

  // Select Nursery Card
  'select-nursery-card': (payload: SelectDiscardCardPayload) => void;

  // Select Own Hand Card
  'select-own-hand-card': (payload: SelectDiscardCardPayload) => void;

  // Select Oracle Cards
  'select-oracle-cards': (payload: SelectOracleCardsPayload) => void;

  // Neigh Accept
  'neigh-accept': (payload: NeighAcceptPayload) => void;

  // Play Neigh
  'play-neigh': (payload: PlayNeighPayload) => void;

  // Resume Session
  'resume-session': (
    payload: ResumeSessionPayload,
    callback: (response: ResumeSessionResponse) => void,
  ) => void;

  // Chat
  'send-chat': (payload: SendChatPayload) => void;
}
