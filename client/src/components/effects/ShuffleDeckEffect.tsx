import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ShuffleAnimation } from '../../../../shared/types/SocketEvents.ts';
import './ShuffleDeckEffect.css';

interface Props {
  animation: ShuffleAnimation;
  gameId?: string;
  localPlayerId: string;
  onDone(): void;
}

const RETURN_DURATION = 900;
const SHUFFLE_DURATION = 1400;

export default function ShuffleDeckEffect({ animation, gameId, localPlayerId, onDone }: Props) {
  const [phase, setPhase] = useState<'returning' | 'shuffling'>(
    animation.returnedCards?.length ? 'returning' : 'shuffling',
  );
  const cardRefs = useRef<(HTMLImageElement | null)[]>([]);

  useLayoutEffect(() => {
    if (phase !== 'returning' || !animation.returnedCards?.length) return;
    const deck = document.querySelector('[data-deck]');
    const deckRect = deck?.getBoundingClientRect();
    const sourcePlayer = document.querySelector(`[data-player-id="${animation.playerId}"]`);
    const sourceRect = sourcePlayer?.getBoundingClientRect();
    const isLocal = animation.playerId === localPlayerId;

    const animations = cardRefs.current.map((element, index) => {
      if (!element) return null;
      const card = animation.returnedCards![index];
      const exactCard = isLocal
        ? document.querySelector(`[data-card-uid="${card.uid}"]`)
        : null;
      const startRect = exactCard?.getBoundingClientRect() ?? sourceRect;
      const startX = startRect ? startRect.left + startRect.width / 2 - 50 : window.innerWidth / 2 - 50;
      const startY = startRect ? startRect.top + startRect.height / 2 - 70 : window.innerHeight - 150;
      const endX = deckRect ? deckRect.left + deckRect.width / 2 - 50 : window.innerWidth / 2 - 50;
      const endY = deckRect ? deckRect.top + deckRect.height / 2 - 70 : window.innerHeight / 2 - 70;

      return element.animate([
        { transform: `translate(${startX}px, ${startY}px) rotate(${(index - 2) * 4}deg) scale(1)`, opacity: 1 },
        { transform: `translate(${endX}px, ${endY}px) rotate(${index * 8}deg) scale(0.7)`, opacity: 1, offset: 0.82 },
        { transform: `translate(${endX}px, ${endY}px) rotate(${index * 8}deg) scale(0.45)`, opacity: 0 },
      ], {
        duration: RETURN_DURATION,
        delay: index * 20,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      });
    });

    const timer = window.setTimeout(() => setPhase('shuffling'), RETURN_DURATION + 100);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((item) => item?.cancel());
    };
  }, [animation, localPlayerId, phase]);

  useEffect(() => {
    if (phase !== 'shuffling') return;
    const timer = window.setTimeout(onDone, SHUFFLE_DURATION);
    return () => window.clearTimeout(timer);
  }, [onDone, phase]);

  const isLocal = animation.playerId === localPlayerId;
  const backImage = gameId === 'exploding-kittens'
    ? '/cards/exploding-kittens/base/back-card.png'
    : '/cards/unstable-unicorns/base/card_back.png';

  if (phase === 'returning') {
    return (
      <div className="shuffle-returning-cards" aria-hidden="true">
        {animation.returnedCards?.map((card, index) => (
          <img
            key={card.uid}
            ref={(element) => { cardRefs.current[index] = element; }}
            src={isLocal ? card.image : backImage}
            alt=""
          />
        ))}
      </div>
    );
  }

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
