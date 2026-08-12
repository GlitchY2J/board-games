import { useEffect, useRef } from 'react';
import type { NeighAnimation } from '../../../../shared/types/SocketEvents.ts';
import './NeighAnnouncement.css';

interface Props {
  animation: NeighAnimation;
  onDone: () => void;
}

export default function NeighAnnouncement({ animation, onDone }: Props) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDoneRef.current();
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const isSuper = animation.type === 'super_neigh';

  return (
    <>
      <div className={isSuper ? 'neigh-backdrop super' : 'neigh-backdrop'} />
      <div className={isSuper ? 'neigh-announcement super' : 'neigh-announcement'}>
        <div className="neigh-stamp-wrapper">
          <span className="neigh-label">
            {isSuper ? '¡SUPER NEIGH!' : '¡NEIGHED!'}
          </span>
        </div>
        <p className="neigh-details">
          La carta <span className="neigh-card-name">"{animation.cardName}"</span> de{' '}
          <span className="neigh-player-name">{animation.playerName}</span> fue cancelada
        </p>
      </div>
    </>
  );
}
