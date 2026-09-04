import type { Card } from './models/Card.ts';
import type { NeighAnimation, ExplosionAnimation, DrawAnimation, DiscardAnimation, PlayAnimation, StealAnimation, ShuffleAnimation, InitialDealAnimation } from '../../../shared/types/SocketEvents.ts';

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

export function createInitialDealAnimations(
  players: Array<{ id: string; hand: Card[] }>,
  explodingKittens: boolean,
): InitialDealAnimation[] {
  const animations: InitialDealAnimation[] = [];
  const hands = players.map((player) => ({
    playerId: player.id,
    cards: explodingKittens
      ? player.hand.filter((card) => card.id !== 'defuse')
      : player.hand,
  }));

  if (explodingKittens) {
    for (const player of players) {
      const defuse = player.hand.find((card) => card.id === 'defuse');
      if (defuse) animations.push(toInitialDealAnimation(player.id, defuse, true));
    }
  }

  const maxCards = Math.max(0, ...hands.map((hand) => hand.cards.length));
  for (let cardIndex = 0; cardIndex < maxCards; cardIndex += 1) {
    for (const hand of hands) {
      const card = hand.cards[cardIndex];
      if (card) animations.push(toInitialDealAnimation(hand.playerId, card));
    }
  }

  return animations;
}

function toInitialDealAnimation(
  playerId: string,
  card: Card,
  simultaneous = false,
): InitialDealAnimation {
  return {
    animId: `initial-deal-${++seq}`,
    playerId,
    card: { uid: card.uid, id: card.id, name: card.name, image: card.image },
    simultaneous,
  };
}

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
  revealToOthers = false,
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
    revealToOthers,
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

interface QueuedShuffleAnimation extends ShuffleAnimation {
  roomCode: string;
}

const shuffleBuffer: QueuedShuffleAnimation[] = [];

export function enqueueShuffleAnimation(
  roomCode: string,
  playerId: string,
  returnedCards?: Card[],
): void {
  shuffleBuffer.push({
    roomCode,
    playerId,
    animId: `shuffle-${Math.random().toString(36).slice(2, 8)}`,
    returnedCards: returnedCards?.map((card) => ({
      uid: card.uid,
      name: card.name,
      image: card.image,
    })),
  });
}

export function drainShuffleAnimations(roomCode: string): ShuffleAnimation[] {
  const drained: ShuffleAnimation[] = [];
  for (let i = shuffleBuffer.length - 1; i >= 0; i--) {
    if (shuffleBuffer[i].roomCode === roomCode) {
      const [item] = shuffleBuffer.splice(i, 1);
      drained.push(item);
    }
  }
  return drained.reverse();
}

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

interface QueuedExplosionAnimation extends ExplosionAnimation {
  roomCode: string;
}

const explosionBuffer: QueuedExplosionAnimation[] = [];

export function enqueueExplosionAnimation(
  roomCode: string,
  playerId: string,
  playerName: string,
  type: 'exploding' | 'imploding' = 'exploding',
  stage: 'revealed' | 'eliminated' = 'eliminated',
): void {
  explosionBuffer.push({
    animId: `explosion-${Math.random().toString(36).slice(2, 8)}`,
    roomCode,
    playerId,
    playerName,
    type,
    stage,
  });
}

export function drainExplosionAnimations(roomCode: string): ExplosionAnimation[] {
  const drained: ExplosionAnimation[] = [];
  for (let i = explosionBuffer.length - 1; i >= 0; i--) {
    if (explosionBuffer[i].roomCode === roomCode) {
      const [item] = explosionBuffer.splice(i, 1);
      drained.push(item);
    }
  }
  return drained.reverse();
}

