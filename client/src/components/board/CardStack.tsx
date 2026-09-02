import type { ReactNode } from 'react';
import './CardStack.css';

interface Props {
  top: ReactNode;
  count: number;
  size?: 'small' | 'medium' | 'large';
}

const MAX_LAYERS = 5;

export default function CardStack({ top, count, size = 'medium' }: Props) {
  const layers = Math.min(Math.max(count - 1, 0), MAX_LAYERS);

  return (
    <div className="card-stack">
      {Array.from({ length: layers }).map((_, i) => (
        <img
          key={i}
          src="/cards/unstable-unicorns/base/card_back.png"
          alt=""
          draggable={false}
          className={`card-stack-layer ${size} layer-${i}`}
        />
      ))}
      <div className="card-stack-top">{top}</div>
    </div>
  );
}
