import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import './PendingPlayOverlay.css';

interface Props {
  gameState: GameState;
  localPlayerId: string;
  gameId?: string;
  hide?: boolean;
  spectator?: boolean;
}

export default function PendingPlayOverlay({ gameState, localPlayerId, gameId, hide = false, spectator = false }: Props) {
  const pending = gameState.pendingPlay;
  const isExplodingKittens =
    gameId === 'exploding-kittens' ||
    gameId === 'exploding_kittens' ||
    gameId === 'explodingKittens' ||
    pending?.card.id === 'attack' ||
    pending?.card.effect === 'attack' ||
    pending?.card.effect === 'nope';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [pending]);

  if (!pending || hide) return null;

  const isMyPlay = !spectator && pending.playerId === localPlayerId;
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
  const attackCount = pending.attackCount ?? pending.chain.filter((link) => link.card.id === 'attack').length;
  const isCatComboPlay =
    isExplodingKittens &&
    pending.chain.length > 1 &&
    pending.card.cardType === 'cat';
  const topIsReaction =
    pending.card.effect === 'neigh' ||
    pending.card.effect === 'super_neigh' ||
    (isExplodingKittens && pending.card.effect === 'nope');
  const isAttackPlay =
    isExplodingKittens &&
    (pending.card.id === 'attack' || pending.card.effect === 'attack');
  const isTwoOfAKind =
    isExplodingKittens &&
    pending.card.effect === 'cat_pair' &&
    pending.chain.length === 2;
  const isThreeOfAKind =
    isExplodingKittens &&
    pending.card.effect === 'cat_pair' &&
    pending.chain.length === 3;
  const isFavorPlay = pending.card.effect === 'favor';
  const isFavorSelection =
    gameState.pendingAction?.type === 'select_hand_card' &&
    gameState.pendingAction.reason === 'favor';
  if (isFavorSelection) return null;
  const requestedCardTypeName: Record<string, string> = {
    beard_cat: 'Beard Cat',
    cattermelon: 'Cattermelon',
    hairy_potato_cat: 'Hairy Potato Card',
    rainbow_ralphing_cat: 'Rainbow-Ralphing Cat',
    tacocat: 'Tacocat',
    attack: 'Attack 2x',
    defuse: 'Defuse',
    favor: 'Favor',
    nope: 'Nope',
    see_the_future: 'See the Future 3x',
    shuffle: 'Shuffle',
    skip: 'Skip',
  };

  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const hasRegularNeigh =
    localPlayer?.hand.some((c) => c.effect === 'neigh') ?? false;
  const hasSuperNeigh =
    localPlayer?.hand.some((c) => c.effect === 'super_neigh') ?? false;
  const hasNope = localPlayer?.hand.some((c) => c.effect === 'nope') ?? false;
  const hasAttack =
    localPlayer?.hand.some(
      (card) =>
        card.uid &&
        card.cardType === 'action' &&
        card.id === 'attack' &&
        card.effect === 'attack',
    ) ?? false;
  const hasBlindingLight =
    localPlayer?.downgrades.some((c) => c.id === 'blinding_light') ?? false;
  const hasGinormousUnicorn =
    (localPlayer?.stable.some((card) => card.id === 'ginormous_unicorn') ?? false) &&
    !hasBlindingLight;
  const hasSlowdown =
    localPlayer?.downgrades.some((card) => card.id === 'slowdown') ?? false;
  const hasAccepted = pending.acceptedIds.includes(localPlayerId);
  const canRespond = !spectator && !isMyPlay && !isFavorSelection;
  const fallbackAttackTargetId =
    gameState.players.length > 0
      ? gameState.players[
          (gameState.players.findIndex((player) => player.id === pending.playerId) + 1) %
            gameState.players.length
        ]?.id
      : undefined;
  const resolvedAttackTargetId = pending.targetPlayerId ?? fallbackAttackTargetId;
  const attackTarget = resolvedAttackTargetId
    ? gameState.players.find((player) => player.id === resolvedAttackTargetId)
    : undefined;
  const twoOfAKindTarget = pending.targetPlayerId
    ? gameState.players.find((player) => player.id === pending.targetPlayerId)
    : undefined;
  const twoOfAKindSource = gameState.players.find(
    (player) => player.id === pending.playerId,
  );
  const isTwoOfAKindTarget = twoOfAKindTarget?.id === localPlayerId;
  const isTargetedAttack =
    isAttackPlay && !!attackTarget;
  const canStackAttack =
    isExplodingKittens &&
    (pending.chain[pending.chain.length - 1]?.card.id === 'attack' ||
      pending.chain[pending.chain.length - 1]?.card.effect === 'attack') &&
    (pending.targetPlayerId ?? fallbackAttackTargetId) === localPlayerId &&
    hasAttack;

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

  function playAttack() {
    const attackCard = localPlayer?.hand.find(
      (card) =>
        card.uid &&
        card.cardType === 'action' &&
        card.id === 'attack' &&
        card.effect === 'attack',
    );
    if (!attackCard) return;
    socket.emit('play-card', {
      roomCode: gameState.roomCode,
      playerId: localPlayerId,
      cardId: attackCard.uid,
    });
  }

  return (
    <div className={`pending-play-backdrop ${hide ? 'animating-out' : ''}`}>
      <div className="pending-play-window">
        <h2 className="pending-play-title">
          {isFavorSelection
            ? `${pending.targetPlayerName ?? 'El jugador objetivo'} está escogiendo una carta`
            : isFavorPlay
            ? `${pending.playerName} le pide una carta a ${pending.targetPlayerName ?? 'otro jugador'}`
            : isThreeOfAKind
            ? isTwoOfAKindTarget
              ? `${pending.playerName} te está robando una carta (${requestedCardTypeName[pending.requestedCardType ?? ''] ?? pending.requestedCardType ?? 'seleccionada'})`
              : `${pending.playerName} le está robando una carta (${requestedCardTypeName[pending.requestedCardType ?? ''] ?? pending.requestedCardType ?? 'seleccionada'}) a ${twoOfAKindTarget?.name ?? 'otro jugador'}`
            : isTwoOfAKind
            ? isTwoOfAKindTarget
              ? `${pending.playerName} te está robando una carta al azar`
              : `${pending.playerName} le está robando una carta al azar a ${twoOfAKindTarget?.name ?? 'otro jugador'}`
            : isAttackPlay
            ? isMyPlay
              ? 'Has jugado un Attack'
              : attackTarget?.id === localPlayerId
                ? `${pending.playerName} te está atacando`
                : `${pending.playerName} está atacando a ${attackTarget?.name ?? 'otro jugador'}`
            : isMyPlay
            ? topIsReaction
              ? isExplodingKittens ? 'Has jugado un Nope' : 'Has jugado un Neigh'
              : 'Colocando tu carta...'
            : topIsReaction
              ? isExplodingKittens ? `${pending.playerName} juega un Nope` : `${pending.playerName} juega un Neigh`
              : `${pending.playerName} juega una carta`}
        </h2>
        <p className="pending-play-subtitle">
            {isFavorSelection
              ? `Está eligiendo una carta para entregársela a ${pending.playerName}`
              : isFavorPlay
              ? `${pending.targetPlayerName ?? 'El jugador objetivo'} debe elegir una carta de su mano`
              : isThreeOfAKind || isTwoOfAKind
              ? `Se resolverá en ${seconds}s. ¿Tienes un Nope para negarla?`
              : isAttackPlay
              ? `${attackCount * 2} turnos acumulados. Se resuelve en ${seconds}s`
              : isMyPlay
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

        {(isTwoOfAKind || isThreeOfAKind) && twoOfAKindTarget && (
          <div className="pending-play-target pending-play-two-kind-target">
            <div className="pending-play-target-player">
              {twoOfAKindSource?.avatar ? (
                <img src={`/avatars/${twoOfAKindSource.avatar}.png`} alt={twoOfAKindSource.name} />
              ) : (
                <span>{pending.playerName.substring(0, 2)}</span>
              )}
              <strong>{pending.playerName}</strong>
            </div>
            <span className="pending-play-target-arrow">→</span>
            <div className="pending-play-target-player">
              {twoOfAKindTarget.avatar ? (
                <img src={`/avatars/${twoOfAKindTarget.avatar}.png`} alt={twoOfAKindTarget.name} />
              ) : (
                <span>{twoOfAKindTarget.name.substring(0, 2)}</span>
              )}
              <strong>{isTwoOfAKindTarget ? 'Tú' : twoOfAKindTarget.name}</strong>
            </div>
            <p>
              {isTwoOfAKindTarget
                ? `${pending.playerName} te está robando una carta${isThreeOfAKind ? ` de tipo ${requestedCardTypeName[pending.requestedCardType ?? ''] ?? pending.requestedCardType ?? 'seleccionado'}` : ''} al azar`
                : `${pending.playerName} está robando una carta al azar`}
            </p>
          </div>
        )}

        {isCatComboPlay ? (
          <div className="pending-play-card-fan" aria-label={`${pending.chain.length} cartas gato jugadas`}>
            {pending.chain.map((link, index) => (
              <div
                className="pending-play-fan-card"
                key={link.card.uid}
                style={{
                  transform: `rotate(${(index - (pending.chain.length - 1) / 2) * 7}deg)`,
                  zIndex: index,
                }}
              >
                <PlayingCard
                  name={link.card.name}
                  image={link.card.image}
                  size="large"
                  preview={false}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="pending-play-card">
            <PlayingCard
              name={pending.card.name}
              image={pending.card.image}
              size={isMyPlay ? 'large' : 'xlarge'}
              preview={false}
            />
          </div>
        )}

        <div className="pending-play-card-name">{pending.card.name}</div>

          {isCatComboPlay ? (
            <div className="pending-play-chain">
              Gatos jugados: {pending.chain.length}
            </div>
          ) : isExplodingKittens && attackCount > 1 ? (
            <div className="pending-play-chain pending-play-attack-stack">
              Attacks apilados: {attackCount}
            </div>
          ) : chainNeighCount > 0 && (
            <div className="pending-play-chain">
              {isExplodingKittens ? 'Nopes' : 'Neighs'} en la cadena: {chainNeighCount}
            </div>
        )}

        <div
          className="pending-play-timer"
          style={{ '--pending-progress': `${progress * 100}%` } as CSSProperties}
        >
          <div
            className="pending-play-progress"
            style={{ width: `${progress * 100}%` }}
          />
          <span className="pending-play-timer-seconds">{seconds}</span>
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
              {canStackAttack && (
                <button className="pending-neigh-btn pending-attack-btn" onClick={playAttack}>
                  Attack
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
