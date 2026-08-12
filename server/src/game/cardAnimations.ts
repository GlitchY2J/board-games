import type { Card } from './models/Card.ts';

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