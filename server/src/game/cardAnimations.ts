import type { Card } from './models/Card.ts';
import type { NeighAnimation, DrawAnimation, DiscardAnimation, PlayAnimation, StealAnimation } from '../../../shared/types/SocketEvents.ts';

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

interface QueuedAnimation extends CardAnimation {
  roomCode: string;
}

const buffer: QueuedAnimation[] = [];
let seq = 0;

export function enqueueCardAnimation(
  roomCode: string,
  type: CardAnimType,
  ownerId: string,
  card: Card,
): void {
  buffer.push({
    animId: `${type}-${++seq}-${Math.random().toString(36).slice(2, 8)}`,
    roomCode,
    type,
    ownerId,
    card: {
      uid: card.uid,
      id: card.id,
      name: card.name,
      image: card.image,
    },
  });
}

export function drainCardAnimations(roomCode: string): CardAnimation[] {
  const drained: CardAnimation[] = [];

  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i].roomCode === roomCode) {
      const [item] = buffer.splice(i, 1);
      drained.push(item);
    }
  }

  return drained;
}

interface QueuedNeighAnimation extends NeighAnimation {
  roomCode: string;
}

const neighBuffer: QueuedNeighAnimation[] = [];

export function enqueueNeighAnimation(
  roomCode: string,
  playerId: string,
  playerName: string,
  cardName: string,
  type: 'neigh' | 'super_neigh',
): void {
  neighBuffer.push({
    animId: `neigh-${type}-${Math.random().toString(36).slice(2, 8)}`,
    roomCode,
    playerId,
    playerName,
    cardName,
    type,
  });
}

export function drainNeighAnimations(roomCode: string): NeighAnimation[] {
  const drained: NeighAnimation[] = [];

  for (let i = neighBuffer.length - 1; i >= 0; i--) {
    if (neighBuffer[i].roomCode === roomCode) {
      const [item] = neighBuffer.splice(i, 1);
      drained.push(item);
    }
  }

  return drained.reverse();
}

interface QueuedDrawAnimation extends DrawAnimation {
  roomCode: string;
}

const drawBuffer: QueuedDrawAnimation[] = [];

interface QueuedStealAnimation extends StealAnimation {
  roomCode: string;
}

const stealBuffer: QueuedStealAnimation[] = [];

export function enqueueStealAnimation(
  roomCode: string,
  sourcePlayerId: string,
  targetPlayerId: string,
  card: Card,
): void {
  stealBuffer.push({
    animId: `steal-${Math.random().toString(36).slice(2, 8)}`,
    roomCode,
    sourcePlayerId,
    targetPlayerId,
    card: {
      uid: card.uid,
      id: card.id,
      name: card.name,
      image: card.image,
    },
  });
}

export function drainStealAnimations(roomCode: string): StealAnimation[] {
  const drained: StealAnimation[] = [];
  for (let i = stealBuffer.length - 1; i >= 0; i--) {
    if (stealBuffer[i].roomCode === roomCode) {
      const [item] = stealBuffer.splice(i, 1);
      drained.push(item);
    }
  }
  return drained.reverse();
}

export function enqueueDrawAnimation(
  roomCode: string,
  playerId: string,
  card: Card,
): void {
  drawBuffer.push({
    animId: `draw-${Math.random().toString(36).slice(2, 8)}`,
    roomCode,
    playerId,
    card: {
      uid: card.uid,
      id: card.id,
      name: card.name,
      image: card.image,
    },
  });
}

export function drainDrawAnimations(roomCode: string): DrawAnimation[] {
  const drained: DrawAnimation[] = [];
  for (let i = drawBuffer.length - 1; i >= 0; i--) {
    if (drawBuffer[i].roomCode === roomCode) {
      const [item] = drawBuffer.splice(i, 1);
      drained.push(item);
    }
  }
  return drained.reverse();
}

interface QueuedDiscardAnimation extends DiscardAnimation {
  roomCode: string;
}

const discardBuffer: QueuedDiscardAnimation[] = [];

export function enqueueDiscardAnimation(
  roomCode: string,
  playerId: string,
  card: Card,
): void {
  discardBuffer.push({
    animId: `discard-${Math.random().toString(36).slice(2, 8)}`,
    roomCode,
    playerId,
    card: {
      uid: card.uid,
      id: card.id,
      name: card.name,
      image: card.image,
    },
  });
}

export function drainDiscardAnimations(roomCode: string): DiscardAnimation[] {
  const drained: DiscardAnimation[] = [];
  for (let i = discardBuffer.length - 1; i >= 0; i--) {
    if (discardBuffer[i].roomCode === roomCode) {
      const [item] = discardBuffer.splice(i, 1);
      drained.push(item);
    }
  }
  return drained.reverse();
}

interface QueuedPlayAnimation extends PlayAnimation {
  roomCode: string;
}

const playBuffer: QueuedPlayAnimation[] = [];

export function enqueuePlayAnimation(
  roomCode: string,
  playerId: string,
  card: Card,
): void {
  playBuffer.push({
    animId: `play-${Math.random().toString(36).slice(2, 8)}`,
    roomCode,
    playerId,
    card: {
      uid: card.uid,
      id: card.id,
      name: card.name,
      image: card.image,
    },
  });
}

export function drainPlayAnimations(roomCode: string): PlayAnimation[] {
  const drained: PlayAnimation[] = [];
  for (let i = playBuffer.length - 1; i >= 0; i--) {
    if (playBuffer[i].roomCode === roomCode) {
      const [item] = playBuffer.splice(i, 1);
      drained.push(item);
    }
  }
  return drained.reverse();
}
