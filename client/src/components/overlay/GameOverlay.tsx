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
          title={titleMap[action.reason] || 'Descarta cartas'}
          subtitle={`Debes descartar ${action.cardsToDiscard} carta(s).`}
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

    case 'select_player': {
      if (action.sourcePlayerId !== localPlayerId) return null;

      const players = gameState.players
        .filter((p) => p.id !== localPlayerId && (p.stable.length > 0 || p.upgrades.length > 0 || p.downgrades.length > 0))
        .map((player) => ({
          id: player.id,
          title: player.name,
          subtitle: `${player.stable.length} unicornios, ${player.upgrades.length} mejoras`,
        }));

      return (
        <CardSelectionOverlay
          title="Seleccionar Objetivo"
          subtitle="Elige a un jugador como objetivo de tu acción"
          items={players}
          maxSelection={1}
          confirmText="Seleccionar"
          onConfirm={(selected) => {
            socket.emit('select-player', {
              roomCode: gameState.roomCode,
              targetPlayerId: selected[0],
            });
          }}
        />
      );
    }

    case 'select_stable_card': {
      if (action.sourcePlayerId !== localPlayerId) return null;

      const target = gameState.players.find((p) => p.id === action.targetPlayerId);
      if (!target) return null;

      const allCards = [...target.stable, ...target.upgrades, ...target.downgrades];

      return (
        <CardSelectionOverlay
          title="Seleccionar Carta"
          subtitle={`Selecciona una carta del establo de ${target.name}`}
          items={allCards.map((card) => ({
            id: card.id,
            title: card.name,
            image: card.image,
          }))}
          maxSelection={1}
          confirmText="Aceptar"
          onConfirm={(selected) => {
            socket.emit('select-stable-card', {
              roomCode: gameState.roomCode,
              cardId: selected[0],
            });
          }}
        />
      );
    }

    case 'alluring_narwhal': {
      if (action.playerId !== localPlayerId) return null;

      const opponentsWithUpgrades = gameState.players.filter(
        (p) => p.id !== localPlayerId && (p.upgrades.length > 0 || p.stable.some((c) => c.cardType === 'upgrade')),
      );

      const upgradeCards = opponentsWithUpgrades.flatMap((p) =>
        [...p.upgrades, ...p.stable.filter((c) => c.cardType === 'upgrade')].map((card) => ({
          id: card.id,
          title: `${card.name} (${p.name})`,
          image: card.image,
        })),
      );

      if (upgradeCards.length === 0) return null;

      return (
        <CardSelectionOverlay
          title="Alluring Narwhal"
          subtitle="Robas una carta de Mejora del establo de otro jugador"
          items={upgradeCards}
          maxSelection={1}
          confirmText="Robar Mejora"
          onConfirm={(selected) => {
            socket.emit('select-stable-card', {
              roomCode: gameState.roomCode,
              cardId: selected[0],
            });
          }}
        />
      );
    }

    default:
      return null;
  }
}
