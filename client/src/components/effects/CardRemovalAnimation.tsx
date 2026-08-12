import { useEffect, useRef } from 'react';
import type { CardAnimation } from '../../../../shared/types/SocketEvents.ts';
import './CardRemovalAnimation.css';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  animation: CardAnimation;
  rect: Rect;
  onDone: () => void;
}

type Shard = 'tl' | 'tr' | 'bl' | 'br';

const SHARD_POSITION: Record<
  Shard,
  { left: string; top: string; pos: (w: number, h: number) => string; dx: number; dy: number; rot: number }
> = {
  tl: {
    left: '0%',
    top: '0%',
    pos: () => '0 0',
    dx: -46,
    dy: -34,
    rot: -16,
  },
  tr: {
    left: '50%',
    top: '0%',
    pos: (w) => `${-w / 2}px 0`,
    dx: 46,
    dy: -34,
    rot: 16,
  },
  bl: {
    left: '0%',
    top: '50%',
    pos: (_w, h) => `0 ${-h / 2}px`,
    dx: -46,
    dy: 34,
    rot: 14,
  },
  br: {
    left: '50%',
    top: '50%',
    pos: (w, h) => `${-w / 2}px ${-h / 2}px`,
    dx: 46,
    dy: 34,
    rot: -14,
  },
};

export default function CardRemovalAnimation({ animation, rect, onDone }: Props) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = setTimeout(
      () => onDoneRef.current(),
      animation.type === 'destroy' ? 720 : 700,
    );
    return () => clearTimeout(timer);
  }, [animation.type]);

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    zIndex: 60,
    pointerEvents: 'none',
  };

  if (animation.type === 'sacrifice') {
    return (
      <div className="card-anim-sacrifice" style={baseStyle}>
        <img src={animation.card.image} alt={animation.card.name} />
      </div>
    );
  }

  const shards = (Object.keys(SHARD_POSITION) as Shard[]).map((key) => {
    const s = SHARD_POSITION[key];
    return (
      <div
        key={key}
        className="card-anim-shard"
        style={{
          left: s.left,
          top: s.top,
          width: rect.width / 2,
          height: rect.height / 2,
          backgroundImage: `url(${animation.card.image})`,
          backgroundSize: `${rect.width}px ${rect.height}px`,
          backgroundPosition: s.pos(rect.width, rect.height),
          ['--dx' as string]: `${s.dx}px`,
          ['--dy' as string]: `${s.dy}px`,
          ['--rot' as string]: `${s.rot}deg`,
        }}
      />
    );
  });

  return <div className="card-anim-break" style={baseStyle}>{shards}</div>;
}