import type { GameState } from '../types/GameState';

const protectedCardIds = new Set(['phantom_unicorn', 'saved_by_the_sigil']);

const selectionHints: Record<string, string> = {
  targeted_destruction: 'Targeted Destruction: destruye un Upgrade rival o sacrifica uno de tus Downgrades',
  re_target_card: 'Re-Target: selecciona el Upgrade o Downgrade que quieres mover',
  possession_steal: 'Possession: selecciona una carta en juego para robarla',
  back_kick: 'Back Kick: selecciona una carta para devolverla a la mano de su dueño',
  unicorn_poison: 'Unicorn Poison: selecciona un Unicornio rival para destruirlo',
  unicorn_swap_steal: 'Unicorn Swap: selecciona el Unicornio que quieres robar',
  a_cute_attack_destroy: 'A Cute Attack: selecciona los Unicornios que quieres destruir',
  fire_and_brimstone_destroy: 'Fire and Brimstone: selecciona un Unicornio para destruirlo',
  overpopulation_destroy: 'Overpopulation: selecciona un Unicornio para destruirlo',
  llamapocalypse_destroy: 'Llamapocalypse: selecciona un Unicornio para destruirlo',
  heavenly_smite_destroy: 'Heavenly Smite: selecciona un Unicornio para destruirlo',
  storm_of_cuteness_destroy: 'Storm of Cuteness: selecciona un Unicornio para destruirlo',
  zombie_apocalypse_destroy: 'Zombie Apocalypse: selecciona un Unicornio para destruirlo',
  ultimate_destruction_destroy: 'Ultimate Destruction: selecciona un Unicornio para destruirlo',
  spray_bottle_of_youth_destroy: 'Spray Bottle of Youth: selecciona un Unicornio para destruirlo',
  dancing_clownicorn: 'Dancing Clownicorn: selecciona una carta para devolverla a la mano de su dueño',
  demonicorn_remove: 'Demonicorn: selecciona una carta para retirarla de la partida',
  heeeeeres_stabby_remove: "Heeeeere's Stabby: selecciona una carta para retirarla de la partida",
  unicorn_slasher_remove: 'Unicorn Slasher: selecciona una carta para removerla de la partida',
  strange_craft_project_remove: 'Strange Craft Project: selecciona una carta para retirarla de la partida',
  nightmare_existential_dread_steal: 'Nightmare Existential Dread: selecciona un Downgrade rival para robarlo',
  unicorn_of_war_destroy: 'Unicorn of War: selecciona un Unicornio rival para destruirlo',
  unicorn_of_death_destroy: 'Unicorn of Death: selecciona un Unicornio rival para destruirlo',
  glitter_bomb_destroy: 'Glitter Bomb: selecciona una carta rival para destruirla',
  stabby_the_unicorn: 'Stabby the Unicorn: selecciona un Unicornio rival para destruirlo',
  shark_with_a_horn: 'Shark With A Horn: selecciona un Unicornio rival para destruirlo',
  seductive_unicorn: 'Seductive Unicorn: selecciona un Unicornio rival para robarlo a tu establo',
  rainbow_lasso_steal: 'Rainbow Lasso: selecciona un Unicornio rival para robarlo a tu establo',
  stable_artillery_destroy: 'Stable Artillery: selecciona un Unicornio rival para destruirlo',
};

const confirmationLabels: Record<string, string> = {
  targeted_destruction: 'Confirmar',
  re_target_card: 'Mover',
  possession_steal: 'Robar',
  back_kick: 'Devolver',
  unicorn_poison: 'Destruir',
  unicorn_swap_steal: 'Robar',
  a_cute_attack_destroy: 'Destruir',
  fire_and_brimstone_destroy: 'Destruir',
  overpopulation_destroy: 'Destruir',
  llamapocalypse_destroy: 'Destruir',
  heavenly_smite_destroy: 'Destruir',
  storm_of_cuteness_destroy: 'Destruir',
  zombie_apocalypse_destroy: 'Destruir',
  ultimate_destruction_destroy: 'Destruir',
  spray_bottle_of_youth_destroy: 'Destruir',
  dancing_clownicorn: 'Devolver',
  demonicorn_remove: 'Retirar',
  heeeeeres_stabby_remove: 'Retirar',
  unicorn_slasher_remove: 'Remover',
  strange_craft_project_remove: 'Retirar',
  nightmare_existential_dread_steal: 'Robar',
  unicorn_of_war_destroy: 'Destruir',
  unicorn_of_death_destroy: 'Destruir',
  glitter_bomb_destroy: 'Destruir',
  stabby_the_unicorn: 'Destruir',
  shark_with_a_horn: 'Destruir',
  seductive_unicorn: 'Robar',
  rainbow_lasso_steal: 'Robar',
  stable_artillery_destroy: 'Destruir',
};

