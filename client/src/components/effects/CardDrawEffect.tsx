import { useEffect, useRef } from 'react';
import type { DrawAnimation } from '../../../../shared/types/SocketEvents.ts';
import './CardDrawEffect.css';

interface Props {
  animation: DrawAnimation;
  localPlayerId: string;
  onDone(): void;
}

export default function CardDrawEffect({ animation, localPlayerId, onDone }: Props) {
  const cardRef = useRef<HTMLImageElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const deckEl = document.querySelector('[data-deck]');
    const isMe = animation.playerId === localPlayerId;
    
    let targetEl: Element | null = null;
    if (isMe) {
      targetEl = document.querySelector('[data-hand]');
    } else {
      targetEl = document.querySelector(`[data-player-id="${animation.playerId}"]`);
    }

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

    const DURATION = 600;
    const ARRIVE_AT = 0.82; // fraction at which card reaches destination

    const anim = el.animate(
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
      }
    );

    // Release state lock when card visually arrives — don't wait for full fade-out
    const releaseTimer = setTimeout(() => {
      onDoneRef.current();
    }, DURATION * ARRIVE_AT);

    anim.onfinish = () => el.remove();
    return () => {
      anim.cancel();
      clearTimeout(releaseTimer);
    };
  }, [animation, localPlayerId]);

  const isMe = animation.playerId === localPlayerId;
  const cardSrc = isMe ? animation.card.image : '/cards/base/card_back.png';

  return (
    <img
      ref={cardRef}
      src={cardSrc}
      alt={animation.card.name}
      className={`card-draw-item ${isMe ? 'local' : 'opponent'}`}
    />
  );
}
