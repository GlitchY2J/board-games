import type { GameServer, GameSocket } from "./socketTypes.ts";
import { CardMovement } from "../game/unstable-unicorns/engine/CardMovement.ts";
import { CardZoneMovement } from "../game/unstable-unicorns/engine/CardZoneMovement.ts";
import { TurnManager } from "../game/turn/TurnManager.ts";
import { TurnPhase } from "../game/turn/TurnPhase.ts";
import { roomManager } from "../roomManagerInstance.ts";
import { emitGameError } from "./socketContext.ts";
import { emitGameState } from "./gameStateEmitter.ts";
import { addLog } from "./gameLog.ts";
import { isPandamoniumProtected } from "../game/cards/effects/pandamonium.ts";
import { enqueueDrawAnimation, enqueueStealAnimation, enqueueCardAnimation } from "../game/cardAnimations.ts";
import { nextUnicornOfWarChoice } from "../game/cards/effects/unicornOfWar.ts";
import { drawRainbowPrincessCards, nextRainbowPrincessChoice } from "../game/cards/effects/unicornRainbowPrincess.ts";
import { nextSprayBottleChoice } from "../game/cards/effects/sprayBottleOfYouth.ts";
import { startPendingTimer } from "./gameHandlers.ts";
import { GameState } from "../game/models/GameState.ts";

function continueBeginningPhaseIfReady(game: GameState): void {
  if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
    TurnManager.processBeginningQueue(game);
  }
}

