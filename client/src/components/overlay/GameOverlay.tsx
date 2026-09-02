import { socket } from '../../services/socket';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState } from '../../types/GameState';
import CardSelectionOverlay from './CardSelectionOverlay';
import PlayingCard from '../card/PlayingCard';
import AlterTheFutureOverlay from './AlterTheFutureOverlay';

function isPandamoniumProtected(
  player: { downgrades: { id: string }[] },
  card: { cardType: string },
): boolean {
  return (
    card.cardType === 'unicorn' &&
    player.downgrades.some((c) => c.id === 'pandamonium')
  );
}

interface Props {
  gameState: GameState;
  localPlayerId: string;
  hide?: boolean;
}

export default function GameOverlay({
  gameState,
  localPlayerId,
  hide = false,
}: Props) {
  const action = gameState.pendingAction;

  const actionKey = (() => {
    if (!action) return null;
    const parts = [action.type, 'reason' in action ? action.reason : ''];
    if ('playerId' in action) parts.push(`player:${action.playerId}`);
    if ('sourcePlayerId' in action)
      parts.push(`source:${action.sourcePlayerId}`);
    if ('targetPlayerId' in action)
      parts.push(`target:${action.targetPlayerId}`);
    if ('phase' in action) parts.push(`phase:${action.phase}`);
    if ('remainingToDestroy' in action)
      parts.push(`rem:${action.remainingToDestroy}`);
    if ('remainingPlayerIds' in action && action.remainingPlayerIds)
      parts.push(`first:${action.remainingPlayerIds[0]}`);
    if ('resolvedPlayerIds' in action)
      parts.push(`resolved:${action.resolvedPlayerIds.join(',')}`);
    if ('effectCardId' in action) parts.push(`uid:${action.effectCardId}`);
    return parts.join(':');
  })();

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      setDismissedKey((prev) => (prev && prev !== actionKey ? null : prev));
      setMinimized(false);
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [actionKey]);

  const dismiss = () => setDismissedKey(actionKey);

  if (!action || hide) {
    return null;
  }

  if (dismissedKey === actionKey) {
    return null;
  }

  const renderResumeWaiting = (): ReactNode => {
    const resume = gameState.pendingResume;
    if (!resume || resume.length === 0) return null;

    for (const step of resume) {
      if (step.type === 'extremely_destructive_unicorn') {
        const stillAwaiting =
          step.remainingPlayerIds.includes(localPlayerId) &&
          !step.resolvedPlayerIds.includes(localPlayerId);
        if (stillAwaiting) {
          return (
            <div className="overlay-backdrop">
              <div className="card-selection-window choice-window">
                <h2>💥 Extremely Destructive Unicorn</h2>
                <p>
                  {step.remainingPlayerIds.length >
                  step.resolvedPlayerIds.length
                    ? 'Esperando sacrificios de otros jugadores...'
                    : 'Resolviendo efecto...'}
                </p>
              </div>
            </div>
          );
        }
      }
    }
    return null;
  };

  const renderOverlay = (): ReactNode => {
    // Si la acción actual pertenece a otro jugador (p. ej. el efecto de Unicorn
    // Phoenix que interrumpe), pero el jugador local aún está esperando su turno
    // en una cadena de acciones reanudables, mantener visible su overlay.
    if ('playerId' in action && action.playerId !== localPlayerId) {
      const waiting = renderResumeWaiting();
      if (waiting) return waiting;
    }

    if (
      action.type === 'select_hand_card' &&
      action.reason === 'favor' &&
      action.targetPlayerId !== localPlayerId
    ) {
      const target = gameState.players.find((player) => player.id === action.targetPlayerId);
      return (
        <div className="overlay-backdrop">
          <div className="card-selection-window choice-window">
            <h2>🃏 Favor</h2>
            <p>
              {target?.name ?? 'El jugador objetivo'} está escogiendo una carta para entregarla.
            </p>
          </div>
        </div>
      );
    }

    switch (action.type) {
      case 'exploding_kitten': {
        const affectedPlayer = gameState.players.find(
          (player) => player.id === action.playerId,
        );
        const isAffectedPlayer = action.playerId === localPlayerId;
        const localPlayer = gameState.players.find(
          (player) => player.id === localPlayerId,
        );
        const defuse = localPlayer?.hand.find((card) => card.id === 'defuse');

        return (
          <div className="overlay-backdrop">
            <div className="card-selection-window choice-window exploding-kitten-window">
              <h2>
                {isAffectedPlayer
                  ? 'Has robado un Exploding Kitten'
                  : `${affectedPlayer?.name ?? 'Un jugador'} ha robado un Exploding Kitten`}
              </h2>
              <div className="exploding-kitten-card">
                <PlayingCard
                  name={action.card.name}
                  image={action.card.image}
                  size="large"
                  disabled
                  preview={false}
                />
              </div>
              <p>
                {isAffectedPlayer
                  ? defuse
                    ? 'Usa un Defuse para sobrevivir o acepta tu eliminación.'
                    : 'No tienes un Defuse. Acepta tu eliminación.'
                  : `${affectedPlayer?.name ?? 'El jugador'} debe usar un Defuse o será eliminado.`}
              </p>
              {isAffectedPlayer && (
                <div className="choice-actions">
                  {defuse && (
                    <button
                      className="confirm-button choice-button"
                      onClick={() => {
                        dismiss();
                        socket.emit('resolve-exploding-kitten', {
                          roomCode: gameState.roomCode,
                          useDefuse: true,
                        });
                      }}
                    >
                      Usar Defuse
                    </button>
                  )}
                  <button
                    className="cancel-button choice-button"
                    onClick={() => {
                      dismiss();
                      socket.emit('resolve-exploding-kitten', {
                        roomCode: gameState.roomCode,
                        useDefuse: false,
                      });
                    }}
                  >
                    Aceptar
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      // ───────────────────────────────────
      // DESCARTE DE CARTAS
      // ───────────────────────────────────
      case 'select_discard_count': {
        const player = gameState.players.find((p) => p.id === localPlayerId);
        if (!player || action.playerId !== localPlayerId) return null;

        return (
          <CardSelectionOverlay
            hide={hide}
            title="☠️ Unicorn of Pestilence"
            subtitle="Elige cualquier número de cartas para descartar, incluyendo cero. Los demás jugadores descartarán la misma cantidad."
            items={player.hand.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={action.maxCards}
            minSelection={0}
            confirmText="Confirmar descarte"
            onConfirm={(cardIds) => {
              dismiss();
              socket.emit('discard-cards', {
                roomCode: gameState.roomCode,
                playerId: localPlayerId,
                cardIds,
              });
            }}
          />
        );
      }

      case 'pestilence_discard':
      case 'discard': {
        const player = gameState.players.find((p) => p.id === localPlayerId);
        if (!player || action.playerId !== localPlayerId) return null;

        const titleMap: Record<string, string> = {
          hand_limit: 'Límite de mano superado',
          change_of_luck: 'Change of Luck',
          back_kick: 'Back Kick',
          annoying_flying_unicorn: 'Annoying Flying Unicorn',
          good_deal: '🤝 Good Deal',
          necromancer_unicorn: '🧙 Necromancer Unicorn',
          seductive_unicorn: '💋 Seductive Unicorn',
          unicorn_on_the_cob: '🌽 Unicorn On The Cob',
          claw_machine: '🕹️ Claw Machine',
          extremely_fertile_unicorn: '🌱 Extremely Fertile Unicorn',
          rainbow_lasso: '🌈 Rainbow Lasso',
          stable_artillery: '🔫 Stable Artillery',
          barbed_wire: '🌵 Barbed Wire',
          unicorn_of_pestilence: '☠️ Unicorn of Pestilence',
          zombie_unicorn: '🧟 Zombie Unicorn',
        };

        const isNecromancer = action.reason === 'necromancer_unicorn';
        const discardableCards = isNecromancer
          ? player.hand.filter((c) => c.cardType === 'unicorn')
          : player.hand;

        return (
          <CardSelectionOverlay
            hide={hide}
            title={titleMap[action.reason] ?? 'Descarta cartas'}
            subtitle={
              isNecromancer
                ? `Debes descartar ${action.cardsToDiscard} unicornio(s) de tu mano.`
                : `Debes descartar ${action.cardsToDiscard} carta(s) de tu mano.`
            }
            items={discardableCards.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={action.cardsToDiscard}
            confirmText="Descartar"
            onConfirm={(cardIds) => {
              dismiss();
              socket.emit('discard-cards', {
                roomCode: gameState.roomCode,
                playerId: localPlayerId,
                cardIds,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // SELECCIONAR JUGADOR OBJETIVO
      // ───────────────────────────────────
      case 'select_players': {
        if (action.sourcePlayerId !== localPlayerId) return null;

        const items = gameState.players
          .filter((player) => action.playerIds.includes(player.id))
          .map((player) => ({
            id: player.id,
            title: player.name,
            avatar: player.avatar || undefined,
            subtitle: `${player.hand.length} carta(s) en mano`,
          }));

        return (
          <CardSelectionOverlay
            hide={hide}
            title="👑 Unicorn Rainbow Princess"
            subtitle="Elige cualquier cantidad de jugadores. Robarás una carta por cada jugador elegido y ellos podrán robar otra carta."
            items={items}
            maxSelection={items.length}
            minSelection={0}
            confirmText="Confirmar jugadores"
            onConfirm={(playerIds) => {
              dismiss();
              socket.emit('select-players', {
                roomCode: gameState.roomCode,
                playerIds,
              });
            }}
          />
        );
      }

      case 'select_player': {
        if (action.sourcePlayerId !== localPlayerId) return null;

         const isBlatantThievery = action.reason === 'blatant_thievery';
         const isAmericorn = action.reason === 'americorn';
         const isTwoOfAKind = action.reason === 'two_of_a_kind';
          const isThreeOfAKind = action.reason === 'three_of_a_kind';
          const isTargetedAttack = action.reason === 'targeted_attack';
         const isFavor = action.reason === 'favor';
        const isUnicornPoison = action.reason === 'unicorn_poison';
        const isAnnoyingFlying = action.reason === 'annoying_flying_unicorn';
        const isPlayDowngrade = action.reason === 'play_downgrade';
        const isMermaid = action.reason === 'mermaid_unicorn';
        const isUnfairBargain = action.reason === 'unfair_bargain';
         const isUnicornSwap = action.reason === 'unicorn_swap';
         const isACuteAttack = action.reason === 'a_cute_attack';
         const isUnicornNap = action.reason === 'unicorn_nap';
        const isReTargetSource = action.reason === 're_target_source';
        const isReTargetDestination = action.reason === 're_target_destination';
        const needsHand =
           isBlatantThievery ||
           isAmericorn ||
            isTwoOfAKind ||
             isThreeOfAKind ||
             isFavor ||
            isThreeOfAKind ||
           isAnnoyingFlying ||
          isUnfairBargain;

        const eligiblePlayers = gameState.players.filter((p) => {
          if (isPlayDowngrade) return true;
          if (isReTargetDestination) {
            // No puede moverse al propio establo ni al jugador de origen
            return p.id !== localPlayerId && p.id !== action.fromPlayerId;
          }
          if (isReTargetSource) {
            if (!(p.upgrades.length > 0 || p.downgrades.length > 0))
              return false;
            // Solo es fuente válida si existe al menos un destino posible
            // (distinto del lanzador y del jugador candidato a fuente).
            return gameState.players.some(
              (other) => other.id !== localPlayerId && other.id !== p.id,
            );
          }
          if (p.id === localPlayerId) return false;
          if (isTargetedAttack) return true;
          if (needsHand) return p.hand.length > 0;
          if (isUnicornSwap)
            return p.stable.some((c) => c.cardType === 'unicorn');
           if (isUnicornPoison) return p.stable.length > 0;
           if (isACuteAttack)
             return p.stable.some((c) => c.cardType === 'unicorn');
           if (isUnicornNap) return p.id !== localPlayerId;
          return (
            p.stable.length > 0 ||
            p.upgrades.length > 0 ||
            p.downgrades.length > 0
          );
        });

        const items = eligiblePlayers.map((p) => ({
          id: p.id,
          title: p.name,
          avatar: p.avatar || undefined,
          subtitle: isPlayDowngrade
            ? `Downgrades actuales: ${p.downgrades.length}`
            : isReTargetSource
              ? `${p.upgrades.length} upgrade(s), ${p.downgrades.length} downgrade(s)`
              : isUnicornSwap
                ? `${p.stable.filter((c) => c.cardType === 'unicorn').length} unicornio(s) en establo`
                : needsHand
                  ? `${p.hand.length} carta(s) en mano`
                  : `${p.stable.length} unicornio(s) en establo`,
        }));

        const getTitle = () => {
           if (isBlatantThievery) return '🃏 Blatant Thievery';
           if (isAmericorn) return '🇺🇸 Americorn';
            if (isTwoOfAKind) return '🎴 Two of a Kind';
             if (isThreeOfAKind) return '🎴 Three of a Kind';
            if (isFavor) return '🃏 Favor';
            if (isThreeOfAKind) return '🎴 Three of a Kind';
            if (isTargetedAttack) return '🎯 Targeted Attack';
          if (isUnicornPoison) return '🧪 Unicorn Poison';
          if (isAnnoyingFlying) return '🦄 Annoying Flying Unicorn';
          if (isPlayDowngrade) return '⏬ Jugar Downgrade';
          if (isMermaid) return '🧜‍♀️ Mermaid Unicorn';
          if (isUnfairBargain) return '🤝 Unfair Bargain';
           if (isUnicornSwap) return '🦄 Unicorn Swap';
           if (isACuteAttack) return '💖 A Cute Attack';
           if (isUnicornNap) return '😴 Unicorn Nap';
          if (isReTargetSource) return '🎯 Re-Target';
          if (isReTargetDestination) return '🎯 Re-Target: destino';
          return 'Seleccionar Objetivo';
        };

        const getSubtitle = () => {
           if (isBlatantThievery)
             return 'Elige al jugador cuya mano quieres ver y robar una carta';
           if (isAmericorn)
             return 'Elige a un jugador para tomar una carta de su mano al azar';
           if (isTwoOfAKind)
             return 'Elige a un jugador para tomarle una carta al azar';
            if (isThreeOfAKind)
              return 'Elige a un jugador para elegir una carta de su mano';
            if (isTargetedAttack)
              return 'Elige al jugador que recibirá el ataque';
           if (isFavor)
             return 'Elige a un jugador que tenga al menos una carta para entregarte';
           if (isThreeOfAKind)
             return 'Elige a un jugador para elegir una carta de su mano';
          if (isUnicornPoison)
            return 'Elige a un jugador para destruir uno de sus unicornios';
          if (isAnnoyingFlying)
            return 'Elige a un jugador para forzarlo a descartar una carta';
          if (isPlayDowngrade)
            return 'Elige en qué establo deseas colocar esta carta de Downgrade';
          if (isMermaid)
            return 'Elige a un jugador para devolver una carta de su establo a su mano';
          if (isUnfairBargain)
            return 'Elige a un jugador para intercambiar manos con él';
           if (isUnicornSwap)
             return 'Elige a un jugador para intercambiar un unicornio con él';
           if (isACuteAttack)
             return 'Elige un rival para destruir hasta 3 unicornios y reemplazarlos por Baby Unicorns';
           if (isUnicornNap)
             return 'Elige a un rival para que se salte su próximo turno';
          if (isReTargetSource)
            return 'Elige de qué jugador moverás un Upgrade o Downgrade';
          if (isReTargetDestination)
            return 'Elige a qué jugador se moverá la carta';
          return 'Elige a un jugador como objetivo de tu acción';
        };

        return (
          <CardSelectionOverlay
            hide={hide}
            title={getTitle()}
            subtitle={getSubtitle()}
            items={items}
            maxSelection={1}
            confirmText="Seleccionar"
            onConfirm={([playerId]) => {
              dismiss();
              socket.emit('select-player', {
                roomCode: gameState.roomCode,
                playerId,
              });
            }}
            onCancel={
              isUnicornPoison || isAnnoyingFlying || isMermaid
                ? () => {
                    dismiss();
                    socket.emit('cancel-action', {
                      roomCode: gameState.roomCode,
                    });
                  }
                : undefined
            }
          />
        );
      }

      case 'select_hand_card': {
        const isFavor = action.reason === 'favor';
        if (isFavor
          ? action.targetPlayerId !== localPlayerId
          : action.sourcePlayerId !== localPlayerId) return null;

        if (action.reason === 'glitter_unicorn') {
          const player = gameState.players.find((p) => p.id === localPlayerId);
          if (!player) return null;

          const upgrades = player.hand.filter((card) => card.cardType === 'upgrade');

          return (
            <CardSelectionOverlay
              hide={hide}
              title="✨ Glitter Unicorn"
              subtitle="Elige una carta de Upgrade de tu mano para colocarla en tu establo"
              items={upgrades.map((card, idx) => ({
                id: `${card.id}_${idx}`,
                value: card.uid,
                title: card.name,
                image: card.image,
              }))}
              maxSelection={1}
              confirmText="Jugar Upgrade"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-hand-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'zombie_unicorn') {
          const player = gameState.players.find((p) => p.id === localPlayerId);
          if (!player) return null;

          const unicorns = player.hand.filter((card) => card.cardType === 'unicorn');
          return (
            <CardSelectionOverlay
              hide={hide}
              title="🧟 Zombie Unicorn"
              subtitle="Descarta una carta de Unicornio de tu mano"
              items={unicorns.map((card, idx) => ({
                id: `${card.id}_${idx}`,
                value: card.uid,
                title: card.name,
                image: card.image,
              }))}
              maxSelection={1}
              confirmText="Descartar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-hand-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        const target = gameState.players.find(
          (p) => p.id === action.targetPlayerId,
        );
        if (!target) return null;

        const isAmericorn = action.reason === 'americorn';
        const isTwoOfAKind = action.reason === 'two_of_a_kind';
        const isThreeOfAKind = action.reason === 'three_of_a_kind';
        const hasNannyCam = target.downgrades.some((c) => c.id === 'nanny_cam');
        const revealAmericorn = isAmericorn && hasNannyCam;

        return (
          <CardSelectionOverlay
            hide={hide}
            title={isFavor ? '🃏 Favor' : isThreeOfAKind ? '🐱 Three of a Kind' : isTwoOfAKind ? '🐱 Two of a Kind' : isAmericorn ? '🇺🇸 Americorn' : '🃏 Blatant Thievery'}
            subtitle={
              isFavor
                ? `Elige cualquier carta de tu mano para entregársela a ${gameState.players.find((p) => p.id === action.sourcePlayerId)?.name ?? 'ese jugador'}`
                : isThreeOfAKind
                ? `Elige una carta boca abajo de tipo ${action.requestedCardType ?? 'seleccionado'} de la mano de ${target.name}`
                : isTwoOfAKind
                  ? `Elige una carta boca abajo de la mano de ${target.name}`
                : isAmericorn || isTwoOfAKind
                ? revealAmericorn
                  ? `Nanny Cam: se ven las cartas de ${target.name}. Elige una`
                  : `Elige una carta boca abajo de la mano de ${target.name}`
                : `Elige una carta de la mano de ${target.name} para robarla`
            }
            items={target.hand.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
                title: isFavor ? card.name : revealAmericorn
                ? card.name
                : isAmericorn || isTwoOfAKind || isThreeOfAKind
                  ? `Carta ${idx + 1}`
                  : card.name,
                image: isFavor
                  ? card.image
                  : revealAmericorn
                ? card.image
                : isAmericorn || isTwoOfAKind || isThreeOfAKind
                  ? '/cards/unstable-unicorns/base/card_back.png'
                  : card.image,
            }))}
            maxSelection={1}
            confirmText={isFavor ? 'Dar' : 'Robar'}
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-hand-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // SELECCIONAR CARTA DEL ESTABLO (Back Kick, Unicorn Poison, etc.)
      // ───────────────────────────────────
      case 'two_for_one': {
        if (action.sourcePlayerId !== localPlayerId) return null;

        const isSacrifice = action.phase === 'sacrifice';

        let items: {
          id: string;
          value: string;
          title: string;
          subtitle?: string;
          image: string;
        }[] = [];

        if (isSacrifice) {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          if (localPlayer) {
            const zones: Array<[string, typeof localPlayer.stable]> = [
              ['stable', localPlayer.stable],
              ['upgrade', localPlayer.upgrades],
              ['downgrade', localPlayer.downgrades],
            ];
            items = zones.flatMap(([zone, cards]) =>
              cards.map((card, idx) => ({
                id: `${card.id}_${zone}_${idx}`,
                value: card.uid,
                title: card.name,
                subtitle:
                  zone === 'stable'
                    ? 'Tu establo'
                    : zone === 'upgrade'
                      ? 'Tu upgrade'
                      : 'Tu downgrade',
                image: card.image,
              })),
            );
          }
        } else {
          items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) => {
              const zones: Array<[string, typeof p.stable]> = [
                ['stable', p.stable],
                ['upgrade', p.upgrades],
                ['downgrade', p.downgrades],
              ];
              return zones.flatMap(([zone, cards]) =>
                cards.map((card, idx) => ({
                  id: `${card.id}_${p.id}_${zone}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
              );
            });
        }

        return (
          <CardSelectionOverlay
            hide={hide}
            title="🎴 Two For One"
            subtitle={
              isSacrifice
                ? 'SACRIFICA 1 carta de tu establo'
                : `DESTRUYE ${action.remainingToDestroy} carta(s) de establos rivales`
            }
            items={items}
            maxSelection={isSacrifice ? 1 : action.remainingToDestroy}
            confirmText="Confirmar"
            onConfirm={(values) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId: isSacrifice ? values[0] : values,
              });
            }}
          />
        );
      }

      case 'select_stable_card': {
        if (action.sourcePlayerId !== localPlayerId) return null;

        if (action.reason === 'a_cute_attack_destroy') {
          const target = gameState.players.find(
            (p) => p.id === action.targetPlayerId,
          );
          if (!target) return null;
          const items = target.stable
            .filter((card) => card.cardType === 'unicorn')
            .map((card, index) => ({
              id: `${card.uid}_${index}`,
              value: card.uid,
              title: card.name,
              subtitle: `Establo de ${target.name}`,
              image: card.image,
            }));
          const count = action.remainingToDestroy ?? 0;
          return (
            <CardSelectionOverlay
              hide={hide}
              title="💖 A Cute Attack"
              subtitle={`Elige ${count} unicornio(s) para destruir del establo de ${target.name}`}
              items={items}
              minSelection={count}
              maxSelection={count}
              confirmText="Destruir y reemplazar"
              onConfirm={(values) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId: values,
                });
              }}
            />
          );
        }

        if (
          action.reason === 'fire_and_brimstone_destroy' ||
          action.reason === 'overpopulation_destroy' ||
          action.reason === 'llamapocalypse_destroy' ||
          action.reason === 'heavenly_smite_destroy' ||
          action.reason === 'storm_of_cuteness_destroy' ||
           action.reason === 'zombie_apocalypse_destroy' ||
           action.reason === 'ultimate_destruction_destroy' ||
           action.reason === 'spray_bottle_of_youth_destroy'
        ) {
          const target = gameState.players.find(
            (p) => p.id === action.targetPlayerId,
          );
          if (!target) return null;
          const items = target.stable
            .filter((card) => card.cardType === 'unicorn')
            .map((card, index) => ({
              id: `${card.uid}_${index}`,
              value: card.uid,
              title: card.name,
              subtitle: `Establo de ${target.name}`,
              image: card.image,
            }));
          return (
            <CardSelectionOverlay
              hide={hide}
              title={
                action.reason === 'overpopulation_destroy'
                  ? '🌱 Overpopulation'
                  : action.reason === 'llamapocalypse_destroy'
                    ? '🦙 Llamapocalypse'
                    : action.reason === 'heavenly_smite_destroy'
                      ? '✨ Heavenly Smite'
                      : action.reason === 'storm_of_cuteness_destroy'
                      ? '🌪️ Storm of Cuteness'
                        : action.reason === 'zombie_apocalypse_destroy'
                        ? '🧟 Zombie Apocalypse'
                           : action.reason === 'ultimate_destruction_destroy'
                            ? '💥 Ultimate Destruction'
                            : action.reason === 'spray_bottle_of_youth_destroy'
                              ? '🧴 Spray Bottle Of Youth'
                              : '🔥 Fire and Brimstone'
              }
              subtitle={`Destruye 1 unicornio del establo de ${target.name}`}
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 're_target_card') {
          const source = gameState.players.find(
            (p) => p.id === action.targetPlayerId,
          );
          if (!source) return null;

          const items = [
            ...source.upgrades.map((card, idx) => ({
              id: `${card.id}_up_${idx}`,
              value: card.uid,
              title: `Upgrade: ${card.name}`,
              image: card.image,
            })),
            ...source.downgrades.map((card, idx) => ({
              id: `${card.id}_down_${idx}`,
              value: card.uid,
              title: `Downgrade: ${card.name}`,
              image: card.image,
            })),
          ];

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🎯 Re-Target"
              subtitle={`Elige qué Upgrade o Downgrade mover del establo de ${source.name}`}
              items={items}
              maxSelection={1}
              confirmText="Mover"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'chainsaw_unicorn') {
          const items: {
            id: string;
            value: string;
            title: string;
            image: string;
          }[] = [];
          gameState.players.forEach((p) => {
            if (p.id === localPlayerId) return;
            p.upgrades.forEach((card, idx) => {
              items.push({
                id: `${card.id}_upgrade_${p.id}_${idx}`,
                value: JSON.stringify({
                  cardId: card.uid,
                  targetPlayerId: p.id,
                  type: 'upgrade',
                }),
                title: `Upgrade de ${p.name}`,
                image: card.image,
              });
            });
          });

          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          if (localPlayer) {
            localPlayer.downgrades.forEach((card, idx) => {
              items.push({
                id: `${card.id}_downgrade_${localPlayerId}_${idx}`,
                value: JSON.stringify({
                  cardId: card.uid,
                  targetPlayerId: localPlayerId,
                  type: 'downgrade',
                }),
                title: `Downgrade de ${localPlayer.name}`,
                image: card.image,
              });
            });
          }

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🪚 Chainsaw Unicorn"
              subtitle="Selecciona un Upgrade de cualquier jugador para DESTRUIR, o un Downgrade de tu establo para SACRIFICAR"
              items={items}
              maxSelection={1}
              confirmText="Confirmar"
              onConfirm={([cardValue]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId: cardValue,
                });
              }}
              onCancel={() => {
                dismiss();
                socket.emit('cancel-action', {
                  roomCode: gameState.roomCode,
                });
              }}
            />
          );
        }

        if (action.reason === 'targeted_destruction') {
          const items: {
            id: string;
            value: string;
            title: string;
            image: string;
          }[] = [];

          gameState.players.forEach((p) => {
            if (p.id === localPlayerId) return;
            p.upgrades.forEach((card, idx) => {
              items.push({
                id: `${card.id}_upgrade_${p.id}_${idx}`,
                value: JSON.stringify({
                  cardId: card.uid,
                  targetPlayerId: p.id,
                  type: 'upgrade',
                }),
                title: `Upgrade de ${p.name}`,
                image: card.image,
              });
            });
          });

          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          if (localPlayer) {
            localPlayer.downgrades.forEach((card, idx) => {
              items.push({
                id: `${card.id}_downgrade_${localPlayerId}_${idx}`,
                value: JSON.stringify({
                  cardId: card.uid,
                  targetPlayerId: localPlayerId,
                  type: 'downgrade',
                }),
                title: `Downgrade de ${localPlayer.name}`,
                image: card.image,
              });
            });
          }

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🎯 Targeted Destruction"
              subtitle="Selecciona un Upgrade de cualquier jugador para DESTRUIR, o un Downgrade de tu establo para SACRIFICAR"
              items={items}
              maxSelection={1}
              confirmText="Confirmar"
              onConfirm={([cardValue]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId: cardValue,
                });
              }}
              onCancel={() => {
                dismiss();
                socket.emit('cancel-action', {
                  roomCode: gameState.roomCode,
                });
              }}
            />
          );
        }

        if (action.reason === 'rhinocorn') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (c) =>
                   c.cardType === 'unicorn' &&
                     !isPandamoniumProtected(p, c) &&
                     c.id !== 'the_tiniest_unicorn',
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🦏 Rhinocorn"
              subtitle="Elige un unicornio de OTRO jugador para DESTRUIR. Pasarás a la fase de acción sin acciones."
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'unicorn_of_war_destroy') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (card) =>
                    card.cardType === 'unicorn' &&
                    !isPandamoniumProtected(p, card) &&
                    card.id !== 'the_tiniest_unicorn' &&
                    card.id !== 'unicorn_of_war',
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="⚔️ Unicorn of War"
              subtitle="Elige un unicornio de otro jugador para DESTRUIR."
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'unicorn_of_death_sacrifice') {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          const items = (localPlayer?.stable ?? [])
            .filter((card) => card.cardType === 'unicorn')
            .map((card, idx) => ({
              id: `${card.id}_stable_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu establo',
              image: card.image,
            }));

          return (
            <CardSelectionOverlay
              hide={hide}
              title="💀 Unicorn of Death"
              subtitle="Elige un unicornio de tu establo para SACRIFICAR. Luego destruirás un unicornio de otro establo."
              items={items}
              maxSelection={1}
              confirmText="Sacrificar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'unicorn_of_death_destroy') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (card) =>
                    card.cardType === 'unicorn' &&
                    !isPandamoniumProtected(p, card) &&
                    card.id !== 'the_tiniest_unicorn',
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="💀 Unicorn of Death"
              subtitle="Elige un unicornio de OTRO jugador para DESTRUIR."
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'caffeine_overload') {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );

          const items = [
            ...(localPlayer?.stable ?? []).map((card, idx) => ({
              id: `${card.id}_stable_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu establo',
              image: card.image,
            })),
            ...(localPlayer?.upgrades ?? []).map((card, idx) => ({
              id: `${card.id}_upg_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu upgrade',
              image: card.image,
            })),
            ...(localPlayer?.downgrades ?? []).map((card, idx) => ({
              id: `${card.id}_dow_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu downgrade',
              image: card.image,
            })),
          ];

          return (
            <CardSelectionOverlay
              hide={hide}
              title="☕ Caffeine Overload"
              subtitle="Elige una carta de tu establo para SACRIFICAR. Luego robarás 2 cartas."
              items={items}
              maxSelection={1}
              confirmText="Sacrificar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'glitter_bomb_sacrifice') {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );

          const items = [
            ...(localPlayer?.stable ?? []).map((card, idx) => ({
              id: `${card.id}_stable_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu establo',
              image: card.image,
            })),
            ...(localPlayer?.upgrades ?? []).map((card, idx) => ({
              id: `${card.id}_upg_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu upgrade',
              image: card.image,
            })),
            ...(localPlayer?.downgrades ?? []).map((card, idx) => ({
              id: `${card.id}_dow_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu downgrade',
              image: card.image,
            })),
          ];

          return (
            <CardSelectionOverlay
              hide={hide}
              title="✨ Glitter Bomb"
              subtitle="Elige una carta para SACRIFICAR. Luego destruirás una carta."
              items={items}
              maxSelection={1}
              confirmText="Sacrificar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'glitter_bomb_destroy') {
          const items: {
            id: string;
            value: string;
            title: string;
            image: string;
          }[] = [];

          gameState.players.forEach((p) => {
            if (p.id === localPlayerId) return;
            [
              ...p.stable.map((c) => ({ ...c, zone: 'establo' as const })),
              ...p.upgrades.map((c) => ({ ...c, zone: 'upgrade' as const })),
              ...p.downgrades.map((c) => ({
                ...c,
                zone: 'downgrade' as const,
              })),
            ].forEach((card, idx) => {
              if (card.id === 'the_tiniest_unicorn') return;

              items.push({
                id: `${card.id}_${p.id}_${idx}`,
                value: card.uid,
                title: `${card.name} — ${p.name} (${card.zone})`,
                image: card.image,
              });
            });
          });

          return (
            <CardSelectionOverlay
              hide={hide}
              title="✨ Glitter Bomb"
              subtitle="Elige una carta de cualquier jugador para DESTRUIR."
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'unicorn_swap_give') {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          const target = gameState.players.find(
            (p) => p.id === action.targetPlayerId,
          );

          const items = (localPlayer?.stable ?? [])
            .filter(
              (c) =>
                c.cardType === 'unicorn' &&
                (!localPlayer || !isPandamoniumProtected(localPlayer, c)),
            )
            .map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu establo',
              image: card.image,
            }));

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🦄 Unicorn Swap"
              subtitle={`Elige un unicornio de TU establo para moverlo al establo de ${target?.name ?? ''}`}
              items={items}
              maxSelection={1}
              confirmText="Mover"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'unicorn_swap_steal') {
          const target = gameState.players.find(
            (p) => p.id === action.targetPlayerId,
          );

          const items = (target?.stable ?? [])
            .filter(
              (c) =>
                c.cardType === 'unicorn' &&
                (!target || !isPandamoniumProtected(target, c)),
            )
            .map((card, idx) => ({
              id: `${card.id}_${target?.id}_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: `Establo de ${target?.name ?? ''}`,
              image: card.image,
            }));

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🦄 Unicorn Swap"
              subtitle={`ROBA un unicornio del establo de ${target?.name ?? ''}`}
              items={items}
              maxSelection={1}
              confirmText="Robar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'stabby_the_unicorn') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (c) =>
                   c.cardType === 'unicorn' &&
                     !isPandamoniumProtected(p, c) &&
                     c.id !== 'the_tiniest_unicorn',
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🔪 Stabby The Unicorn"
              subtitle="Elige un unicornio para DESTRUIR"
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'shark_with_a_horn') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (c) =>
                   c.cardType === 'unicorn' &&
                     !isPandamoniumProtected(p, c) &&
                     c.id !== 'the_tiniest_unicorn',
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🦈 Shark With A Horn"
              subtitle="Elige un unicornio para DESTRUIR"
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'seductive_unicorn') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (c) =>
                   c.cardType === 'unicorn' &&
                     !isPandamoniumProtected(p, c) &&
                     c.id !== 'the_tiniest_unicorn',
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="💋 Seductive Unicorn"
              subtitle="Elige un unicornio de otro jugador para ROBARLO a tu establo"
              items={items}
              maxSelection={1}
              confirmText="Robar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'rainbow_lasso_steal') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (c) =>
                    c.cardType === 'unicorn' && !isPandamoniumProtected(p, c),
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🌈 Rainbow Lasso"
              subtitle="Elige un unicornio de otro jugador para ROBARLO a tu establo"
              items={items}
              maxSelection={1}
              confirmText="Robar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'stable_artillery_destroy') {
          const items = gameState.players
            .filter((p) => p.id !== localPlayerId)
            .flatMap((p) =>
              p.stable
                .filter(
                  (c) =>
                    c.cardType === 'unicorn' && !isPandamoniumProtected(p, c),
                )
                .map((card, idx) => ({
                  id: `${card.id}_${p.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  subtitle: `Establo de ${p.name}`,
                  image: card.image,
                })),
            );

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🔫 Stable Artillery"
              subtitle="Elige un unicornio para DESTRUIR"
              items={items}
              maxSelection={1}
              confirmText="Destruir"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'dark_angel_unicorn') {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          if (!localPlayer) return null;

          return (
            <CardSelectionOverlay
              hide={hide}
              title="😈 Dark Angel Unicorn"
              subtitle="Elige un unicornio de TU establo para sacrificar"
              items={localPlayer.stable
                .filter(
                  (c) =>
                    c.cardType === 'unicorn' &&
                    !isPandamoniumProtected(localPlayer, c),
                )
                .map((card, idx) => ({
                  id: `${card.id}_${idx}`,
                  value: card.uid,
                  title: card.name,
                  image: card.image,
                }))}
              maxSelection={1}
              confirmText="Sacrificar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'tiny_stable') {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          const items = (localPlayer?.stable ?? [])
            .filter(
              (c) =>
                c.cardType === 'unicorn' &&
                (!localPlayer || !isPandamoniumProtected(localPlayer, c)),
            )
            .map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu establo',
              image: card.image,
            }));

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🏠 Tiny Stable"
              subtitle="Tienes más de 5 unicornios. DEBES sacrificar un unicornio de tu establo."
              items={items}
              maxSelection={1}
              confirmText="Sacrificar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        if (action.reason === 'sadistic_ritual') {
          const localPlayer = gameState.players.find(
            (p) => p.id === localPlayerId,
          );
          const items = (localPlayer?.stable ?? [])
            .filter(
              (c) =>
                c.cardType === 'unicorn' &&
                (!localPlayer || !isPandamoniumProtected(localPlayer, c)),
            )
            .map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              subtitle: 'Tu establo',
              image: card.image,
            }));

          return (
            <CardSelectionOverlay
              hide={hide}
              title="🩸 Sadistic Ritual"
              subtitle="DEBES sacrificar un unicornio de tu establo para robar una carta."
              items={items}
              maxSelection={1}
              confirmText="Sacrificar"
              onConfirm={([cardId]) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId,
                });
              }}
            />
          );
        }

        const target = gameState.players.find(
          (p) => p.id === action.targetPlayerId,
        );
        if (!target) return null;

        const isUnicornPoison = action.reason === 'unicorn_poison';
        const isMermaid = action.reason === 'mermaid_unicorn';

        const cardsToSelect = isUnicornPoison
          ? target.stable.filter(
              (c) =>
                c.id !== 'magical_kittencorn' &&
                !isPandamoniumProtected(target, c),
            )
          : [...target.stable, ...target.upgrades, ...target.downgrades];

        return (
          <CardSelectionOverlay
            hide={hide}
            title={
              isUnicornPoison
                ? '🧪 Unicorn Poison'
                : isMermaid
                  ? '🧜‍♀️ Mermaid Unicorn'
                  : 'Seleccionar Carta del Establo'
            }
            subtitle={
              isUnicornPoison
                ? `Selecciona un unicornio del establo de ${target.name} para destruirlo`
                : isMermaid
                  ? `Selecciona una carta del establo de ${target.name} para devolverla a su mano`
                  : `Selecciona una carta del establo de ${target.name}`
            }
            items={cardsToSelect.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText={
              isUnicornPoison ? 'Destruir' : isMermaid ? 'Devolver' : 'Aceptar'
            }
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // ALLURING NARWHAL — Robar Upgrade del establo
      // ───────────────────────────────────
      case 'alluring_narwhal': {
        if (action.playerId !== localPlayerId) return null;

        const opponentsWithUpgrades = gameState.players.filter(
          (p) =>
            p.id !== localPlayerId &&
            (p.upgrades.length > 0 ||
              p.stable.some((c) => c.cardType === 'upgrade')),
        );

        const upgradeCards = opponentsWithUpgrades.flatMap((p) =>
          [
            ...p.upgrades,
            ...p.stable.filter((c) => c.cardType === 'upgrade'),
          ].map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: card.name,
            subtitle: `Establo de ${p.name}`,
            image: card.image,
          })),
        );

        if (upgradeCards.length === 0) return null;

        return (
          <CardSelectionOverlay
            hide={hide}
            title="✨ Alluring Narwhal"
            subtitle="Roba una carta de Upgrade del establo de otro jugador"
            items={upgradeCards}
            maxSelection={1}
            confirmText="Robar Upgrade"
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
            onCancel={() => {
              dismiss();
              socket.emit('cancel-action', {
                roomCode: gameState.roomCode,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // GLITTER TORNADO — el jugador activo elige una carta por cada establo
      // ───────────────────────────────────
      case 'glitter_tornado': {
        // Solo muestra el overlay al jugador que jugó la carta
        if (action.sourcePlayerId !== localPlayerId) return null;

        const currentTargetId = action.remainingPlayerIds[0];
        const target = gameState.players.find((p) => p.id === currentTargetId);
        if (
          !target ||
          (target.stable.length === 0 &&
            target.upgrades.length === 0 &&
            target.downgrades.length === 0)
        )
          return null;

        const totalPlayers = gameState.players.filter(
          (p) =>
            p.stable.length > 0 ||
            p.upgrades.length > 0 ||
            p.downgrades.length > 0,
        ).length;
        const remaining = action.remainingPlayerIds.length;
        const stepLabel = `Paso ${totalPlayers - remaining + 1} de ${totalPlayers}`;

        const targetCards = [
          ...target.stable.map((c) => ({ ...c, zone: 'Establo' })),
          ...target.upgrades.map((c) => ({ ...c, zone: 'Upgrade' })),
          ...target.downgrades.map((c) => ({ ...c, zone: 'Downgrade' })),
        ];

        return (
          <CardSelectionOverlay
            hide={hide}
            key={currentTargetId}
            title="🌪️ Glitter Tornado"
            subtitle={`${stepLabel} — Elige una carta del establo de ${target.name} para regresar a su mano`}
            items={targetCards.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: `${card.name} (${card.zone})`,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText={remaining === 1 ? 'Confirmar' : 'Siguiente →'}
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // MYSTICAL VORTEX — cada jugador debe descartar una carta de forma secuencial
      // ───────────────────────────────────
      case 'mystical_vortex': {
        const currentTargetId = action.remainingPlayerIds[0];
        if (currentTargetId !== localPlayerId) return null;

        const player = gameState.players.find((p) => p.id === localPlayerId);
        if (!player) return null;

        return (
          <CardSelectionOverlay
            hide={hide}
            key={localPlayerId}
            title="🌪️ Mystical Vortex"
            subtitle="Debes descartar 1 carta de tu mano. El descarte se barajará en el mazo principal."
            items={player.hand.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText="Descartar"
            onConfirm={(cardIds) => {
              dismiss();
              socket.emit('discard-cards', {
                roomCode: gameState.roomCode,
                playerId: localPlayerId,
                cardIds,
              });
            }}
          />
        );
      }

      case 'plague_of_death': {
        if (action.sourcePlayerId !== localPlayerId) return null;
        const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
        if (!localPlayer) return null;

        if (action.phase === 'sacrifice') {
          const items = [
            ...localPlayer.stable,
            ...localPlayer.upgrades,
            ...localPlayer.downgrades,
          ].map((card, index) => ({
            id: `${card.uid}_${index}`,
            value: card.uid,
            title: card.name,
            subtitle: 'Tu establo',
            image: card.image,
          }));
          return (
            <CardSelectionOverlay
              hide={hide}
              title="☠️ Plague of Death"
              subtitle="Sacrifica cualquier número de cartas. Cero también es válido."
              items={items}
              minSelection={0}
              maxSelection={items.length}
              confirmText="Continuar"
              onConfirm={(values) => {
                dismiss();
                socket.emit('select-stable-card', {
                  roomCode: gameState.roomCode,
                  cardId: values,
                });
              }}
            />
          );
        }

        const items = gameState.players.flatMap((player) =>
          [...player.stable, ...player.upgrades, ...player.downgrades].map(
            (card, index) => ({
              id: `${player.id}_${card.uid}_${index}`,
              value: card.uid,
              title: card.name,
              subtitle: `Establo de ${player.name}`,
              image: card.image,
            }),
          ),
        );
        return (
          <CardSelectionOverlay
            hide={hide}
            title="☠️ Plague of Death"
            subtitle={`Destruye ${action.cardsToDestroy} carta(s) de cualquier establo`}
            items={items}
            minSelection={action.cardsToDestroy}
            maxSelection={action.cardsToDestroy}
            confirmText="Destruir"
            onConfirm={(values) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId: values,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // LLAMACORN — cada jugador descarta 1 carta en orden
      // ───────────────────────────────────
      case 'llamacorn': {
        const needsToDiscard =
          action.remainingPlayerIds.includes(localPlayerId);
        const alreadyDiscarded =
          action.resolvedPlayerIds.includes(localPlayerId);

        if (!needsToDiscard && !alreadyDiscarded) return null;

        if (alreadyDiscarded) {
          return (
            <div className="overlay-backdrop">
              <div className="card-selection-window choice-window">
                <h2>🦙 Llamacorn</h2>
                <p>
                  Esperando a que los demás jugadores descarten sus cartas...
                </p>
              </div>
            </div>
          );
        }

        const player = gameState.players.find((p) => p.id === localPlayerId);
        if (!player) return null;

        return (
          <CardSelectionOverlay
            hide={hide}
            key={localPlayerId}
            title="🦙 Llamacorn"
            subtitle="Debes descartar 1 carta de tu mano."
            items={player.hand.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText="Descartar"
            onConfirm={(cardIds) => {
              dismiss();
              socket.emit('discard-cards', {
                roomCode: gameState.roomCode,
                playerId: localPlayerId,
                cardIds,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // FRENCHIECORN — cada rival descarta 1 carta
      // ───────────────────────────────────
      case 'frenchiecorn': {
        const needsToDiscard =
          action.remainingPlayerIds.includes(localPlayerId) &&
          !action.resolvedPlayerIds.includes(localPlayerId);
        const alreadyDiscarded = action.resolvedPlayerIds.includes(localPlayerId);
        const isSource = action.sourcePlayerId === localPlayerId;

        if (!needsToDiscard && !alreadyDiscarded && !isSource) return null;

        if (!needsToDiscard) {
          return (
            <div className="overlay-backdrop" role="status" aria-live="polite">
              <div className="card-selection-window choice-window">
                <h2>🐶 Frenchiecorn</h2>
                <p>Esperando a que los demás jugadores descarten sus cartas...</p>
              </div>
            </div>
          );
        }

        const player = gameState.players.find((p) => p.id === localPlayerId);
        if (!player) return null;

        return (
          <CardSelectionOverlay
            hide={hide}
            key={localPlayerId}
            title="🐶 Frenchiecorn"
            subtitle="Debes descartar 1 carta de tu mano. Al terminar, su dueño podrá elegir una carta descartada."
            items={player.hand.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText="Descartar"
            onConfirm={(cardIds) => {
              dismiss();
              socket.emit('discard-cards', {
                roomCode: gameState.roomCode,
                playerId: localPlayerId,
                cardIds,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // EXTREMELY DESTRUCTIVE UNICORN
      // ───────────────────────────────────
      case 'extremely_destructive_unicorn': {
        const targetPlayer = gameState.players.find(
          (p) => p.id === localPlayerId,
        );
        const needsToResolve =
          action.remainingPlayerIds.includes(localPlayerId) &&
          !action.resolvedPlayerIds.includes(localPlayerId);

        if (!targetPlayer) return null;

        if (!needsToResolve) {
          return (
            <div className="overlay-backdrop">
              <div className="card-selection-window choice-window">
                <h2>💥 Extremely Destructive Unicorn</h2>
                <p>
                  {action.remainingPlayerIds.length >
                  action.resolvedPlayerIds.length
                    ? 'Esperando sacrificios de otros jugadores...'
                    : 'Resolviendo efecto...'}
                </p>
              </div>
            </div>
          );
        }

        const player = targetPlayer;

        return (
          <CardSelectionOverlay
            hide={hide}
            title="💥 Extremely Destructive Unicorn"
            subtitle="Debes sacrificar 1 unicornio de tu establo."
            items={player.stable
              .filter((card) => card.cardType === 'unicorn')
              .map((card, idx) => ({
                id: `${card.id}_${idx}`,
                value: card.uid,
                title: card.name,
                image: card.image,
              }))}
            maxSelection={1}
            confirmText="Sacrificar"
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      case 'adorable_flying_unicorn': {
        const targetPlayer = gameState.players.find(
          (p) => p.id === localPlayerId,
        );
        const needsToResolve =
          action.remainingPlayerIds.includes(localPlayerId) &&
          !action.resolvedPlayerIds.includes(localPlayerId);

        if (!targetPlayer) return null;

        if (!needsToResolve) {
          return (
            <div className="overlay-backdrop">
              <div className="card-selection-window choice-window">
                <h2>🦄 Adorable Flying Unicorn</h2>
                <p>
                  {action.remainingPlayerIds.length >
                  action.resolvedPlayerIds.length
                    ? 'Esperando sacrificios de otros jugadores...'
                    : 'Resolviendo efecto...'}
                </p>
              </div>
            </div>
          );
        }

        const zones: Array<[string, typeof targetPlayer.stable]> = [
          ['stable', targetPlayer.stable],
          ['upgrade', targetPlayer.upgrades],
          ['downgrade', targetPlayer.downgrades],
        ];

        const items = zones.flatMap(([zone, cards]) =>
          cards.map((card, idx) => ({
            id: `${card.id}_${zone}_${idx}`,
            value: card.uid,
            title: card.name,
            subtitle:
              zone === 'stable'
                ? 'Tu establo'
                : zone === 'upgrade'
                  ? 'Tu upgrade'
                  : 'Tu downgrade',
            image: card.image,
          })),
        );

        return (
          <CardSelectionOverlay
            hide={hide}
            title="🦄 Adorable Flying Unicorn"
            subtitle="Debes sacrificar 1 carta de tu establo (unicornio, upgrade o downgrade)."
            items={items}
            maxSelection={1}
            confirmText="Sacrificar"
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      case 'cotton_candy_unicorn': {
        const targetPlayer = gameState.players.find(
          (p) => p.id === localPlayerId,
        );
        const needsToResolve =
          action.remainingPlayerIds.includes(localPlayerId) &&
          !action.resolvedPlayerIds.includes(localPlayerId);
        const remainingSacrifices =
          action.remainingPlayerIds.length - action.resolvedPlayerIds.length;

        if (!targetPlayer) return null;

        if (!needsToResolve) {
          return (
            <div className="overlay-backdrop" role="status" aria-live="polite">
              <div className="card-selection-window choice-window">
                <h2>🍬 Cotton Candy Unicorn</h2>
                <p>
                  {remainingSacrifices > 0
                    ? `Esperando a que ${remainingSacrifices === 1 ? 'otro jugador termine' : `otros ${remainingSacrifices} jugadores terminen`} de sacrificar...`
                    : 'Resolviendo efecto...'}
                </p>
              </div>
            </div>
          );
        }

        const items = targetPlayer.stable
          .filter(
            (c) =>
              c.cardType === 'unicorn' &&
              !isPandamoniumProtected(targetPlayer, c),
          )
          .map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: card.name,
            image: card.image,
          }));

        return (
          <CardSelectionOverlay
            hide={hide}
            title="🍬 Cotton Candy Unicorn"
            subtitle="Debes sacrificar 1 unicornio de tu establo."
            items={items}
            maxSelection={1}
            confirmText="Sacrificar"
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // DECISIÓN OPCIONAL (select_choice)
      // ───────────────────────────────────
      case 'select_choice': {
        if (action.playerId !== localPlayerId) return null;
        const threeOfAKindIcons: Record<string, string> = {
          beard_cat: '/icons/beard-cat.png',
          cattermelon: '/icons/cattermelon.png',
          hairy_potato_cat: '/icons/hairy-potato-cat.png',
          rainbow_ralphing_cat: '/icons/rainbow-ralphing-cat.png',
          tacocat: '/icons/tacocat.png',
          attack: '/icons/attack-2x.png',
          defuse: '/icons/defuse.png',
          favor: '/icons/favor.png',
          nope: '/icons/nope.png',
          see_the_future: '/icons/see-the-future-3x.png',
          shuffle: '/icons/shuffle.png',
          skip: '/icons/skip.png',
        };
        const isThreeOfAKind = action.reason === 'three_of_a_kind';

        return (
          <div className="overlay-backdrop">
            <div className={`card-selection-window choice-window${isThreeOfAKind ? ' choice-window-three-of-a-kind' : ''}`}>
              <h2>{action.title}</h2>
              <p>{action.description}</p>
              <div className="choice-options-grid">
                {action.options.map((option) => (
                  <button
                    key={option.value}
                    className="confirm-button choice-button"
                    onClick={() => {
                      dismiss();
                      socket.emit('select-choice', {
                        roomCode: gameState.roomCode,
                        choice: option.value,
                      });
                    }}
                  >
                    {isThreeOfAKind && threeOfAKindIcons[option.value] && (
                      <img
                        src={threeOfAKindIcons[option.value]}
                        alt=""
                        className="choice-button-icon"
                      />
                    )}
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ───────────────────────────────────
      // SELECCIONAR CARTA DEL DESCARTE
      // ───────────────────────────────────
      case 'select_discard_card': {
        if (action.playerId !== localPlayerId) return null;

        const addsToHand =
          action.reason === 'magical_flying_unicorn' ||
          action.reason === 'majestic_flying_unicorn' ||
          action.reason === 'swift_flying_unicorn' ||
          action.reason === 'frenchiecorn';

        const isMagicalFlyingUnicorn =
          action.reason === 'magical_flying_unicorn';
        const isMajesticFlyingUnicorn =
          action.reason === 'majestic_flying_unicorn';
        const isNecromancer = action.reason === 'necromancer_unicorn';
        const isSwiftFlyingUnicorn = action.reason === 'swift_flying_unicorn';
        const isKissOfLife = action.reason === 'kiss_of_life';
        const isAngelUnicorn = action.reason === 'angel_unicorn';
        const isFrenchiecorn = action.reason === 'frenchiecorn';

        const eligibleCards = [...gameState.discard].reverse().filter(
          (card) =>
            (!action.cardType || card.cardType === action.cardType) &&
            (!isFrenchiecorn || action.discardedCardIds?.includes(card.uid)) &&
            (action.reason !== 'dark_angel_unicorn' ||
              card.id !== 'dark_angel_unicorn') &&
            (!isSwiftFlyingUnicorn ||
              card.effect === 'neigh' ||
              card.effect === 'super_neigh' ||
              card.effect === 'neigh_thank_you'),
        );

        return (
          <CardSelectionOverlay
            hide={hide}
            title={
              isAngelUnicorn
                ? '👼 Angel Unicorn'
                : isMagicalFlyingUnicorn
                  ? '🦄 Magical Flying Unicorn'
                  : isMajesticFlyingUnicorn
                    ? '🦄 Majestic Flying Unicorn'
                    : isSwiftFlyingUnicorn
                      ? '🕊️ Swifty Flying Unicorn'
                      : isNecromancer
                        ? '🧙 Necromancer Unicorn'
                        : isKissOfLife
                          ? '💋 Kiss Of Life'
                          : isFrenchiecorn
                            ? '🐶 Frenchiecorn'
                          : '😈 Dark Angel Unicorn'
            }
            subtitle={
              isMagicalFlyingUnicorn
                ? 'Elige una carta de Magia del descarte para añadirla a tu mano'
                : isMajesticFlyingUnicorn
                  ? 'Elige un unicornio del descarte para añadirlo a tu mano'
                : isSwiftFlyingUnicorn
                    ? 'Elige un Neigh del descarte para añadirlo a tu mano'
                    : isFrenchiecorn
                      ? 'Elige una de las cartas descartadas por los demás jugadores para añadirla a tu mano'
                    : 'Elige un unicornio del descarte para traerlo a tu establo'
            }
            items={eligibleCards.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText={addsToHand ? 'Añadir a la Mano' : 'Traer al Establo'}
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-discard-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // SELECCIONAR CARTA DEL MAZO
      // ───────────────────────────────────
      case 'select_deck_card': {
        if (action.playerId !== localPlayerId) return null;

        const isGreatNarwhal = action.reason === 'the_great_narwhal';
        const isShabbyNarwhal = action.reason === 'shabby_the_narwhal';
        const isDebugDraw = action.reason === 'debug_draw';
        const isApocalypseSearch =
          action.reason === 'unicorns_of_the_apocalypse';
        const isExplodingKittenDefuse = action.reason === 'exploding_kitten_defuse';
        const isImplodingKittenPlace = action.reason === 'imploding_kitten_place';

        const title = isImplodingKittenPlace
          ? '💥 Coloca el Imploding Kitten'
          : isExplodingKittenDefuse
          ? '🛡️ Coloca el Exploding Kitten'
          : isDebugDraw
          ? '🐛 Modo Debug — Roba una carta'
          : isApocalypseSearch
            ? '☄️ Unicorns of the Apocalypse'
          : isGreatNarwhal
            ? '🐋 The Great Narwhal'
            : isShabbyNarwhal
              ? '🦄 Shabby The Narwhal'
              : '🐳 Classy Narwhal';

        const subtitle = isImplodingKittenPlace
          ? 'Elige en qué posición del mazo quieres colocar el Imploding Kitten boca arriba'
          : isExplodingKittenDefuse
          ? 'Elige en qué posición del mazo quieres devolver el Exploding Kitten'
          : isDebugDraw
          ? 'Elige qué carta del mazo quieres tomar en tu fase de robo'
          : isApocalypseSearch
            ? 'Elige 4 Unicornios del mazo para traerlos a tu establo'
          : isGreatNarwhal
            ? 'Elige una carta con "Narwhal" en su nombre para agregarla a tu mano (luego se barajará el mazo)'
            : isShabbyNarwhal
              ? 'Elige una carta de Downgrade del mazo para agregarla a tu mano (luego se barajará el mazo)'
              : 'Elige una carta de Upgrade del mazo para agregarla a tu mano (luego se barajará el mazo)';

        const items = isExplodingKittenDefuse || isImplodingKittenPlace
          ? Array.from({ length: gameState.deck.length + 1 }, (_, idx) => ({
              id: `deck-position-${idx}`,
              value: `deck-position-${idx}`,
              title: idx === 0
                ? 'Parte superior'
                : idx === gameState.deck.length
                  ? 'Parte inferior'
                  : `Posición ${idx + 1}`,
              image: gameState.deck[idx]?.faceUp
                ? gameState.deck[idx].image
                : '/cards/exploding-kittens/base/back-card.png',
            }))
          : isDebugDraw || isApocalypseSearch
          ? (isApocalypseSearch
            ? action.candidates
            : gameState.deck
          ).map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))
          : action.candidates.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }));

        return (
          <CardSelectionOverlay
            hide={hide}
            title={title}
            subtitle={subtitle}
            items={items}
            maxSelection={isApocalypseSearch ? 4 : 1}
            minSelection={isApocalypseSearch ? 4 : 1}
             confirmText={isExplodingKittenDefuse || isImplodingKittenPlace ? 'Colocar' : isDebugDraw ? 'Robar' : isApocalypseSearch ? 'Traer al establo' : 'Tomar'}
            searchable={isDebugDraw}
            searchPlaceholder="Buscar carta en el mazo..."
            secondaryText={isExplodingKittenDefuse ? 'Ubicación aleatoria' : undefined}
             onSecondary={isExplodingKittenDefuse || isImplodingKittenPlace ? () => {
              dismiss();
              const randomPosition = Math.floor(Math.random() * (gameState.deck.length + 1));
              socket.emit('select-deck-card', {
                roomCode: gameState.roomCode,
                cardId: `deck-position-${randomPosition}`,
              });
            } : undefined}
            onConfirm={(cardIds) => {
              dismiss();
              socket.emit('select-deck-card', {
                roomCode: gameState.roomCode,
                cardId: isApocalypseSearch ? cardIds : cardIds[0],
              });
            }}
          />
        );
      }

      case 'see_the_future': {
        if (action.playerId !== localPlayerId) return null;

        return (
          <div className="overlay-backdrop">
            <div className="card-selection-window choice-window see-the-future-window">
              <h2>🔮 See the Future 3x</h2>
              <p>Estas son las primeras cartas del mazo. El orden no ha cambiado.</p>
              <div className="see-the-future-cards">
                {action.candidates.map((card) => (
                  <PlayingCard
                    key={card.uid}
                    name={card.name}
                    image={card.image}
                    size="medium"
                    disabled
                  />
                ))}
              </div>
              <button
                className="confirm-button choice-button"
                onClick={() => {
                  dismiss();
                  socket.emit('resolve-see-the-future', {
                    roomCode: gameState.roomCode,
                  });
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        );
      }

      case 'alter_the_future': {
        if (action.playerId !== localPlayerId) return null;
        return (
          <AlterTheFutureOverlay
            candidates={action.candidates}
            onConfirm={(orderedIds) => {
              dismiss();
              socket.emit('resolve-see-the-future', {
                roomCode: gameState.roomCode,
                orderedCardIds: orderedIds,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // SELECCIONAR CARTAS DE LA NURSERY
      // ───────────────────────────────────
      case 'select_nursery_card': {
        if (action.playerId !== localPlayerId) return null;

        const isExtremelyFertile =
          action.reason === 'extremely_fertile_unicorn';

        const babies = gameState.nursery.filter(
          (card) => card.cardType === 'unicorn' && card.unicornClass === 'baby',
        );

        return (
          <CardSelectionOverlay
            hide={hide}
            title={
              isExtremelyFertile
                ? '🌱 Extremely Fertile Unicorn'
                : '🦢 Mother Goose Unicorn'
            }
            subtitle="Elige un Baby Unicorn de la Nursery para traerlo a tu establo"
            items={babies.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText="Traer al Establo"
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-nursery-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // RAINBOW UNICORN — traer un unicornio básico de la mano al establo
      // ───────────────────────────────────
      case 'select_own_hand_card': {
        if (action.playerId !== localPlayerId) return null;

        const player = gameState.players.find((p) => p.id === localPlayerId);
        if (!player) return null;

        const basicUnicorns = player.hand.filter(
          (card) =>
            card.cardType === 'unicorn' && card.unicornClass === 'basic',
        );

        return (
          <CardSelectionOverlay
            hide={hide}
            title="🌈 Rainbow Unicorn"
            subtitle="Elige un unicornio básico de tu mano para traerlo directamente a tu establo"
            items={basicUnicorns.map((card, idx) => ({
              id: `${card.id}_${idx}`,
              value: card.uid,
              title: card.name,
              image: card.image,
            }))}
            maxSelection={1}
            confirmText="Traer al Establo"
            onConfirm={([cardId]) => {
              dismiss();
              socket.emit('select-own-hand-card', {
                roomCode: gameState.roomCode,
                cardId,
              });
            }}
          />
        );
      }

      // ───────────────────────────────────
      // UNICORN ORACLE — mirar 3 cartas, robar 1, ordenar las 2 restantes
      // ───────────────────────────────────
      case 'select_oracle_cards': {
        if (action.playerId !== localPlayerId) return null;

        return (
          <UnicornOracleOverlay
            roomCode={gameState.roomCode}
            candidates={action.candidates}
            onDone={dismiss}
          />
        );
      }

      default:
        return null;
    }
  };

  const overlay = renderOverlay();
  if (!overlay) {
    return null;
  }

  return (
    <>
      <button
        className="overlay-toggle"
        title={minimized ? 'Mostrar overlay' : 'Ocultar overlay'}
        onClick={() => setMinimized((m) => !m)}
      >
        {minimized ? '◉' : '−'}
      </button>
      {!minimized && overlay}
    </>
  );
}

function UnicornOracleOverlay({
  roomCode,
  candidates,
  onDone,
}: {
  roomCode: string;
  candidates: { uid: string; id: string; name: string; image: string }[];
  onDone: () => void;
}) {
  const [order, setOrder] = useState(candidates);
  const [draggedUid, setDraggedUid] = useState<string | null>(null);

  function confirm() {
    if (order.length !== 3) return;
    socket.emit('select-oracle-cards', {
      roomCode,
      handCardId: order[0].uid,
      orderCardIds: [order[1].uid, order[2].uid],
    });
    onDone();
  }

  function moveOrderCard(targetUid: string) {
    if (!draggedUid || draggedUid === targetUid) return;
    setOrder((prev) => {
      const fromIndex = prev.findIndex((card) => card.uid === draggedUid);
      const toIndex = prev.findIndex((card) => card.uid === targetUid);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedUid(null);
  }

  return (
    <div className="overlay-backdrop">
      <div className="card-selection-window choice-window oracle-overlay-window">
        <h2>🔮 Unicorn Oracle</h2>
        <p>
          Arrastra las 3 cartas para ordenarlas. Izquierda: tu mano. Centro:
          cima del mazo. Derecha: debajo de la segunda carta.
        </p>

        <div className="oracle-order-row oracle-single-row">
          {order.map((card, i) => (
            <button
              key={card.uid}
              className={`oracle-order-card choice-button ${draggedUid === card.uid ? 'oracle-dragging' : ''}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', card.uid);
                setDraggedUid(card.uid);
              }}
              onDragEnd={() => setDraggedUid(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveOrderCard(card.uid)}
            >
              <span className="oracle-position">{i === 0 ? 'MANO' : i === 1 ? 'CIMA' : 'DEBAJO'}</span>
              <img src={card.image} alt={card.name} />
              <span className="text-xs">{card.name}</span>
            </button>
          ))}
        </div>

        <button className="confirm-button choice-button" onClick={confirm}>
          Confirmar
        </button>
      </div>
    </div>
  );
}
