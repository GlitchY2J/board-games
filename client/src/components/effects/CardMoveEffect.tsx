import { useEffect, useRef } from 'react';
import './CardMoveEffect.css';

interface Props {
  card: { id: string; name: string; image: string };
  onDone(): void;
}

export default function CardMoveEffect({ card, onDone }: Props) {
  const cardRef = useRef<HTMLImageElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const deckEl = document.querySelector('[data-deck]');
    const handEl = document.querySelector('[data-hand]');

    const start = {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.45,
    };
    const end = {
      x: window.innerWidth / 2,
      y: window.innerHeight - 40,
    };

    if (deckEl) {
      const rect = deckEl.getBoundingClientRect();
      start.x = rect.left + rect.width / 2;
      start.y = rect.top + rect.height / 2;
    }

    if (handEl) {
      const lastCard = handEl.querySelector('.fan-card:last-child');
      if (lastCard) {
        const rect = lastCard.getBoundingClientRect();
        end.x = rect.left + rect.width / 2;
        end.y = rect.top + rect.height / 2;
      } else {
        const rect = handEl.getBoundingClientRect();
        end.x = rect.left + rect.width / 2;
        end.y = rect.top + 30;
      }
    }

    const animation = el.animate(
      [
        {
          transform: `translate(${start.x}px, ${start.y}px) scale(0.7) rotate(12deg)`,
          opacity: 1,
        },
        {
          transform: `translate(${end.x}px, ${end.y}px) scale(1) rotate(0deg)`,
          opacity: 1,
          offset: 0.82,
        },
        {
          transform: `translate(${end.x}px, ${end.y}px) scale(1) rotate(0deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 750,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );

    animation.onfinish = () => onDoneRef.current();

    return () => animation.cancel();
  }, []);

  return (
    <img
      ref={cardRef}
      src={card.image}
      alt={card.name}
      className="card-move-card"
    />
  );
}
