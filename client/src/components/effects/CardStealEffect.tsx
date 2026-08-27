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

      const isFromMe = animation.sourcePlayerId === localPlayerId;
      const isToMe = animation.targetPlayerId === localPlayerId;

      // Find initial element: exact card slot in hand if stolen from local player
      const cardEl = isFromMe
        ? document.querySelector(`[data-card-uid="${animation.card.uid}"]`)
        : null;

      const sourceEl = cardEl ?? (isFromMe
        ? document.querySelector('[data-hand]')
        : document.querySelector(`[data-player-id="${animation.sourcePlayerId}"]`));

      const destinationEl = isToMe
        ? document.querySelector('[data-hand]')
        : document.querySelector(`[data-player-id="${animation.targetPlayerId}"]`);

      const sourceRect = sourceEl?.getBoundingClientRect();
      const destinationRect = destinationEl?.getBoundingClientRect();

      const start = {
        x: sourceRect ? sourceRect.left + sourceRect.width / 2 - 55 : window.innerWidth / 2 - 55,
        y: sourceRect ? sourceRect.top + sourceRect.height / 2 - 77 : window.innerHeight - 150,
      };
      const end = {
        x: destinationRect ? destinationRect.left + destinationRect.width / 2 - 55 : window.innerWidth / 2 - 55,
        y: destinationRect ? destinationRect.top + destinationRect.height / 2 - 77 : 80,
      };

      const duration = isFromMe ? 1050 : 800;

      const keyframes = isFromMe
        ? [
            {
              transform: `translate(${start.x}px, ${start.y}px) scale(0.85) rotate(0deg)`,
              opacity: 0,
            },
            {
              transform: `translate(${start.x}px, ${start.y - 50}px) scale(1.18) rotate(-6deg)`,
              opacity: 1,
              offset: 0.2,
            },
            {
              transform: `translate(${start.x}px, ${start.y - 50}px) scale(1.18) rotate(-6deg)`,
              opacity: 1,
              offset: 0.38,
            },
            {
              transform: `translate(${end.x}px, ${end.y}px) scale(0.4) rotate(8deg)`,
              opacity: 1,
              offset: 0.88,
            },
            {
              transform: `translate(${end.x}px, ${end.y}px) scale(0.25) rotate(12deg)`,
              opacity: 0,
            },
          ]
        : [
            {
              transform: `translate(${start.x}px, ${start.y}px) scale(0.45) rotate(-8deg)`,
              opacity: 0,
            },
            {
              transform: `translate(${start.x}px, ${start.y}px) scale(0.75) rotate(0deg)`,
              opacity: 1,
              offset: 0.15,
            },
            {
              transform: `translate(${end.x}px, ${end.y}px) scale(${isToMe ? 0.95 : 0.45}) rotate(8deg)`,
              opacity: 1,
              offset: 0.82,
            },
            {
              transform: `translate(${end.x}px, ${end.y}px) scale(${isToMe ? 0.75 : 0.3}) rotate(8deg)`,
              opacity: 0,
            },
          ];

      const effect = element.animate(keyframes, {
        duration,
        easing: 'cubic-bezier(0.25, 1, 0.38, 1)',
        fill: 'forwards',
      });

      const timer = window.setTimeout(() => onDoneRef.current(), duration * 0.86);
      return () => {
        window.clearTimeout(timer);
        effect.cancel();
      };
    });

    return () => cancelAnimationFrame(frame);
  }, [animation, localPlayerId]);

  const showCardFace = animation.sourcePlayerId === localPlayerId || animation.targetPlayerId === localPlayerId;

  return (
    <img
      ref={cardRef}
      className={`card-steal-item ${animation.sourcePlayerId === localPlayerId ? 'from-me' : ''}`}
      src={showCardFace ? animation.card.image : '/cards/base/card_back.png'}
      alt={animation.card.name}
    />
  );
}
