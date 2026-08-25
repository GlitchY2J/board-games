import { useEffect, useLayoutEffect, useRef } from 'react';
import type { StealAnimation } from '../../../../shared/types/SocketEvents.ts';
import './CardStealEffect.css';

interface Props {
  animation: StealAnimation;
  localPlayerId: string;
  onDone(): void;
}

export default function CardStealEffect({ animation, localPlayerId, onDone }: Props) {
  const cardRef = useRef<HTMLImageElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const element = cardRef.current;
      if (!element) return;

      const source = document.querySelector(
        `[data-player-id="${animation.sourcePlayerId}"]`,
      );
      const destination = animation.targetPlayerId === localPlayerId
        ? document.querySelector('[data-hand]')
        : document.querySelector(`[data-player-id="${animation.targetPlayerId}"]`);

      const sourceRect = source?.getBoundingClientRect();
      const destinationRect = destination?.getBoundingClientRect();
      const start = {
        x: sourceRect ? sourceRect.left + sourceRect.width / 2 - 55 : window.innerWidth / 2 - 55,
        y: sourceRect ? sourceRect.top + sourceRect.height / 2 - 77 : window.innerHeight / 2 - 77,
      };
      const end = {
        x: destinationRect ? destinationRect.left + destinationRect.width / 2 - 55 : window.innerWidth / 2 - 55,
        y: destinationRect ? destinationRect.top + destinationRect.height / 2 - 77 : window.innerHeight / 2 - 77,
      };
      const isLocalTarget = animation.targetPlayerId === localPlayerId;
      const duration = 700;

      const effect = element.animate(
        [
          { transform: `translate(${start.x}px, ${start.y}px) scale(0.45) rotate(-8deg)`, opacity: 0 },
          { transform: `translate(${start.x}px, ${start.y}px) scale(0.7) rotate(0deg)`, opacity: 1, offset: 0.12 },
          { transform: `translate(${end.x}px, ${end.y}px) scale(${isLocalTarget ? 0.9 : 0.45}) rotate(8deg)`, opacity: 1, offset: 0.82 },
          { transform: `translate(${end.x}px, ${end.y}px) scale(${isLocalTarget ? 0.7 : 0.3}) rotate(8deg)`, opacity: 0 },
        ],
        { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
      );

      const timer = window.setTimeout(() => onDoneRef.current(), duration * 0.82);
      return () => {
        window.clearTimeout(timer);
        effect.cancel();
      };
    });

    return () => cancelAnimationFrame(frame);
  }, [animation, localPlayerId]);

  return (
    <img
      ref={cardRef}
      className="card-steal-item"
      src={animation.targetPlayerId === localPlayerId ? animation.card.image : '/cards/base/card_back.png'}
      alt={animation.card.name}
    />
  );
}
