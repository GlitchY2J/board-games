import type { GameServer, GameSocket } from "./socketTypes.ts";

import { ActionResolver } from "../game/unstable-unicorns/engine/ActionResolver.ts";
import { CardMovement } from "../game/unstable-unicorns/engine/CardMovement.ts";
import { TurnManager } from "../game/turn/TurnManager.ts";
import { TurnPhase } from "../game/turn/TurnPhase.ts";
import { emitGameError, getSocketGameContext } from "./socketContext.ts";
import { emitGameState } from "./gameStateEmitter.ts";
import { addLog } from "./gameLog.ts";
import { roomManager } from "../roomManagerInstance.ts";
import { GameState } from "../game/models/GameState.ts";

export function registerActionHandlers(
  io: GameServer,
  socket: GameSocket,
): void {
  registerDiscardCards(io, socket);
  registerSelectPlayer(io, socket);
  registerSelectStableCard(io, socket);
  registerSelectHandCard(io, socket);
  registerCancelAction(io, socket);
  registerSelectChoice(io, socket);
  registerSelectDiscardCard(io, socket);
  registerSelectDeckCard(io, socket);

  function continueBeginningPhaseIfReady(game: GameState): void {
    if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
      TurnManager.nextPhase(game);
    }
  }

  function registerDiscardCards(io: GameServer, socket: GameSocket): void {
    socket.on("discard-cards", ({ roomCode, playerId, cardIds }) => {
      const context = getSocketGameContext(socket, roomCode);

      if (!context) {
        return;
      }

      const { game, player, room } = context;

      if (playerId !== player.id) {
        emitGameError(
          socket,
          "INVALID_PLAYER",
          "El jugador enviado no coincide con tu sesión.",
          "discard-card",
        );
        return;
      }

      if (!game.pendingAction) {
        emitGameError(
          socket,
          "NO_PENDING_ACTION",
          "No hay una acción de descarte pendiente.",
          "discard-card",
        );
        return;
      }

      let resolved = false;

      if (game.pendingAction.type === "mystical_vortex") {
        resolved = ActionResolver.handleMysticalVortexDiscard(
          game,
          player.id,
          cardIds,
        );
      } else {
        resolved = ActionResolver.handleDiscard(game, player.id, cardIds);
      }

      if (!resolved) {
        emitGameError(
          socket,
          "INVALID_SELECTION",
          "La selección de descarte no es válida.",
          "discard-card",
        );
        return;
      }

      continueBeginningPhaseIfReady(game);

      addLog(
        game,
        `${player.name} descartó ${cardIds.length} carta${cardIds.length > 1 ? "s" : ""}`,
        { playerId: player.id },
      );

      emitGameState(io, room, "game-updated");
    });
  }

  function registerSelectPlayer(io: GameServer, socket: GameSocket): void {
    socket.on("select-player", ({ roomCode, playerId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const sourcePlayer = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!sourcePlayer) return;

      const resolved = ActionResolver.handleSelectPlayer(
        room.gameState,
        sourcePlayer.id,
        playerId,
      );

      if (resolved) {
        if (
          !room.gameState.pendingAction &&
          room.gameState.phase === TurnPhase.BEGINNING
        ) {
          TurnManager.nextPhase(room.gameState);
        }

        const targetPlayer = room.gameState.players.find(
          (p) => p.id === playerId,
        );

        addLog(
          room.gameState,
          targetPlayer
            ? `${sourcePlayer.name} eligió a ${targetPlayer.name}`
            : `${sourcePlayer.name} elige un jugador`,
          { playerId: sourcePlayer.id },
        );

        emitGameState(io, room, "game-updated");
      }
    });
  }

  function registerSelectStableCard(io: GameServer, socket: GameSocket): void {
    socket.on("select-stable-card", ({ roomCode, cardId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const sourcePlayer = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!sourcePlayer) return;

      const resolved = ActionResolver.handleSelectStableCard(
        room.gameState,
        sourcePlayer.id,
        cardId,
      );

      if (resolved) {
        if (
          !room.gameState.pendingAction &&
          room.gameState.phase === TurnPhase.BEGINNING
        ) {
          TurnManager.nextPhase(room.gameState);
        }

        addLog(
          room.gameState,
          `${sourcePlayer.name} eligió una carta de su establo`,
          { playerId: sourcePlayer.id },
        );

        emitGameState(io, room, "game-updated");
      }
    });
  }

  function registerSelectHandCard(io: GameServer, socket: GameSocket): void {
    socket.on("select-hand-card", ({ roomCode, cardId }) => {
      const context = getSocketGameContext(socket, roomCode);

      if (!context) {
        return;
      }

      const { room, game, player } = context;

      const pending = game.pendingAction;

      if (!pending || pending.type !== "select_hand_card") {
        emitGameError(
          socket,
          "NO_PENDING_ACTION",
          "No hay una selección de mano pendiente.",
          "select-hand-card",
        );
        return;
      }

      if (pending.sourcePlayerId !== player.id) {
        emitGameError(
          socket,
          "NOT_YOUR_TURN",
          "No puedes resolver la acción de otro jugador.",
          "select-hand-card",
        );
        return;
      }

      let resolvedCardId = cardId;

      if (pending.reason === "americorn") {
        const targetPlayer = game.players.find(
          (candidate) => candidate.id === pending.targetPlayerId,
        );

        if (!targetPlayer) {
          emitGameError(
            socket,
            "PLAYER_NOT_FOUND",
            "No se encontró el jugador objetivo.",
            "select-hand-card",
          );
          return;
        }

        const expectedPrefix = `hidden-hand-${targetPlayer.id}-`;

        if (!cardId.startsWith(expectedPrefix)) {
          emitGameError(
            socket,
            "INVALID_SELECTION",
            "La carta seleccionada no es válida.",
            "select-hand-card",
          );
          return;
        }

        const indexText = cardId.slice(expectedPrefix.length);

        const selectedIndex = Number(indexText);

        if (
          !Number.isInteger(selectedIndex) ||
          selectedIndex < 0 ||
          selectedIndex >= targetPlayer.hand.length
        ) {
          emitGameError(
            socket,
            "INVALID_SELECTION",
            "La posición de la carta seleccionada no es válida.",
            "select-hand-card",
          );
          return;
        }

        resolvedCardId = targetPlayer.hand[selectedIndex].uid;
      }
      const resolved = ActionResolver.handleSelectHandCard(
        game,
        player.id,
        resolvedCardId,
      );

      if (!resolved) {
        emitGameError(
          socket,
          "INVALID_SELECTION",
          "No se pudo seleccionar esa carta.",
          "select-hand-card",
        );
        return;
      }

      continueBeginningPhaseIfReady(game);

      if (pending.reason === "americorn") {
        const targetPlayer = game.players.find(
          (candidate) => candidate.id === pending.targetPlayerId,
        );

        addLog(
          game,
          targetPlayer
            ? `${player.name} robó una carta de la mano de ${targetPlayer.name}`
            : `${player.name} robó una carta de una mano`,
          { playerId: player.id },
        );
      } else {
        addLog(game, `${player.name} eligió una carta de una mano`, {
          playerId: player.id,
        });
      }

      emitGameState(io, room, "game-updated");
    });
  }

  function registerCancelAction(io: GameServer, socket: GameSocket): void {
    socket.on("cancel-action", ({ roomCode }) => {
      const context = getSocketGameContext(socket, roomCode);

      if (!context) {
        return;
      }

      const { game, player, room } = context;
      const pending = game.pendingAction;

      if (!pending) {
        emitGameError(
          socket,
          "NO_PENDING_ACTION",
          "No hay una acción pendiente para cancelar.",
          "cancel-action",
        );
        return;
      }

      const pendingPlayerId =
        "playerId" in pending
          ? pending.playerId
          : "sourcePlayerId" in pending
            ? pending.sourcePlayerId
            : undefined;

      if (!pendingPlayerId || pendingPlayerId !== player.id) {
        emitGameError(
          socket,
          "NOT_YOUR_TURN",
          "No puedes cancelar la acción de otro jugador.",
          "cancel-action",
        );
        return;
      }

      game.pendingAction = undefined;

      addLog(game, `${player.name} canceló la acción`, { playerId: player.id });

      emitGameState(io, room, "game-updated");
    });
  }

  function registerSelectChoice(io: GameServer, socket: GameSocket): void {
    socket.on("select-choice", ({ roomCode, choice }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const player = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!player) return;

      const pending = room.gameState.pendingAction;
      if (
        !pending ||
        pending.type !== "select_choice" ||
        pending.playerId !== player.id
      ) {
        return;
      }

      if (pending.reason === "annoying_flying_unicorn") {
        if (choice === "yes") {
          const rivals = room.gameState.players.filter(
            (p) => p.id !== player.id && p.hand.length > 0,
          );

          if (rivals.length === 1) {
            room.gameState.pendingAction = {
              type: "discard",
              reason: "annoying_flying_unicorn",
              playerId: rivals[0].id,
              cardsToDiscard: 1,
            };
          } else {
            room.gameState.pendingAction = {
              type: "select_player",
              reason: "annoying_flying_unicorn",
              sourcePlayerId: player.id,
            };
          }
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.nextPhase(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === "yes"
            ? `${player.name} usó el efecto de Molesto Unicornio Volador`
            : `${player.name} omitió el efecto de Molesto Unicornio Volador`,
          { playerId: player.id },
        );

        emitGameState(io, room, "game-updated");
      } else if (pending.reason === "black_knight_unicorn") {
        const targetCardId = pending.targetCardId;
        const originalTargetPlayerId = pending.originalTargetPlayerId;

        if (choice === "yes") {
          // Sacrificar a Black Knight Unicorn
          const idx = player.stable.findIndex(
            (c) => c.id === "black_knight_unicorn",
          );
          if (idx !== -1) {
            const [blackKnight] = player.stable.splice(idx, 1);
            CardMovement.destroyOrSacrifice(
              room.gameState,
              player,
              blackKnight,
            );
          }
        } else {
          // Destruir la carta original
          if (targetCardId && originalTargetPlayerId) {
            const targetPlayer = room.gameState.players.find(
              (p) => p.id === originalTargetPlayerId,
            );
            if (targetPlayer) {
              const idx = targetPlayer.stable.findIndex(
                (c) => c.uid === targetCardId,
              );
              if (idx !== -1) {
                const [destroyedCard] = targetPlayer.stable.splice(idx, 1);
                CardMovement.destroyOrSacrifice(
                  room.gameState,
                  targetPlayer,
                  destroyedCard,
                );
              }
            }
          }
        }

        room.gameState.pendingAction = undefined;

        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.nextPhase(room.gameState);
        }

        addLog(
          room.gameState,
          choice === "yes"
            ? `${player.name} sacrificó a Black Knight Unicorn`
            : `${player.name} destruyó la carta objetivo`,
          { playerId: player.id },
        );

        emitGameState(io, room, "game-updated");
      } else if (pending.reason === "chainsaw_unicorn") {
        if (choice === "yes") {
          room.gameState.pendingAction = {
            type: "select_stable_card",
            reason: "chainsaw_unicorn",
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.nextPhase(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === "yes"
            ? `${player.name} usó el efecto de Chainsaw Unicorn`
            : `${player.name} omitió el efecto de Chainsaw Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, "game-updated");
      } else if (pending.reason === "dark_angel_unicorn") {
        if (choice === "yes") {
          room.gameState.pendingAction = {
            type: "select_stable_card",
            reason: "dark_angel_unicorn",
            sourcePlayerId: player.id,
            targetPlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.nextPhase(room.gameState);
          }
        }

        addLog(
          room.gameState,
          choice === "yes"
            ? `${player.name} usó el efecto de Dark Angel Unicorn`
            : `${player.name} omitió el efecto de Dark Angel Unicorn`,
          { playerId: player.id },
        );

        emitGameState(io, room, "game-updated");
      } else if (pending.reason === "classy_narwhal") {
      }
    });
  }

  function registerSelectDiscardCard(io: GameServer, socket: GameSocket): void {
    socket.on("select-discard-card", ({ roomCode, cardId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const player = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!player) return;

      const pending = room.gameState.pendingAction;
      if (
        !pending ||
        pending.type !== "select_discard_card" ||
        pending.playerId !== player.id
      ) {
        return;
      }

      if (pending.reason !== "dark_angel_unicorn") return;

      const cardIdx = room.gameState.discard.findIndex((c) => c.uid === cardId);
      if (cardIdx === -1) return;

      const selectedCard = room.gameState.discard[cardIdx];
      if (selectedCard.id === "dark_angel_unicorn") return;

      if (pending.cardType && selectedCard.cardType !== pending.cardType) {
        emitGameError(
          socket,
          "INVALID_SELECTION",
          "La carta seleccionada no es válida.",
          "select-discard-card",
        );
        return;
      }

      const [removed] = room.gameState.discard.splice(cardIdx, 1);
      room.gameState.pendingAction = undefined;

      const broughtFromDiscard = removed;
      CardMovement.enterStable(room.gameState, player, removed);

      if (
        room.gameState.phase === TurnPhase.BEGINNING &&
        !room.gameState.pendingAction
      ) {
        TurnManager.nextPhase(room.gameState);
      }

      addLog(
        room.gameState,
        `${player.name} trajo ${broughtFromDiscard.name} del descarte a su establo`,
        { playerId: player.id },
      );

      emitGameState(io, room, "game-updated");
    });
  }

  function registerSelectDeckCard(io: GameServer, socket: GameSocket): void {
    socket.on("select-deck-card", ({ roomCode, cardId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const player = room.gameState.players.find(
        (p) => p.socketId === socket.id,
      );
      if (!player) return;

      const pending = room.gameState.pendingAction;
      if (
        !pending ||
        pending.type !== "select_deck_card" ||
        pending.playerId !== player.id
      ) {
        return;
      }

      const cardIdx = room.gameState.deck.findIndex((c) => c.uid === cardId);
      if (cardIdx === -1) return;

      const [upgrade] = room.gameState.deck.splice(cardIdx, 1);
      player.hand.push(upgrade);

      for (let i = room.gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.gameState.deck[i], room.gameState.deck[j]] = [
          room.gameState.deck[j],
          room.gameState.deck[i],
        ];
      }

      room.gameState.pendingAction = undefined;

      if (room.gameState.phase === TurnPhase.BEGINNING) {
        TurnManager.nextPhase(room.gameState);
      }

      addLog(
        room.gameState,
        `${player.name} buscó ${upgrade.name} en el mazo y lo añadió a su mano`,
        { playerId: player.id },
      );

      emitGameState(io, room, "game-updated");
    });
  }
}