export function registerChoiceHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('select-choice', ({ roomCode, choice }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room?.gameState) return;

    const player = room.gameState.players.find(
      (p) => p.socketId === socket.id,
    );
    if (!player) return;

    const pending = room.gameState.pendingAction;
    if (
      !pending ||
      pending.type !== 'select_choice' ||
      (pending.reason === 'neigh_thank_you'
        ? !pending.remainingPlayerIds?.includes(player.id)
        : pending.playerId !== player.id)
    ) {
      return;
    }


    if (pending.reason === 'three_of_a_kind') {
      const validChoices = new Set([
        'beard_cat', 'cattermelon', 'hairy_potato_cat',
        'rainbow_ralphing_cat', 'tacocat', 'attack', 'defuse',
        'favor', 'nope', 'see_the_future', 'shuffle', 'skip',
        'targeted_attack', 'reverse', 'feral_cat', 'draw_from_the_bottom',
        'alter_the_future',
      ]);
      const targetPlayer = room.gameState.players.find(
        (candidate) => candidate.id === pending.targetPlayerId,
      );
      const playedCards = (pending.cardIds ?? []).map((id) =>
        player.hand.find((card) => card.uid === id),
      );

      if (
        !validChoices.has(choice) ||
        !targetPlayer ||
        playedCards.length !== 3 ||
        playedCards.some((card) => !card)
      ) {
        emitGameError(
          socket,
          'INVALID_SELECTION',
          'El tipo de carta seleccionado no es válido.',
          'select-choice',
        );
        return;
      }

      const startedAt = Date.now();
      room.gameState.pendingAction = undefined;
      room.gameState.pendingPlay = {
        playerId: player.id,
        playerName: player.name,
        card: playedCards[0]!,
        startedAt,
        durationMs: 5000,
        acceptedIds: [],
        targetPlayerId: targetPlayer.id,
        targetPlayerName: targetPlayer.name,
        requestedCardType: choice,
        chain: playedCards.map((card) => ({
          playerId: player.id,
          playerName: player.name,
          card: card!,
          group: 0,
        })),
      };

      addLog(
        room.gameState,
        `${player.name} eligió robar una carta de tipo ${choice} a ${targetPlayer.name}`,
        { playerId: player.id },
      );
      emitGameState(io, room, 'game-updated');
      startPendingTimer(io, room, startedAt);
      return;
    }

    if (pending.reason === 'beginning_effect_picker') {
      // El jugador elige en qué orden resolver sus efectos de inicio de turno.
      const q = room.gameState.beginningEffectsQueue ?? [];
      const idx = q.indexOf(choice);
      if (idx !== -1) q.splice(idx, 1);
      room.gameState.beginningEffectsQueue = q;

      const started = TurnManager.startBeginningEffect(
        room.gameState,
        choice,
      );
      if (!started) {
        TurnManager.processBeginningQueue(room.gameState);
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'unicorn_of_war') {
      const remainingPlayerIds = pending.remainingPlayerIds ?? [];

      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'unicorn_of_war_destroy',
          sourcePlayerId: player.id,
          remainingPlayerIds,
        };
      } else {
        room.gameState.pendingAction = nextUnicornOfWarChoice(
          room.gameState,
          pending.sourcePlayerId ?? player.id,
          remainingPlayerIds,
        );
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'unicorn_rainbow_princess') {
      if (choice === 'yes') {
        const selectedPlayer = room.gameState.players.find(
          (candidate) => candidate.id === player.id,
        );
        if (selectedPlayer) {
          drawRainbowPrincessCards(room.gameState, selectedPlayer, 1);
        }
      }

      room.gameState.pendingAction = nextRainbowPrincessChoice(
        room.gameState,
        pending.sourcePlayerId ?? player.id,
        pending.remainingPlayerIds ?? [],
      );
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'dancing_clownicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'dancing_clownicorn',
          playerId: player.id,
          cardsToDiscard: 2,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'demonicorn') {
      if (choice === 'yes') {
        const remainingPlayerIds = room.gameState.players
          .filter((candidate) => candidate.stable.length > 0)
          .map((candidate) => candidate.id);

        room.gameState.pendingAction = remainingPlayerIds.length > 0
          ? {
              type: 'select_stable_card',
              reason: 'demonicorn_remove',
              sourcePlayerId: player.id,
              remainingPlayerIds,
            }
          : undefined;
      } else {
        room.gameState.pendingAction = undefined;
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'playful_puppet_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_player',
          reason: 'playful_puppet_unicorn',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'unicorn_slasher') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'unicorn_slasher',
          playerId: player.id,
          cardsToDiscard: 1,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'vengeful_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'vengeful_unicorn_sacrifice',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'winged_horrorcorn') {
      if (choice === 'yes') {
        const targets = room.gameState.players.filter(
          (candidate) =>
            candidate.id !== player.id && candidate.hand.length > 0,
        );
        if (targets.length === 1) {
          room.gameState.pendingAction = {
            type: 'select_hand_card',
            reason: 'winged_horrorcorn',
            sourcePlayerId: player.id,
            targetPlayerId: targets[0].id,
          };
        } else if (targets.length > 1) {
          room.gameState.pendingAction = {
            type: 'select_player',
            reason: 'winged_horrorcorn',
            sourcePlayerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
        }
      } else {
        room.gameState.pendingAction = undefined;
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'ghost_guide') {
      if (choice === 'yes') {
        const drawn = room.gameState.deck.shift();
        if (drawn) {
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          addLog(
            room.gameState,
            `${player.name} reveló ${drawn.name} por Ghost Guide`,
            { playerId: player.id, cardImage: drawn.image },
          );

          if (drawn.cardType === 'upgrade') {
            CardMovement.enterStableCard(player, drawn);
          } else if (drawn.cardType === 'downgrade') {
            CardMovement.enterStableCard(player, drawn);
          } else {
            CardZoneMovement.addToHand(player, drawn);
          }
        }
      }

      room.gameState.pendingAction = undefined;
      if (room.gameState.phase === TurnPhase.BEGINNING) {
        TurnManager.processBeginningQueue(room.gameState);
      }
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'magic_elexir') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'magic_elexir',
          playerId: player.id,
          cardsToDiscard: 1,
        };
      } else {
        const target = player.stable.find(
          (card) => card.uid === pending.targetCardId,
        );
        if (target) {
          const index = player.stable.findIndex((card) => card.uid === target.uid);
          const removed = CardZoneMovement.removeAt(player.stable, index);
          if (!removed) return;
          CardMovement.destroyOrSacrifice(
            room.gameState,
            player,
            removed,
            pending.destructionType ?? 'destroy',
            true,
          );
        }
        room.gameState.pendingAction = undefined;
        continueBeginningPhaseIfReady(room.gameState);
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'paranormal_affection') {
      if (choice === 'yes') {
        for (let count = 0; count < 2; count += 1) {
          const drawn = room.gameState.deck.shift();
          if (!drawn) break;
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          CardZoneMovement.addToHand(player, drawn);
        }
      }

      room.gameState.pendingAction = undefined;
      if (room.gameState.phase === TurnPhase.BEGINNING) {
        TurnManager.processBeginningQueue(room.gameState);
      }
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'poltergeist_swipe') {
      if (choice === 'yes') {
        const targets = room.gameState.players.filter(
          (candidate) =>
            candidate.id !== player.id && candidate.hand.length > 0,
        );
        const target = targets[Math.floor(Math.random() * targets.length)];
        if (target) {
          const index = Math.floor(Math.random() * target.hand.length);
          const stolen = CardZoneMovement.removeFromHand(target, target.hand[index]?.uid ?? '');
          if (!stolen) return;
          CardZoneMovement.addToHand(player, stolen);
          enqueueStealAnimation(
            room.gameState.roomCode,
            target.id,
            player.id,
            stolen,
          );
          addLog(
            room.gameState,
            `${player.name} robó una carta aleatoria de ${target.name} por Poltergeist Swipe`,
            { playerId: player.id },
          );
        }
      }

      room.gameState.pendingAction = undefined;
      if (room.gameState.phase === TurnPhase.BEGINNING) {
        TurnManager.processBeginningQueue(room.gameState);
        if (choice === 'yes' && !room.gameState.pendingAction) {
          room.gameState.phase = TurnPhase.ACTION;
        }
      }
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'strange_craft_project') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'strange_craft_project',
          playerId: player.id,
          cardsToDiscard: 3,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      emitGameState(io, room, 'game-updated');
      return;
    }

    if (
      pending.reason === 'jack_the_reapercorn' ||
      pending.reason === 'jack_the_reapercorn_second'
    ) {
      if (choice === 'yes') {
        if (pending.reason === 'jack_the_reapercorn_second') {
          const revealed = player.hand.find(
            (card) => card.uid === pending.targetCardId,
          );
          if (revealed) {
            addLog(
              room.gameState,
              `${player.name} reveló ${revealed.name}, una carta Neigh, por Jack the Reapercorn`,
              { playerId: player.id, cardImage: revealed.image },
            );
          }
        }
        const drawn = room.gameState.deck.shift();
        if (drawn) {
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          CardZoneMovement.addToHand(player, drawn);

          const isNeigh =
            drawn.effect === 'neigh' ||
            drawn.effect === 'super_neigh' ||
            drawn.effect === 'neigh_thank_you';

          if (
            pending.reason === 'jack_the_reapercorn' &&
            isNeigh &&
            room.gameState.deck.length > 0
          ) {
            room.gameState.pendingAction = {
              type: 'select_choice',
              reason: 'jack_the_reapercorn_second',
              playerId: player.id,
              targetCardId: drawn.uid,
              title: '💀 Jack the Reapercorn',
              description: 'La carta robada es un Neigh. ¿Deseas REVELARLA y ROBAR una segunda carta?',
              options: [
                { value: 'yes', text: 'Sí, robar otra carta' },
                { value: 'no', text: 'No, terminar efecto' },
              ],
            };
          }
        }
      }

      if (
        !room.gameState.pendingAction ||
        room.gameState.pendingAction === pending
      ) {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'clairvoyant_unicorn') {
      if (choice === 'yes') {
        const drawn = room.gameState.deck.shift();
        if (drawn) {
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          CardZoneMovement.addToHand(player, drawn);
          const effectCard = [
            ...player.stable,
            ...player.upgrades,
            ...player.downgrades,
          ].find((card) => card.uid === pending.effectCardId);
          addLog(
            room.gameState,
            `${player.name} robó una carta del mazo por el efecto de "${effectCard?.name ?? 'Clairvoyant Unicorn'}"`,
            { playerId: player.id, cardImage: effectCard?.image },
          );
        }
      }

      room.gameState.pendingAction = undefined;
      if (room.gameState.phase === TurnPhase.BEGINNING) {
        TurnManager.processBeginningQueue(room.gameState);
      }
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'neigh_thank_you') {
      if (choice === 'yes') {
        const drawn = room.gameState.deck.shift();
        if (drawn) {
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          CardZoneMovement.addToHand(player, drawn);
        }
      }

      const remainingPlayerIds = (pending.remainingPlayerIds ?? []).filter(
        (playerId) => playerId !== player.id,
      );
      const resolvedPlayerIds = [...(pending.resolvedPlayerIds ?? []), player.id];

      if (remainingPlayerIds.length > 0) {
        room.gameState.pendingAction = {
          ...pending,
          playerId: remainingPlayerIds[0],
          remainingPlayerIds,
          resolvedPlayerIds,
        };
      } else {
        room.gameState.pendingAction = undefined;
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} robó una carta por Neigh, Thank You`
          : `${player.name} decidió no robar por Neigh, Thank You`,
        { playerId: player.id },
      );
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.reason === 'annoying_flying_unicorn') {
      if (choice === 'yes') {
        const rivals = room.gameState.players.filter(
          (p) => p.id !== player.id && p.hand.length > 0,
        );

        if (rivals.length === 1) {
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'annoying_flying_unicorn',
            playerId: rivals[0].id,
            cardsToDiscard: 1,
          };
        } else {
          room.gameState.pendingAction = {
            type: 'select_player',
            reason: 'annoying_flying_unicorn',
            sourcePlayerId: player.id,
          };
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Molesto Unicornio Volador`
          : `${player.name} omitió el efecto de Molesto Unicornio Volador`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'black_knight_unicorn') {
      const targetCardId = pending.targetCardId;
      const originalTargetPlayerId = pending.originalTargetPlayerId;

      if (choice === 'yes') {
        // Sacrificar a Black Knight Unicorn
        const idx = player.stable.findIndex(
          (c) => c.id === 'black_knight_unicorn',
        );
        if (idx !== -1) {
          const blackKnight = CardZoneMovement.removeAt(player.stable, idx);
          if (!blackKnight) return;
          CardMovement.destroyOrSacrifice(
            room.gameState,
            player,
            blackKnight,
            'sacrifice',
          );
        }
      } else {
        // Destruir la carta original
        if (targetCardId && originalTargetPlayerId) {
          const targetPlayer = room.gameState.players.find(
            (p) => p.id === originalTargetPlayerId,
          );
          if (targetPlayer) {
            for (const z of ['stable', 'upgrades', 'downgrades'] as const) {
              const idx = targetPlayer[z].findIndex(
                (c) => c.uid === targetCardId,
              );
              if (idx === -1) continue;
              const [destroyedCard] = targetPlayer[z].splice(idx, 1);
              const intercepted = CardMovement.destroyOrSacrifice(
                room.gameState,
                targetPlayer,
                destroyedCard,
              );
              if (intercepted) {
                emitGameState(io, room, 'game-updated');
                return;
              }
              break;
            }
          }
        }
      }

      room.gameState.pendingAction = undefined;

      if (room.gameState.phase === TurnPhase.BEGINNING) {
        TurnManager.processBeginningQueue(room.gameState);
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} sacrificó a Black Knight Unicorn`
          : `${player.name} destruyó la carta objetivo`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'chainsaw_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'chainsaw_unicorn',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Chainsaw Unicorn`
          : `${player.name} omitió el efecto de Chainsaw Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'dark_angel_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'dark_angel_unicorn',
          sourcePlayerId: player.id,
          targetPlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Dark Angel Unicorn`
          : `${player.name} omitió el efecto de Dark Angel Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'zombie_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_hand_card',
          reason: 'zombie_unicorn',
          sourcePlayerId: player.id,
          targetPlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usará Zombie Unicorn`
          : `${player.name} omitió el efecto de Zombie Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'classy_narwhal') {
      if (choice === 'yes') {
        const candidates = room.gameState.deck.filter(
          (card) => card.cardType === 'upgrade',
        );

        if (candidates.length > 0) {
          room.gameState.pendingAction = {
            type: 'select_deck_card',
            reason: 'classy_narwhal',
            playerId: player.id,
            cardType: 'upgrade',
            candidates,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Classy Narwhal`
          : `${player.name} omitió el efecto de Classy Narwhal`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'the_great_narwhal') {
      if (choice === 'yes') {
        const candidates = room.gameState.deck.filter((card) =>
          card.name.toLowerCase().includes('narwhal'),
        );

        if (candidates.length > 0) {
          room.gameState.pendingAction = {
            type: 'select_deck_card',
            reason: 'the_great_narwhal',
            playerId: player.id,
            candidates,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de The Great Narwhal`
          : `${player.name} omitió el efecto de The Great Narwhal`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'shabby_the_narwhal') {
      if (choice === 'yes') {
        const candidates = room.gameState.deck.filter(
          (card) => card.cardType === 'downgrade',
        );

        if (candidates.length > 0) {
          room.gameState.pendingAction = {
            type: 'select_deck_card',
            reason: 'shabby_the_narwhal',
            playerId: player.id,
            candidates,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Shabby The Narwhal`
          : `${player.name} omitió el efecto de Shabby The Narwhal`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'angel_unicorn') {
      if (choice === 'yes') {
        const uid = pending.effectCardId;
        const idx = player.stable.findIndex(
          (c) => (uid ? c.uid === uid : c.id === 'angel_unicorn'),
        );
        if (idx !== -1) {
          const angelCard = CardZoneMovement.removeAt(player.stable, idx);
          if (!angelCard) return;
          CardMovement.destroyOrSacrifice(
            room.gameState,
            player,
            angelCard,
            'sacrifice',
          );
        }

        const unicornsInDiscard = room.gameState.discard.some(
          (card) => card.cardType === 'unicorn',
        );

        if (unicornsInDiscard) {
          room.gameState.pendingAction = {
            type: 'select_discard_card',
            reason: 'angel_unicorn',
            playerId: player.id,
            cardType: 'unicorn',
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} sacrificó a Angel Unicorn`
          : `${player.name} omitió el efecto de Angel Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'magical_flying_unicorn') {
      if (choice === 'yes') {
        const magicInDiscard = room.gameState.discard.some(
          (card) => card.cardType === 'magic',
        );

        if (magicInDiscard) {
          room.gameState.pendingAction = {
            type: 'select_discard_card',
            reason: 'magical_flying_unicorn',
            playerId: player.id,
            cardType: 'magic',
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Magical Flying Unicorn`
          : `${player.name} omitió el efecto de Magical Flying Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'majestic_flying_unicorn') {
      if (choice === 'yes') {
        const unicornInDiscard = room.gameState.discard.some(
          (card) => card.cardType === 'unicorn',
        );

        if (unicornInDiscard) {
          room.gameState.pendingAction = {
            type: 'select_discard_card',
            reason: 'majestic_flying_unicorn',
            playerId: player.id,
            cardType: 'unicorn',
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Majestic Flying Unicorn`
          : `${player.name} omitió el efecto de Majestic Flying Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'mother_goose_unicorn') {
      if (choice === 'yes') {
        const hasBaby = room.gameState.nursery.some(
          (card) =>
            card.cardType === 'unicorn' && card.unicornClass === 'baby',
        );

        if (hasBaby) {
          room.gameState.pendingAction = {
            type: 'select_nursery_card',
            reason: 'mother_goose_unicorn',
            playerId: player.id,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Mother Goose Unicorn`
          : `${player.name} omitió el efecto de Mother Goose Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'extremely_fertile_unicorn') {
      if (choice === 'yes') {
        const hasBaby = room.gameState.nursery.some(
          (card) =>
            card.cardType === 'unicorn' && card.unicornClass === 'baby',
        );

        if (player.hand.length > 0 && hasBaby) {
          room.gameState.pendingAction = {
            type: 'discard',
            reason: 'extremely_fertile_unicorn',
            playerId: player.id,
            cardsToDiscard: 1,
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usará Extremely Fertile Unicorn`
          : `${player.name} omitió el efecto de Extremely Fertile Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'necromancer_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'necromancer_unicorn',
          playerId: player.id,
          cardsToDiscard: 2,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Necromancer Unicorn`
          : `${player.name} omitió el efecto de Necromancer Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'rainbow_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_own_hand_card',
          reason: 'rainbow_unicorn',
          playerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Rainbow Unicorn`
          : `${player.name} omitió el efecto de Rainbow Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'chainsaw_massicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = undefined;
        const drawCount = player.stable.filter(
          (card) =>
            card.cardType === 'unicorn' &&
            card.unicornClass === 'basic' &&
            !isPandamoniumProtected(player, card),
        ).length;
        let drawnCount = 0;
        for (let i = 0; i < drawCount; i += 1) {
          const drawn = room.gameState.deck.shift();
          if (!drawn) break;
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          CardZoneMovement.addToHand(player, drawn);
          drawnCount += 1;
        }
        if (drawnCount > 0) {
          const chainsaw = player.stable.find(
            (card) => card.id === 'chainsaw_massicorn',
          );
          addLog(
            room.gameState,
            `${player.name} jugó "Chainsaw Massicorn" → robó ${drawnCount} carta${drawnCount === 1 ? '' : 's'} del mazo`,
            { playerId: player.id, cardImage: chainsaw?.image },
          );
        }
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'rhinocorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'rhinocorn',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usará Rhinocorn para destruir un unicornio`
          : `${player.name} omitió el efecto de Rhinocorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'caffeine_overload') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'caffeine_overload',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} sacrificará una carta por Caffeine Overload`
          : `${player.name} omitió el efecto de Caffeine Overload`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'claw_machine') {
      const used =
        choice === 'yes' &&
        (room.gameState.players.find((p) => p.id === player.id)?.hand
          .length ?? 0) >= 1;

      if (used) {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'claw_machine',
          playerId: player.id,
          cardsToDiscard: 1,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        used
          ? `${player.name} usará Claw Machine para descartar y robar`
          : `${player.name} no pudo usar Claw Machine (sin cartas para descartar)`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'glitter_bomb') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'glitter_bomb_sacrifice',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usará Glitter Bomb para sacrificar y destruir`
          : `${player.name} omitió el efecto de Glitter Bomb`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'unicorn_of_death') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'unicorn_of_death_sacrifice',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usará Unicorn of Death para sacrificar y destruir`
          : `${player.name} omitió el efecto de Unicorn of Death`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'rainbow_lasso') {
      const used =
        choice === 'yes' &&
        (room.gameState.players.find((p) => p.id === player.id)?.hand
          .length ?? 0) >= 3;

      if (used) {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'rainbow_lasso',
          playerId: player.id,
          cardsToDiscard: 3,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        used
          ? `${player.name} usará Rainbow Lasso para descartar 3 y robar un unicornio`
          : `${player.name} no pudo usar Rainbow Lasso (no tiene 3 cartas)`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'rainbow_sprinkles') {
      if (choice === 'yes') {
        for (let index = 0; index < 3; index += 1) {
          const drawn = room.gameState.deck.shift();
          if (!drawn) break;
          enqueueDrawAnimation(room.gameState.roomCode, player.id, drawn);
          CardZoneMovement.addToHand(player, drawn);
        }

        room.gameState.pendingAction = undefined;
        room.gameState.phase = TurnPhase.END;
        TurnManager.skipEndIfNoTriggers(room.gameState);
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó Rainbow Sprinkles, robó hasta 3 cartas y terminó su turno`
          : `${player.name} omitió el efecto de Rainbow Sprinkles`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'special_delivery') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_nursery_card',
          reason: 'special_delivery',
          playerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usará Special Delivery para traer un Baby Unicorn`
          : `${player.name} omitió el efecto de Special Delivery`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'spray_bottle_of_youth') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_nursery_card',
          reason: 'spray_bottle_of_youth',
          playerId: player.id,
          sourcePlayerId: pending.sourcePlayerId,
          remainingPlayerIds: pending.remainingPlayerIds,
        };
      } else {
        room.gameState.pendingAction = nextSprayBottleChoice(
          room.gameState,
          pending.sourcePlayerId ?? player.id,
          pending.remainingPlayerIds ?? [],
        );
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} aceptó traer un Baby Unicorn por Spray Bottle Of Youth`
          : `${player.name} omitió traer un Baby Unicorn por Spray Bottle Of Youth`,
        { playerId: player.id },
      );
      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'stable_artillery') {
      const used =
        choice === 'yes' &&
        (room.gameState.players.find((p) => p.id === player.id)?.hand
          .length ?? 0) >= 2;

      if (used) {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'stable_artillery',
          playerId: player.id,
          cardsToDiscard: 2,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        used
          ? `${player.name} usará Stable Artillery para descartar 2 y destruir un unicornio`
          : `${player.name} no pudo usar Stable Artillery (no tiene 2 cartas)`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'seductive_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'seductive_unicorn',
          playerId: player.id,
          cardsToDiscard: 1,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Seductive Unicorn`
          : `${player.name} omitió el efecto de Seductive Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'swift_flying_unicorn') {
      if (choice === 'yes') {
        const neighInDiscard = room.gameState.discard.some(
          (card) =>
            card.cardType === 'instant' &&
            (card.effect === 'neigh' ||
              card.effect === 'super_neigh' ||
              card.effect === 'neigh_thank_you'),
        );

        if (neighInDiscard) {
          room.gameState.pendingAction = {
            type: 'select_discard_card',
            reason: 'swift_flying_unicorn',
            playerId: player.id,
            cardType: 'instant',
          };
        } else {
          room.gameState.pendingAction = undefined;
          if (room.gameState.phase === TurnPhase.BEGINNING) {
            TurnManager.processBeginningQueue(room.gameState);
          }
        }
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Swifty Flying Unicorn`
          : `${player.name} omitió el efecto de Swifty Flying Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'stabby_the_unicorn') {
      if (choice === 'yes') {
        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'stabby_the_unicorn',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes'
          ? `${player.name} usó el efecto de Stabby The Unicorn para destruir un unicornio`
          : `${player.name} omitió el efecto de Stabby The Unicorn`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'shark_with_a_horn') {
      if (choice === 'yes') {
        const sharkIdx = player.stable.findIndex(
          (c) => c.id === 'shark_with_a_horn',
        );
        if (sharkIdx !== -1) {
          const shark = CardZoneMovement.removeAt(player.stable, sharkIdx);
          if (!shark) return;
          CardMovement.destroyOrSacrifice(
            room.gameState,
            player,
            shark,
            'sacrifice',
          );
        }

        room.gameState.pendingAction = {
          type: 'select_stable_card',
          reason: 'shark_with_a_horn',
          sourcePlayerId: player.id,
        };
      } else {
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      if (choice === 'no') {
        addLog(room.gameState, `${player.name} omitió el efecto de Shark With A Horn`, {
          playerId: player.id,
        });
      }

      emitGameState(io, room, 'game-updated');
    } else if (pending.reason === 'unicorn_phoenix') {
      const heldCard = pending.heldCard;

      if (choice === 'yes' && heldCard) {
        // Phoenix NUNCA abandonó el establo (se restauró al interceptar), así
        // que ya está en player.stable. No debe re-entrar: eso dispararía
        // efectos on-enter y Barbed Wire (entrada + salida), que no aplican.
        room.gameState.pendingAction = {
          type: 'discard',
          reason: 'unicorn_phoenix',
          playerId: player.id,
          cardsToDiscard: 1,
        };
      } else {
        if (heldCard) {
          const stableIdx = player.stable.findIndex(
            (c) => c.uid === heldCard.uid,
          );
          if (stableIdx !== -1) {
            CardZoneMovement.removeAt(player.stable, stableIdx);
          }
          enqueueCardAnimation(
            room.gameState.roomCode,
            'destroy',
            player.id,
            heldCard,
          );
          CardZoneMovement.toDiscard(room.gameState, heldCard);
        }
        room.gameState.pendingAction = undefined;
        if (room.gameState.phase === TurnPhase.BEGINNING) {
          TurnManager.processBeginningQueue(room.gameState);
        }
      }

      addLog(
        room.gameState,
        choice === 'yes' && heldCard
          ? `${player.name} descartó una carta para salvar a Unicorn Phoenix`
          : `${player.name} dejó que Unicorn Phoenix fuera destruido`,
        { playerId: player.id },
      );

      emitGameState(io, room, 'game-updated');
    }
  });
}
