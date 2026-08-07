import { useEffect, useState } from 'react';
import { socket } from '../../services/socket';
import type { GameError } from '../../../../shared/types/GameError.ts';

const ERROR_DURATION = 4000;

export default function GameErrorToast() {
  const [error, setError] = useState<GameError | null>(null);

  useEffect(() => {
    function handleGameError(receivedError: GameError): void {
      console.error(`[${receivedError.code}]`, receivedError.message);
      setError(receivedError);
    }

    socket.on('game-error', handleGameError);

    return () => {
      socket.off('game-error', handleGameError);
    };
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setError(null);
    }, ERROR_DURATION);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [error]);

  if (!error) {
    return null;
  }

  return (
    <div className="game-error-toast" role="alert" aria-live="assertive">
      <div className="game-error-toast__content">
        <strong>No se pudo realizar la acción</strong>
        <span>{error.message}</span>
      </div>
      <button
        type="button"
        className="game-error-toast__close"
        aria-label="Cerrar mensaje"
        onClick={() => setError(null)}
      >
        x
      </button>
    </div>
  );
}
