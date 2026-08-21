import { AlertCircle } from 'lucide-react';
import './PlayerNotification.css';

interface Props {
  message: string;
}

export default function PlayerNotification({ message }: Props) {
  return (
    <div className="player-notification" role="status" aria-live="polite">
      <AlertCircle size={14} />
      <span>{message}</span>
    </div>
  );
}
