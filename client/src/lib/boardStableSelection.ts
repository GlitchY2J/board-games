import type { GameState } from '../types/GameState';

const protectedCardIds = new Set(['phantom_unicorn', 'saved_by_the_sigil']);

export interface BoardStableSelection {
  targets: Map<string, string>;
  required: number;
  hint: string;
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
    return { targets, required: action.remainingToDestroy, hint: `selecciona ${action.remainingToDestroy} carta(s) de establos oponentes` };
  }

  if (action.type === 'plague_of_death' && action.phase === 'destroy' && action.sourcePlayerId === localPlayerId) {
    game.players.forEach((player) => add(
      [...player.stable, ...player.upgrades, ...player.downgrades].filter((card) =>
        canRemove(card) && !(card.cardType === 'upgrade' && hasParanormalAffection(player)),
      ),
    ));
    return { targets, required: action.cardsToDestroy, hint: `selecciona ${action.cardsToDestroy} carta(s) para destruir` };
  }

  if (action.type === 'glitter_tornado' && action.sourcePlayerId === localPlayerId) {
    const player = game.players.find((candidate) => candidate.id === action.remainingPlayerIds[0]);
    if (!player) return null;
    add([...player.stable, ...player.upgrades, ...player.downgrades]);
    return { targets, required: 1, hint: `selecciona una carta del establo de ${player.name}` };
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
    hint: 'selecciona una carta válida directamente desde un establo',
    cancellable: action.reason === 'targeted_destruction',
  };
}
