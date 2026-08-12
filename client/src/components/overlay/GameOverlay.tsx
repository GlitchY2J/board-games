import { socket } from '../../services/socket';
import type { GameState } from '../../types/GameState';
import CardSelectionOverlay from './CardSelectionOverlay';

interface Props {
  gameState: GameState;
  localPlayerId: string;
}

export default function GameOverlay({ gameState, localPlayerId }: Props) {
  const action = gameState.pendingAction;

  if (!action) {
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
      };

      return (
        <CardSelectionOverlay
          title={titleMap[action.reason] ?? 'Descarta cartas'}
          subtitle={`Debes descartar ${action.cardsToDiscard} carta(s) de tu mano.`}
          items={player.hand.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: card.name,
            image: card.image,
          }))}
          maxSelection={action.cardsToDiscard}
          confirmText="Descartar"
          onConfirm={(cardIds) => {
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
        return 'Elige a un jugador como objetivo de tu acción';
      };

      return (
        <CardSelectionOverlay
          title={getTitle()}
          subtitle={getSubtitle()}
          items={items}
          maxSelection={1}
          confirmText="Seleccionar"
          onConfirm={([playerId]) => {
            socket.emit('select-player', {
              roomCode: gameState.roomCode,
              playerId,
            });
          }}
          onCancel={
            isUnicornPoison || isAnnoyingFlying
              ? () => {
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
            title="🪚 Chainsaw Unicorn"
            subtitle="Selecciona un Upgrade de cualquier jugador para DESTRUIR, o un Downgrade de tu establo para SACRIFICAR"
            items={items}
            maxSelection={1}
            confirmText="Confirmar"
            onConfirm={([cardValue]) => {
              socket.emit('select-stable-card', {
                roomCode: gameState.roomCode,
                cardId: cardValue,
              });
            }}
            onCancel={() => {
              socket.emit('cancel-action', {
                roomCode: gameState.roomCode,
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

      const cardsToSelect = isUnicornPoison
        ? target.stable
        : [...target.stable, ...target.upgrades, ...target.downgrades];

      return (
        <CardSelectionOverlay
          title={
            isUnicornPoison
              ? '🧪 Unicorn Poison'
              : 'Seleccionar Carta del Establo'
          }
          subtitle={
            isUnicornPoison
              ? `Selecciona un unicornio del establo de ${target.name} para destruirlo`
              : `Selecciona una carta del establo de ${target.name}`
          }
          items={cardsToSelect.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: card.name,
            image: card.image,
          }))}
          maxSelection={1}
          confirmText={isUnicornPoison ? 'Destruir' : 'Aceptar'}
          onConfirm={([cardId]) => {
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
          title="✨ Alluring Narwhal"
          subtitle="Roba una carta de Mejora del establo de otro jugador"
          items={upgradeCards}
          maxSelection={1}
          confirmText="Robar Mejora"
          onConfirm={([cardId]) => {
            socket.emit('select-stable-card', {
              roomCode: gameState.roomCode,
              cardId,
            });
          }}
          onCancel={() => {
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
      if (!action.remainingPlayerIds.includes(localPlayerId)) return null;

      const player = gameState.players.find((p) => p.id === localPlayerId);
      if (!player) return null;

      return (
        <CardSelectionOverlay
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

      const eligibleCards = gameState.discard.filter(
        (card) =>
          (!action.cardType || card.cardType === action.cardType) &&
          card.id !== 'dark_angel_unicorn',
      );

      return (
        <CardSelectionOverlay
          title="😈 Dark Angel Unicorn"
          subtitle="Elige un unicornio del descarte para traerlo a tu establo"
          items={eligibleCards.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.uid,
            title: card.name,
            image: card.image,
          }))}
          maxSelection={1}
          confirmText="Traer al Establo"
          onConfirm={([cardId]) => {
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
            socket.emit('select-deck-card', {
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
