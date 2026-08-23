import { useEffect, useState } from 'react';
import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import './PendingPlayOverlay.css';

interface Props {
  gameState: GameState;
  localPlayerId: string;
  gameId?: string;
  hide?: boolean;
}

export default function PendingPlayOverlay({ gameState, localPlayerId, gameId, hide = false }: Props) {
  const pending = gameState.pendingPlay;
  const isExplodingKittens = gameId === 'exploding-kittens';
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
  const topIsReaction =
    pending.card.effect === 'neigh' ||
    pending.card.effect === 'super_neigh' ||
    (isExplodingKittens && pending.card.effect === 'nope');

  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const hasRegularNeigh =
    localPlayer?.hand.some((c) => c.effect === 'neigh') ?? false;
  const hasSuperNeigh =
    localPlayer?.hand.some((c) => c.effect === 'super_neigh') ?? false;
  const hasNope = localPlayer?.hand.some((c) => c.effect === 'nope') ?? false;
  const hasBlindingLight =
    localPlayer?.downgrades.some((c) => c.id === 'blinding_light') ?? false;
  const hasGinormousUnicorn =
    (localPlayer?.stable.some((card) => card.id === 'ginormous_unicorn') ?? false) &&
    !hasBlindingLight;
  const hasSlowdown =
    localPlayer?.downgrades.some((card) => card.id === 'slowdown') ?? false;
  const hasAccepted = pending.acceptedIds.includes(localPlayerId);
  const canRespond = !isMyPlay;
  const attackTarget = pending.targetPlayerId
    ? gameState.players.find((player) => player.id === pending.targetPlayerId)
    : undefined;
  const isTargetedAttack =
    isExplodingKittens && pending.card.id === 'attack' && !!attackTarget;

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

  function playNope() {
    const nopeCard = localPlayer?.hand.find((card) => card.effect === 'nope');
    if (!nopeCard) return;

    socket.emit('play-neigh', {
      roomCode: gameState.roomCode,
      cardId: nopeCard.uid,
    });
  }

  return (
    <div className={`pending-play-backdrop ${hide ? 'animating-out' : ''}`}>
      <div className="pending-play-window">
        <h2 className="pending-play-title">
          {isMyPlay
            ? topIsReaction
              ? isExplodingKittens ? 'Has jugado un Nope' : 'Has jugado un Neigh'
              : 'Colocando tu carta...'
            : topIsReaction
              ? isExplodingKittens ? `${pending.playerName} juega un Nope` : `${pending.playerName} juega un Neigh`
              : `${pending.playerName} juega una carta`}
        </h2>
        <p className="pending-play-subtitle">
            {isMyPlay
              ? `Se resolverá en ${seconds}s`
              : isExplodingKittens
                ? `¿Tienes un Nope para negarla? Se resuelve en ${seconds}s`
                : `¿Tienes un Neigh para detenerla? Se resuelve en ${seconds}s`}
        </p>

        {isTargetedAttack && attackTarget && (
          <div className="pending-play-target">
            <div className="pending-play-target-player">
              {(() => {
                const attacker = gameState.players.find(
                  (player) => player.id === pending.playerId,
                );
                return attacker?.avatar ? (
                  <img src={`/avatars/${attacker.avatar}.png`} alt={attacker.name} />
                ) : (
                  <span>{pending.playerName.substring(0, 2)}</span>
                );
              })()}
              <strong>{pending.playerName}</strong>
            </div>
            <span className="pending-play-target-arrow">→</span>
            <div className="pending-play-target-player">
              {attackTarget.avatar ? (
                <img src={`/avatars/${attackTarget.avatar}.png`} alt={attackTarget.name} />
              ) : (
                <span>{attackTarget.name.substring(0, 2)}</span>
              )}
              <strong>{isTargetedAttack && attackTarget.id === localPlayerId ? 'Tú' : attackTarget.name}</strong>
            </div>
            <p>
              {attackTarget.id === localPlayerId
                ? `${pending.playerName} te está atacando`
                : `${pending.playerName} está atacando a ${attackTarget.name}`}
            </p>
          </div>
        )}

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
              {isExplodingKittens ? 'Nopes' : 'Neighs'} en la cadena: {chainNeighCount}
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
              {isExplodingKittens && hasNope && (
                <button className="pending-neigh-btn" onClick={playNope}>
                  Nope
                </button>
              )}
              {!isExplodingKittens && !hasGinormousUnicorn && !hasSlowdown && hasRegularNeigh && (
              <button
                className="pending-neigh-btn"
                onClick={playNeigh}
              >
                Neigh
              </button>
            )}
            {!isExplodingKittens && !hasGinormousUnicorn && !hasSlowdown && hasSuperNeigh && (
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
