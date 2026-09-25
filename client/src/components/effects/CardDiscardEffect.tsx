import { useEffect, useLayoutEffect, useRef } from 'react';
import type { DiscardAnimation } from '../../../../shared/types/SocketEvents.ts';
import './CardDiscardEffect.css';

interface Props {
  animation: DiscardAnimation;
  localPlayerId: string;
  startRect?: { left: number; top: number; width: number; height: number };
  onDone(): void;
}

export default function CardDiscardEffect({ animation, localPlayerId, startRect, onDone }: Props) {
  const cardRef = useRef<HTMLImageElement>(null);
  const onDoneRef = useRef(onDone);

  useLayoutEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const discardEl = document.querySelector('[data-discard]');
    const isMe = animation.playerId === localPlayerId;

    // Target exact card in hand if discarded by local player
    const cardEl = isMe
      ? document.querySelector(`[data-card-uid="${animation.card.uid}"]`)
      : null;

    const sourceEl = cardEl ?? (isMe
      ? document.querySelector('[data-hand]')
      : document.querySelector(`[data-player-id="${animation.playerId}"]`));

    const cardWidth = startRect?.width ?? 110;
    const cardHeight = startRect?.height ?? 154;
    const start = {
      x: isMe ? window.innerWidth / 2 - cardWidth / 2 : 50,
      y: isMe ? window.innerHeight - cardHeight : 50,
    };
    const end = {
      x: window.innerWidth / 2 - cardWidth / 2,
      y: window.innerHeight * 0.45 - cardHeight / 2,
    };

    if (startRect) {
      start.x = startRect.left;
      start.y = startRect.top;
    } else if (sourceEl) {
      const rect = sourceEl.getBoundingClientRect();
      start.x = rect.left + rect.width / 2 - cardWidth / 2;
      start.y = rect.top + rect.height / 2 - cardHeight / 2;
    }

    if (discardEl) {
      const rect = discardEl.getBoundingClientRect();
      end.x = rect.left + rect.width / 2 - cardWidth / 2;
      end.y = rect.top + rect.height / 2 - cardHeight / 2;
    }

    el.style.width = `${cardWidth}px`;
    const duration = isMe ? 800 : 750;

    const keyframes = isMe
      ? [
          {
            transform: `translate(${start.x}px, ${start.y}px) scale(1) rotate(0deg)`,
            opacity: 1,
          },
          {
            transform: `translate(${start.x}px, ${start.y - 12}px) scale(1.04) rotate(-2deg)`,
            opacity: 1,
            offset: 0.12,
          },
          {
            transform: `translate(${end.x}px, ${end.y}px) scale(0.58) rotate(14deg)`,
            opacity: 1,
            offset: 0.9,
          },
          {
            transform: `translate(${end.x}px, ${end.y}px) scale(0.35) rotate(22deg)`,
            opacity: 0,
          },
        ]
      : [
          {
            transform: `translate(${start.x}px, ${start.y}px) scale(0.5) rotate(0deg)`,
            opacity: 0,
          },
          {
            transform: `translate(${start.x}px, ${start.y}px) scale(0.65) rotate(-10deg)`,
            opacity: 1,
            offset: 0.15,
          },
          {
            transform: `translate(${end.x}px, ${end.y}px) scale(0.6) rotate(15deg)`,
            opacity: 1,
            offset: 0.85,
          },
          {
            transform: `translate(${end.x}px, ${end.y}px) scale(0.4) rotate(25deg)`,
            opacity: 0,
          },
        ];

    const anim = el.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.25, 1, 0.38, 1)',
      fill: 'forwards',
    });

    anim.onfinish = () => onDoneRef.current();
    return () => anim.cancel();
  }, [animation, localPlayerId, startRect]);

  return (
    <img
      ref={cardRef}
      src={animation.card.image}
      alt={animation.card.name}
      className={`card-discard-item ${animation.playerId === localPlayerId ? 'from-me' : ''}`}
    />
  );
}
