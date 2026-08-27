import { useEffect, useRef } from 'react';
import type { ExplosionAnimation } from '../../../../shared/types/SocketEvents.ts';
import './ExplosionAnnouncement.css';

interface Props {
  animation: ExplosionAnimation;
  localPlayerId: string;
  onDone: () => void;
}

export default function ExplosionAnnouncement({
  animation,
  localPlayerId,
  onDone,
}: Props) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDoneRef.current();
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const isVictim = animation.playerId === localPlayerId;

  return (
    <>
      <div className="explosion-screen-flash" />
      <div className={`explosion-backdrop ${isVictim ? 'is-victim' : ''}`} />

      {/* Sparks and shockwaves */}
      <div className="explosion-fx-container">
        <div className="explosion-ring ring-1" />
        <div className="explosion-ring ring-2" />
        <div className="explosion-spark spark-1" />
        <div className="explosion-spark spark-2" />
        <div className="explosion-spark spark-3" />
        <div className="explosion-spark spark-4" />
        <div className="explosion-spark spark-5" />
        <div className="explosion-spark spark-6" />
        <div className="explosion-spark spark-7" />
        <div className="explosion-spark spark-8" />
      </div>

      <div className={`explosion-announcement ${isVictim ? 'is-victim' : ''}`}>
        <div className="explosion-icon-wrapper">
          <span className="explosion-emoji">💣</span>
          <span className="explosion-boom-tag">💥 BOOM! 💥</span>
          <span className="explosion-emoji">🐱</span>
        </div>

        <div className="explosion-stamp-wrapper">
          <h1 className="explosion-title">
            {isVictim ? '¡HAS EXPLOTADO!' : `¡${animation.playerName.toUpperCase()} HA EXPLOTADO!`}
          </h1>
        </div>

        <p className="explosion-details">
          {isVictim
            ? '¡No pudiste desactivar el Exploding Kitten y has sido eliminado!'
            : `El jugador ${animation.playerName} fue eliminado por un Exploding Kitten.`}
        </p>
      </div>
    </>
  );
}
