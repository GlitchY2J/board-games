import { useEffect, useRef, useState } from 'react';
import type { GameLogEntry, GameState } from '../../types/GameState';
import './NeighRevealOverlay.css';

interface Props {
  gameState: GameState;
}

export default function NeighRevealOverlay({ gameState }: Props) {
  const latestLogId = gameState.log?.at(-1)?.id;
  const seenLogId = useRef(latestLogId);
  const [announcement, setAnnouncement] = useState<GameLogEntry>();

  useEffect(() => {
    if (!latestLogId || latestLogId === seenLogId.current) return;
    seenLogId.current = latestLogId;

    const entry = gameState.log?.at(-1);
    if (
      !entry?.cardImage ||
      !entry.text.includes('reveló') ||
      !entry.text.includes('carta Neigh')
    ) {
      return;
    }

    setAnnouncement(entry);
    const timeout = window.setTimeout(() => setAnnouncement(undefined), 2800);
    return () => window.clearTimeout(timeout);
  }, [gameState.log, latestLogId]);

  if (!announcement?.cardImage) return null;

  return (
    <div className="neigh-reveal-overlay" role="status" aria-live="polite">
      <div className="neigh-reveal-card">
        <p>{announcement.text}</p>
        <img src={announcement.cardImage} alt="Carta Neigh revelada" />
      </div>
    </div>
  );
}