export interface BoardStableSelection {
  targets: Map<string, string>;
  required: number;
  hint: string;
  confirmText: string;
  cancellable?: boolean;
}

export function getBoardStableSelection(
  game: GameState,
  localPlayerId: string,
): BoardStableSelection | null {
  const action = game.pendingAction;
  if (!action) return null;

  const targets = new Map<string, string>();
  const add = (cards: GameState['players'][number]['stable'], payload = (uid: string) => uid) => {
    cards.forEach((card) => targets.set(card.uid, payload(card.uid)));
  };
  const canRemove = (card: GameState['players'][number]['stable'][number]) => !protectedCardIds.has(card.id);
  const hasPandamonium = (player: GameState['players'][number]) => player.downgrades.some((card) => card.id === 'pandamonium');
  const hasParanormalAffection = (player: GameState['players'][number]) => player.upgrades.some((card) => card.id === 'paranormal_affection');
  const opponents = game.players.filter((player) => player.id !== localPlayerId);

  if (action.type === 'two_for_one' && action.phase === 'destroy' && action.sourcePlayerId === localPlayerId) {
    opponents.forEach((player) => add(
      [...player.stable, ...player.upgrades, ...player.downgrades].filter((card) =>
        canRemove(card) && !(card.cardType === 'upgrade' && hasParanormalAffection(player)),
      ),
    ));
    return { targets, required: action.remainingToDestroy, hint: `Two For One: selecciona ${action.remainingToDestroy} carta(s) de establos oponentes para destruirlas`, confirmText: 'Destruir' };
  }

  if (action.type === 'plague_of_death' && action.phase === 'destroy' && action.sourcePlayerId === localPlayerId) {
    game.players.forEach((player) => add(
      [...player.stable, ...player.upgrades, ...player.downgrades].filter((card) =>
        canRemove(card) && !(card.cardType === 'upgrade' && hasParanormalAffection(player)),
      ),
    ));
    return { targets, required: action.cardsToDestroy, hint: `Plague of Death: selecciona ${action.cardsToDestroy} carta(s) para destruirlas`, confirmText: 'Destruir' };
  }

  if (action.type === 'glitter_tornado' && action.sourcePlayerId === localPlayerId) {
    const player = game.players.find((candidate) => candidate.id === action.remainingPlayerIds[0]);
    if (!player) return null;
    add([...player.stable, ...player.upgrades, ...player.downgrades]);
    return { targets, required: 1, hint: `Glitter Tornado: selecciona una carta del establo de ${player.name} para devolverla a su mano`, confirmText: 'Devolver' };
  }

  if (action.type !== 'select_stable_card' || action.sourcePlayerId !== localPlayerId) return null;
  if (['chainsaw_unicorn', 'dark_angel_unicorn', 'mermaid_unicorn', 'rhinocorn'].includes(action.reason)) return null;

  const allZones = (player: GameState['players'][number]) => [...player.stable, ...player.upgrades, ...player.downgrades];
  const validUnicorns = (player: GameState['players'][number], exclusions: string[] = []) =>
    player.stable.filter((card) =>
      card.cardType === 'unicorn' &&
      canRemove(card) &&
      !hasPandamonium(player) &&
      !exclusions.includes(card.id),
    );
  const targetPlayer = game.players.find((player) => player.id === action.targetPlayerId);

  if (action.reason === 'targeted_destruction') {
    opponents.forEach((player) => add(
      player.upgrades.filter((card) => card.id !== 'saved_by_the_sigil' && !hasParanormalAffection(player)),
      (uid) => JSON.stringify({ cardId: uid, targetPlayerId: player.id, type: 'upgrade' }),
    ));
    const local = game.players.find((player) => player.id === localPlayerId);
    if (local) add(local.downgrades, (uid) => JSON.stringify({ cardId: uid, targetPlayerId: local.id, type: 'downgrade' }));
  } else if (action.reason === 're_target_card' && targetPlayer) {
    add([...targetPlayer.upgrades, ...targetPlayer.downgrades]);
  } else if (action.reason === 'possession_steal' && targetPlayer) {
    add(allZones(targetPlayer).filter(canRemove));
  } else if (action.reason === 'back_kick' && targetPlayer) {
    add(allZones(targetPlayer));
  } else if (action.reason === 'unicorn_poison' && targetPlayer) {
    add(targetPlayer.stable.filter((card) => canRemove(card) && card.id !== 'magical_kittencorn' && !hasPandamonium(targetPlayer)));
  } else if (action.reason === 'unicorn_swap_steal' && targetPlayer) {
    add(validUnicorns(targetPlayer));
  } else if (action.reason === 'a_cute_attack_destroy' && targetPlayer) {
    add(validUnicorns(targetPlayer));
  } else if (['fire_and_brimstone_destroy', 'overpopulation_destroy', 'llamapocalypse_destroy', 'heavenly_smite_destroy', 'storm_of_cuteness_destroy', 'zombie_apocalypse_destroy', 'ultimate_destruction_destroy', 'spray_bottle_of_youth_destroy'].includes(action.reason) && targetPlayer) {
    add(validUnicorns(targetPlayer));
  } else if (action.reason === 'dancing_clownicorn') {
    const player = game.players.find((candidate) => candidate.id === action.remainingPlayerIds?.[0]);
    if (player) add(player.stable);
  } else if (['demonicorn_remove', 'heeeeeres_stabby_remove', 'unicorn_slasher_remove', 'strange_craft_project_remove'].includes(action.reason)) {
    const players = game.players.filter((player) => action.remainingPlayerIds?.includes(player.id));
    players.forEach((player) => add(
      ['unicorn_slasher_remove', 'strange_craft_project_remove'].includes(action.reason) ? allZones(player) : player.stable,
    ));
  } else if (action.reason === 'nightmare_existential_dread_steal') {
    opponents.forEach((player) => add(player.downgrades));
  } else if (action.reason === 'unicorn_of_war_destroy') {
    opponents.forEach((player) => add(validUnicorns(player, ['unicorn_of_war'])));
  } else if (action.reason === 'unicorn_of_death_destroy') {
    opponents.forEach((player) => add(validUnicorns(player)));
  } else if (action.reason === 'glitter_bomb_destroy') {
    opponents.forEach((player) => add(allZones(player).filter((card) =>
      canRemove(card) && card.id !== 'the_tiniest_unicorn' && !(card.cardType === 'upgrade' && hasParanormalAffection(player)),
    )));
  } else if (['stabby_the_unicorn', 'shark_with_a_horn'].includes(action.reason)) {
    opponents.forEach((player) => add(validUnicorns(player, action.reason === 'shark_with_a_horn' ? ['unicorn_of_war'] : [])));
  } else if (action.reason === 'seductive_unicorn') {
    opponents.forEach((player) => add(player.stable.filter((card) => card.cardType === 'unicorn' && !hasPandamonium(player) && card.id !== 'the_tiniest_unicorn')));
  } else if (action.reason === 'rainbow_lasso_steal') {
    opponents.forEach((player) => add(validUnicorns(player)));
  } else if (action.reason === 'stable_artillery_destroy') {
    opponents.forEach((player) => add(player.stable.filter((card) => card.cardType === 'unicorn' && !hasPandamonium(player))));
  }

  if (targets.size === 0) return null;
  return {
    targets,
    required: action.reason === 'a_cute_attack_destroy' ? action.remainingToDestroy ?? 1 : 1,
    hint: selectionHints[action.reason] ?? `selecciona una carta del establo de ${targetPlayer?.name ?? 'otro jugador'}`,
    confirmText: confirmationLabels[action.reason] ?? 'Confirmar',
    cancellable: action.reason === 'targeted_destruction',
  };
}
