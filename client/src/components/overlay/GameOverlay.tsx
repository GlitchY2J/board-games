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
            value: card.id,
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
      const needsHand = isBlatantThievery || isAmericorn || isAnnoyingFlying;

      const eligiblePlayers = gameState.players.filter((p) => {
        if (p.id === localPlayerId) return false;
        if (needsHand) return p.hand.length > 0;
        if (isUnicornPoison) return p.stable.length > 0;
        return p.stable.length > 0 || p.upgrades.length > 0 || p.downgrades.length > 0;
      });

      const items = eligiblePlayers.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: needsHand
          ? `${p.hand.length} carta(s) en mano`
          : `${p.stable.length} unicornio(s) en establo`,
      }));

      const getTitle = () => {
        if (isBlatantThievery) return '🃏 Blatant Thievery';
        if (isAmericorn) return '🇺🇸 Americorn';
        if (isUnicornPoison) return '🧪 Unicorn Poison';
        if (isAnnoyingFlying) return '🦄 Annoying Flying Unicorn';
        return 'Seleccionar Objetivo';
      };

      const getSubtitle = () => {
        if (isBlatantThievery) return 'Elige al jugador cuya mano quieres ver y robar una carta';
        if (isAmericorn) return 'Elige a un jugador para tomar una carta de su mano al azar';
        if (isUnicornPoison) return 'Elige a un jugador para destruir uno de sus unicornios';
        if (isAnnoyingFlying) return 'Elige a un jugador para forzarlo a descartar una carta';
        return 'Elige a un jugador como objetivo de tu acción';
      };

      return (
        <CardSelectionOverlay
          title={getTitle()}
          subtitle={getSubtitle()}
          items={items}
          maxSelection={1}
          confirmText="Seleccionar"
          onConfirm={([targetPlayerId]) => {
            socket.emit('select-player', {
              roomCode: gameState.roomCode,
              targetPlayerId,
            });
          }}
          onCancel={
            isAmericorn || isUnicornPoison || isAnnoyingFlying
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

      const target = gameState.players.find((p) => p.id === action.targetPlayerId);
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
            value: card.id,
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
          onCancel={
            isAmericorn
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

    // ───────────────────────────────────
    // SELECCIONAR CARTA DEL ESTABLO (Back Kick, Unicorn Poison, etc.)
    // ───────────────────────────────────
    case 'select_stable_card': {
      if (action.sourcePlayerId !== localPlayerId) return null;

      const target = gameState.players.find((p) => p.id === action.targetPlayerId);
      if (!target) return null;

      const isUnicornPoison = action.reason === 'unicorn_poison';

      const cardsToSelect = isUnicornPoison
        ? target.stable
        : [...target.stable, ...target.upgrades, ...target.downgrades];

      return (
        <CardSelectionOverlay
          title={isUnicornPoison ? '🧪 Unicorn Poison' : 'Seleccionar Carta del Establo'}
          subtitle={
            isUnicornPoison
              ? `Selecciona un unicornio del establo de ${target.name} para destruirlo`
              : `Selecciona una carta del establo de ${target.name}`
          }
          items={cardsToSelect.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.id,
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
          (p.upgrades.length > 0 || p.stable.some((c) => c.cardType === 'upgrade')),
      );

      const upgradeCards = opponentsWithUpgrades.flatMap((p) =>
        [...p.upgrades, ...p.stable.filter((c) => c.cardType === 'upgrade')].map((card, idx) => ({
          id: `${card.id}_${idx}`,
          value: card.id,
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

      const totalPlayers = gameState.players.filter((p) => p.stable.length > 0).length;
      const remaining = action.remainingPlayerIds.length;
      const stepLabel = `Paso ${totalPlayers - remaining + 1} de ${totalPlayers}`;

      return (
        <CardSelectionOverlay
          key={currentTargetId}
          title="🌪️ Glitter Tornado"
          subtitle={`${stepLabel} — Elige una carta del establo de ${target.name} para regresar a su mano`}
          items={target.stable.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.id,
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
            value: card.id,
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
    // SELECCIONAR CARTA DE LA PILA DE DESCARTE
    // ───────────────────────────────────
    case 'select_discard_card': {
      if (action.playerId !== localPlayerId) return null;

      const eligibleCards = gameState.discard.filter((card) => {
        if (action.cardType && card.cardType !== action.cardType) return false;
        if (action.reason === 'angel_unicorn' && card.id === 'angel_unicorn') return false;
        return true;
      });

      return (
        <CardSelectionOverlay
          title="Seleccionar del Descarte"
          subtitle="Elige un unicornio de la pila de descarte para traerlo a tu establo"
          items={eligibleCards.map((card, idx) => ({
            id: `${card.id}_${idx}`,
            value: card.id,
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

    default:
      return null;
  }
}
