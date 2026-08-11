import './TurnAnnouncement.css';
import { cn } from '../../lib/cn';

interface Props {
  playerName: string;
  isActivePlayer: boolean;
}

export default function TurnAnnouncement({ playerName, isActivePlayer }: Props) {
  return (
    <>
      <div className="turn-announcement-backdrop" />
      <div className="turn-announcement">
        <span className="turn-announcement-label">Turno de</span>
        <span
          className={cn(
            'turn-announcement-name',
            isActivePlayer && 'turn-announcement-name-active',
          )}
        >
          {playerName}
        </span>
      </div>
    </>
  );
}
