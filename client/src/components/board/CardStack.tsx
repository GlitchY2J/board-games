import type { ReactNode } from 'react';
import './CardStack.css';

interface Props {
  top: ReactNode;
}

export default function CardStack({ top }: Props) {
  return (
    <div className="card-stack">
      <div className="card-stack-top">{top}</div>
    </div>
  );
}
