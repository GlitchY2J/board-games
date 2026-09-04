import { useEffect, useLayoutEffect, useRef } from 'react';
import type { DrawAnimation } from '../../../../shared/types/SocketEvents.ts';
import './CardDrawEffect.css';

interface Props {
  animation: DrawAnimation;
  localPlayerId: string;
  gameId?: string;
  duration?: number;
  playSound?: boolean;
  onDone(): void;
}

export default function CardDrawEffect({ animation, localPlayerId, gameId, duration = 600, playSound = false, onDone }: Props) {
  const cardRef = useRef<HTMLImageElement>(null);
  const onDoneRef = useRef(onDone);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    if (!playSound) return;
    const sound = new Audio('/sounds/draw-card.ogg');
    sound.volume = 0.3;
    sound.play().catch(() => {});
  }, [playSound]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useLayoutEffect(() => {
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;

      const deckEl = document.querySelector('[data-deck]');
      const isMe = animation.playerId === localPlayerId;
    
      const targetEl = isMe
        ? document.querySelector('[data-hand]')
        : document.querySelector(`[data-player-id="${animation.playerId}"]`);

      const start = {
        x: window.innerWidth / 2 - 55,
        y: window.innerHeight * 0.45 - 77,
      };
      const end = {
        x: window.innerWidth / 2 - 55,
        y: isMe ? window.innerHeight - 200 : 50,
      };

      if (deckEl) {
        const rect = deckEl.getBoundingClientRect();
        start.x = rect.left + rect.width / 2 - 55;
        start.y = rect.top + rect.height / 2 - 77;
      }

      if (targetEl) {
        if (isMe) {
          const lastCard = targetEl.querySelector('.fan-card:last-child');
          if (lastCard) {
            const rect = lastCard.getBoundingClientRect();
            end.x = rect.left + rect.width / 2 - 55;
            end.y = rect.top + rect.height / 2 - 77;
          } else {
            const rect = targetEl.getBoundingClientRect();
            end.x = rect.left + rect.width / 2 - 55;
            end.y = rect.top + 30 - 77;
          }
        } else {
          const rect = targetEl.getBoundingClientRect();
          end.x = rect.left + rect.width / 2 - 55;
          end.y = rect.top + rect.height / 2 - 77;
        }
      }

       const DURATION = duration;
      const ARRIVE_AT = 0.82; // fraction at which card reaches destination

      animationRef.current = el.animate(
        [
        {
          transform: `translate(${start.x}px, ${start.y}px) scale(0.6) rotate(15deg)`,
          opacity: 0,
        },
        {
          transform: `translate(${start.x}px, ${start.y}px) scale(1) rotate(0deg)`,
          opacity: 1,
          offset: 0.1,
        },
        {
          transform: `translate(${end.x}px, ${end.y}px) scale(${isMe ? 1 : 0.5}) rotate(${isMe ? 0 : -10}deg)`,
          opacity: 1,
          offset: ARRIVE_AT,
        },
        {
          transform: `translate(${end.x}px, ${end.y}px) scale(${isMe ? 0.75 : 0.35}) rotate(${isMe ? 0 : -10}deg)`,
          opacity: 0,
        },
        ],
        {
          duration: DURATION,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        },
      );

      // Finish each draw before starting the next queued card animation.
      releaseTimer = setTimeout(() => {
        onDoneRef.current();
      }, DURATION);

    });

    return () => {
      cancelAnimationFrame(frame);
      animationRef.current?.cancel();
      animationRef.current = null;
      if (releaseTimer) clearTimeout(releaseTimer);
    };
  }, [animation, duration, localPlayerId]);

  const isMe = animation.playerId === localPlayerId;
  const cardSrc = isMe || animation.revealToOthers
    ? animation.card.image
    : gameId === 'exploding-kittens'
      ? '/cards/exploding-kittens/base/back-card.png'
      : '/cards/unstable-unicorns/base/card_back.png';

  return (
    <img
      ref={cardRef}
      src={cardSrc}
      alt={animation.card.name}
      className={`card-draw-item ${isMe ? 'local' : 'opponent'}`}
    />
  );
}
