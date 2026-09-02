import { useEffect } from 'react';
import type { ShuffleAnimation } from '../../../../shared/types/SocketEvents.ts';
import './ShuffleDeckEffect.css';

interface Props {
  animation: ShuffleAnimation;
  gameId?: string;
  onDone(): void;
}

export default function ShuffleDeckEffect({ animation, gameId, onDone }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`shuffle-deck-effect ${gameId === 'exploding-kittens' ? 'game-exploding-kittens' : ''}`}
      data-shuffle-player={animation.playerId}
      aria-live="polite"
    >
      <div className="shuffle-deck-stack" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <strong>Barajando el mazo</strong>
    </div>
  );
}
