import { socket } from '../../services/socket';
import { useEffect, useState } from 'react';
import type { GameState } from '../../types/GameState';
import CardSelectionOverlay from './CardSelectionOverlay';

interface Props {
  gameState: GameState;
  localPlayerId: string;
  hide?: boolean;
}

export default function GameOverlay({ gameState, localPlayerId, hide = false }: Props) {
  const action = gameState.pendingAction;

  const actionKey = (() => {
    if (!action) return null;
    const parts = [action.type, 'reason' in action ? action.reason : ''];
    if ('playerId' in action) parts.push(`player:${action.playerId}`);
    if ('sourcePlayerId' in action) parts.push(`source:${action.sourcePlayerId}`);
    if ('targetPlayerId' in action) parts.push(`target:${action.targetPlayerId}`);
    if ('remainingPlayerIds' in action) parts.push(`first:${action.remainingPlayerIds[0]}`);
    return parts.join(':');
  })();

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    setDismissedKey((prev) => (prev && prev !== actionKey ? null : prev));
  }, [actionKey]);

  const dismiss = () => setDismissedKey(actionKey);

  if (!action) {
    return null;
  }

  if (dismissedKey === actionKey) {
    return null;
  }

  switch (action.type) {
    // ───────────────────────────────────
    // DESCARTE DE CARTAS
    // ───────────────────────────────────
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
    case 'select_player': {
      if (action.sourcePlayerId !== localPlayerId) return null;

      const isBlatantThievery = action.reason === 'blatant_thievery';
      const isAmericorn = action.reason === 'americorn';
      const isUnicornPoison = action.reason === 'unicorn_poison';
      const isAnnoyingFlying = action.reason === 'annoying_flying_unicorn';
      const isPlayDowngrade = action.reason === 'play_downgrade';
      const isMermaid = action.reason === 'mermaid_unicorn';
      const needsHand = isBlatantThievery || isAmericorn || isAnnoyingFlying;

      const eligiblePlayers = gameState.players.filter((p) => {
        if (isPlayDowngrade) return true;
        if (p.id === localPlayerId) return false;
        if (needsHand) return p.hand.length > 0;
        if (isUnicornPoison) return p.stable.length > 0;
        return (
          p.stable.length > 0 ||
          p.upgrades.length > 0 ||
          p.downgrades.length > 0
        );
      });

      const items = eligiblePlayers.map((p) => ({
        id: p.id,
        title: p.id === localPlayerId ? `${p.name} (Tú)` : p.name,
        subtitle: isPlayDowngrade
          ? `Desmejoras actuales: ${p.downgrades.length}`
          : needsHand
            ? `${p.hand.length} carta(s) en mano`
            : `${p.stable.length} unicornio(s) en establo`,
      }));

      const getTitle = () => {
        if (isBlatantThievery) return '🃏 Blatant Thievery';
        if (isAmericorn) return '🇺🇸 Americorn';
        if (isUnicornPoison) return '🧪 Unicorn Poison';
        if (isAnnoyingFlying) return '🦄 Annoying Flying Unicorn';
        if (isPlayDowngrade) return '⏬ Jugar Desmejora';
        if (isMermaid) return '🧜‍♀️ Mermaid Unicorn';
        return 'Seleccionar Objetivo';
      };

      const getSubtitle = () => {
        if (isBlatantThievery)
          return 'Elige al jugador cuya mano quieres ver y robar una carta';
        if (isAmericorn)
          return 'Elige a un jugador para tomar una carta de su mano al azar';
        if (isUnicornPoison)
          return 'Elige a un jugador para destruir uno de sus unicornios';
        if (isAnnoyingFlying)
          return 'Elige a un jugador para forzarlo a descartar una carta';
        if (isPlayDowngrade)
          return 'Elige en qué establo deseas colocar esta carta de Desmejora';
        if (isMermaid)
          return 'Elige a un jugador para devolver una carta de su establo a su mano';
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
      if (action.sourcePlayerId !== localPlayerId) return null;

      const target = gameState.players.find(
        (p) => p.id === action.targetPlayerId,
      );
      if (!target) return null;

      const isAmericorn = action.reason === 'americorn';

      return (
        <CardSelectionOverlay
          hide={hide}
          title={isAmericorn ? '🇺🇸 Americorn' : '🃏 Blatant Thievery'}
          subtitle={
            isAmericorn
              ? `Elige una carta boca abajo de la mano de ${target.name}`
              : `Elige una carta de la mano de ${target.name} para robarla`
          }
          items={target.hand.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: isAmericorn ? `Carta ${idx + 1}` : card.name,
            image: isAmericorn ? '/cards/base/card_back.png' : card.image,
          }))}
          maxSelection={1}
          confirmText="Robar"
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
    case 'select_stable_card': {
      if (action.sourcePlayerId !== localPlayerId) return null;

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

      if (action.reason === 'rhinocorn') {
        const items = gameState.players
          .filter((p) => p.id !== localPlayerId)
          .flatMap((p) =>
            p.stable
              .filter((c) => c.cardType === 'unicorn')
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
              .filter((c) => c.cardType === 'unicorn')
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

      const target = gameState.players.find(
        (p) => p.id === action.targetPlayerId,
      );
      if (!target) return null;

      const isUnicornPoison = action.reason === 'unicorn_poison';
      const isMermaid = action.reason === 'mermaid_unicorn';

      const cardsToSelect = isUnicornPoison
        ? target.stable.filter((c) => c.id !== 'magical_kittencorn')
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
          confirmText={isUnicornPoison ? 'Destruir' : isMermaid ? 'Devolver' : 'Aceptar'}
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
    // ALLURING NARWHAL — Robar Mejora del establo
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
          subtitle="Roba una carta de Mejora del establo de otro jugador"
          items={upgradeCards}
          maxSelection={1}
          confirmText="Robar Mejora"
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
      if (!target || target.stable.length === 0) return null;

      const totalPlayers = gameState.players.filter(
        (p) => p.stable.length > 0,
      ).length;
      const remaining = action.remainingPlayerIds.length;
      const stepLabel = `Paso ${totalPlayers - remaining + 1} de ${totalPlayers}`;

      return (
        <CardSelectionOverlay
          hide={hide}
          key={currentTargetId}
          title="🌪️ Glitter Tornado"
          subtitle={`${stepLabel} — Elige una carta del establo de ${target.name} para regresar a su mano`}
          items={target.stable.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: card.name,
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

    // ───────────────────────────────────
    // LLAMACORN — cada jugador descarta 1 carta en orden
    // ───────────────────────────────────
    case 'llamacorn': {
      const needsToDiscard = action.remainingPlayerIds.includes(localPlayerId);
      const alreadyDiscarded = action.resolvedPlayerIds.includes(localPlayerId);

      if (!needsToDiscard && !alreadyDiscarded) return null;

      if (alreadyDiscarded) {
        return (
          <div className="overlay-backdrop">
            <div className="card-selection-window choice-window">
              <h2>🦙 Llamacorn</h2>
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
    // EXTREMELY DESTRUCTIVE UNICORN
    // ───────────────────────────────────
    case 'extremely_destructive_unicorn': {
      const targetPlayer = gameState.players.find((p) => p.id === localPlayerId);
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
                {action.remainingPlayerIds.length > action.resolvedPlayerIds.length
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

    // ───────────────────────────────────
    // DECISIÓN OPCIONAL (select_choice)
    // ───────────────────────────────────
    case 'select_choice': {
      if (action.playerId !== localPlayerId) return null;

      return (
        <div className="overlay-backdrop">
          <div className="card-selection-window choice-window">
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
        action.reason === 'majestic_flying_unicorn';

      const isMagicalFlyingUnicorn =
        action.reason === 'magical_flying_unicorn';
      const isMajesticFlyingUnicorn =
        action.reason === 'majestic_flying_unicorn';
      const isNecromancer = action.reason === 'necromancer_unicorn';

      const eligibleCards = gameState.discard.filter(
        (card) =>
          (!action.cardType || card.cardType === action.cardType) &&
          (addsToHand || card.id !== 'dark_angel_unicorn'),
      );

      return (
        <CardSelectionOverlay
          hide={hide}
          title={
            isMagicalFlyingUnicorn
              ? '🦄 Magical Flying Unicorn'
              : isMajesticFlyingUnicorn
                ? '🦄 Majestic Flying Unicorn'
                : isNecromancer
                  ? '🧙 Necromancer Unicorn'
                  : '😈 Dark Angel Unicorn'
          }
          subtitle={
            isMagicalFlyingUnicorn
              ? 'Elige una carta de Magia del descarte para añadirla a tu mano'
              : isMajesticFlyingUnicorn
                ? 'Elige un unicornio del descarte para añadirlo a tu mano'
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

      return (
        <CardSelectionOverlay
          hide={hide}
          title="🐳 Classy Narwhal"
          subtitle="Elige una carta de Mejora del mazo para agregarla a tu mano (luego se barajará el mazo)"
          items={action.candidates.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: card.name,
            image: card.image,
          }))}
          maxSelection={1}
          confirmText="Tomar"
          onConfirm={([cardId]) => {
            dismiss();
            socket.emit('select-deck-card', {
              roomCode: gameState.roomCode,
              cardId,
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

      const babies = gameState.nursery.filter(
        (card) => card.cardType === 'unicorn' && card.unicornClass === 'baby',
      );

      return (
        <CardSelectionOverlay
          hide={hide}
          title="🦢 Mother Goose Unicorn"
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
        (card) => card.cardType === 'unicorn' && card.unicornClass === 'basic',
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

    default:
      return null;
  }
}
