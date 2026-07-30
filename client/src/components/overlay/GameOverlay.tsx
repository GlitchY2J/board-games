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
      };

      return (
        <CardSelectionOverlay
          title={titleMap[action.reason] ?? 'Descarta cartas'}
          subtitle={`Debes descartar ${action.cardsToDiscard} carta(s) de tu mano.`}
          items={player.hand.map((card) => ({
            id: card.id,
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

      const eligiblePlayers = gameState.players.filter((p) => {
        if (p.id === localPlayerId) return false;
        if (isBlatantThievery) return p.hand.length > 0;
        return p.stable.length > 0 || p.upgrades.length > 0 || p.downgrades.length > 0;
      });

      const items = eligiblePlayers.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: isBlatantThievery
          ? `${p.hand.length} carta(s) en mano`
          : `${p.stable.length} unicornio(s) en establo`,
      }));

      return (
        <CardSelectionOverlay
          title={isBlatantThievery ? '🃏 Blatant Thievery' : 'Seleccionar Objetivo'}
          subtitle={
            isBlatantThievery
              ? 'Elige al jugador cuya mano quieres ver y robar una carta'
              : 'Elige a un jugador como objetivo de tu acción'
          }
          items={items}
          maxSelection={1}
          confirmText="Seleccionar"
          onConfirm={([targetPlayerId]) => {
            socket.emit('select-player', {
              roomCode: gameState.roomCode,
              targetPlayerId,
            });
          }}
        />
      );
    }

    // ───────────────────────────────────
    // ROBAR CARTA DE LA MANO DE UN RIVAL (Blatant Thievery)
    // ───────────────────────────────────
    case 'select_hand_card': {
      if (action.sourcePlayerId !== localPlayerId) return null;

      const target = gameState.players.find((p) => p.id === action.targetPlayerId);
      if (!target) return null;

      return (
        <CardSelectionOverlay
          title="🃏 Blatant Thievery"
          subtitle={`Elige una carta de la mano de ${target.name} para robarla`}
          items={target.hand.map((card) => ({
            id: card.id,
            title: card.name,
            image: card.image,
          }))}
          maxSelection={1}
          confirmText="Robar carta"
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
    // SELECCIONAR CARTA DEL ESTABLO (Back Kick, etc.)
    // ───────────────────────────────────
    case 'select_stable_card': {
      if (action.sourcePlayerId !== localPlayerId) return null;

      const target = gameState.players.find((p) => p.id === action.targetPlayerId);
      if (!target) return null;

      const allCards = [...target.stable, ...target.upgrades, ...target.downgrades];

      return (
        <CardSelectionOverlay
          title="Seleccionar Carta del Establo"
          subtitle={`Selecciona una carta del establo de ${target.name}`}
          items={allCards.map((card) => ({
            id: card.id,
            title: card.name,
            image: card.image,
          }))}
          maxSelection={1}
          confirmText="Aceptar"
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
        [...p.upgrades, ...p.stable.filter((c) => c.cardType === 'upgrade')].map((card) => ({
          id: card.id,
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
        />
      );
    }

    default:
      return null;
  }
}
