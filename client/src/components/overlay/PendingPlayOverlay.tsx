import { useEffect, useState } from 'react';
import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import './PendingPlayOverlay.css';

interface Props {
  gameState: GameState;
  localPlayerId: string;
}

export default function PendingPlayOverlay({ gameState, localPlayerId }: Props) {
  const pending = gameState.pendingPlay;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [pending]);

  if (!pending) return null;

  const isMyPlay = pending.playerId === localPlayerId;
  const remainingMs = Math.max(
    0,
    pending.startedAt + pending.durationMs - now,
  );
  const progress = Math.max(
    0,
    Math.min(1, 1 - remainingMs / pending.durationMs),
  );
  const seconds = Math.ceil(remainingMs / 1000);

  const chainNeighCount = pending.chain.length - 1;
  const topIsNeigh =
    pending.card.effect === 'neigh' || pending.card.effect === 'super_neigh';

  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const hasRegularNeigh =
    localPlayer?.hand.some((c) => c.effect === 'neigh') ?? false;
  const hasSuperNeigh =
    localPlayer?.hand.some((c) => c.effect === 'super_neigh') ?? false;
  const hasGinormousUnicorn =
    localPlayer?.stable.some((card) => card.id === 'ginormous_unicorn') ?? false;
  const hasAccepted = pending.acceptedIds.includes(localPlayerId);
  const canRespond = !isMyPlay;

  function accept() {
    socket.emit('neigh-accept', { roomCode: gameState.roomCode });
  }

  function playNeigh() {
    const neighCard = localPlayer?.hand.find((c) => c.effect === 'neigh');

    if (!neighCard) return;

    socket.emit('play-neigh', {
      roomCode: gameState.roomCode,
      cardId: neighCard.uid,
    });
  }

  function playSuperNeigh() {
    const superNeighCard = localPlayer?.hand.find(
      (c) => c.effect === 'super_neigh',
    );

    if (!superNeighCard) return;

    socket.emit('play-neigh', {
      roomCode: gameState.roomCode,
      cardId: superNeighCard.uid,
    });
  }

  return (
    <div className="pending-play-backdrop">
      <div className="pending-play-window">
        <h2 className="pending-play-title">
          {isMyPlay
            ? topIsNeigh
              ? 'Has jugado un Neigh'
              : 'Colocando tu carta...'
            : topIsNeigh
              ? `${pending.playerName} juega un Neigh`
              : `${pending.playerName} juega una carta`}
        </h2>
        <p className="pending-play-subtitle">
          {isMyPlay
            ? `Se resolverá en ${seconds}s`
            : `¿Tienes un Neigh para detenerla? Se resuelve en ${seconds}s`}
        </p>

        <div className="pending-play-card">
          <PlayingCard
            name={pending.card.name}
            image={pending.card.image}
            size={isMyPlay ? 'large' : 'xlarge'}
            preview={false}
          />
        </div>

        <div className="pending-play-card-name">{pending.card.name}</div>

        {chainNeighCount > 0 && (
          <div className="pending-play-chain">
            Neighs en la cadena: {chainNeighCount}
          </div>
        )}

        <div className="pending-play-timer">
          <div
            className="pending-play-progress"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {canRespond && (
          <div className="pending-play-actions">
            <button
              className="pending-accept-btn"
              disabled={hasAccepted}
              onClick={accept}
            >
              {hasAccepted ? 'Aceptado ✓' : 'Aceptar'}
            </button>
            {!hasGinormousUnicorn && hasRegularNeigh && (
              <button
                className="pending-neigh-btn"
                onClick={playNeigh}
              >
                Neigh
              </button>
            )}
            {!hasGinormousUnicorn && hasSuperNeigh && (
              <button
                className="pending-super-neigh-btn"
                onClick={playSuperNeigh}
              >
                Super Neigh
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
