import { useEffect, useRef } from 'react';
import type { PlayAnimation } from '../../../../shared/types/SocketEvents.ts';
import './CardPlayEffect.css';

interface Props {
  animation: PlayAnimation;
  localPlayerId: string;
  onDone(): void;
}

export default function CardPlayEffect({ animation, localPlayerId, onDone }: Props) {
  const cardRef = useRef<HTMLImageElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const isMe = animation.playerId === localPlayerId;
    const stableEl = document.querySelector(`[data-stable-id="${animation.playerId}"]`);
    const startEl = isMe
      ? document.querySelector('[data-hand]')
      : document.querySelector(`[data-player-id="${animation.playerId}"]`);

    // Default start positions (fallback)
    const start = {
      x: isMe ? window.innerWidth / 2 - 55 : window.innerWidth / 2 - 55,
      y: isMe ? window.innerHeight - 100 : 80,
    };

    // Default stable positions
    const end = {
      x: window.innerWidth / 2 - 55,
      y: isMe ? window.innerHeight - 250 : 180,
    };

    if (startEl) {
      const rect = startEl.getBoundingClientRect();
      start.x = rect.left + rect.width / 2 - 55;
      start.y = rect.top + rect.height / 2 - 77;
    }

    if (stableEl) {
      const rect = stableEl.getBoundingClientRect();
      end.x = rect.left + rect.width / 2 - 55;
      end.y = rect.top + rect.height / 2 - 77;
    }

    const DURATION = 800;
    const ARRIVE_AT = 0.8; // Fraction of duration when the card arrives at destination

    const anim = el.animate(
      [
        {
          transform: `translate(${start.x}px, ${start.y}px) scale(0.3) rotate(${isMe ? 0 : 25}deg)`,
          opacity: 0,
        },
        {
          transform: `translate(${start.x + (end.x - start.x) * 0.2}px, ${start.y + (end.y - start.y) * 0.2}px) scale(1.1) rotate(${isMe ? -5 : 12}deg)`,
          opacity: 1,
          offset: 0.25,
        },
        {
          transform: `translate(${end.x}px, ${end.y}px) scale(1) rotate(0deg)`,
          opacity: 1,
          offset: ARRIVE_AT,
        },
        {
          transform: `translate(${end.x}px, ${end.y}px) scale(0.9) rotate(0deg)`,
          opacity: 0,
        },
      ],
      {
        duration: DURATION,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      }
    );

    // Release state lock so game updates once the card arrives
    const releaseTimer = setTimeout(() => {
      onDoneRef.current();
    }, DURATION * ARRIVE_AT);

    anim.onfinish = () => el.remove();

    return () => {
      anim.cancel();
      clearTimeout(releaseTimer);
    };
  }, [animation, localPlayerId]);

  return (
    <img
      ref={cardRef}
      src={animation.card.image}
      alt={animation.card.name}
      className="card-play-item"
    />
  );
}
