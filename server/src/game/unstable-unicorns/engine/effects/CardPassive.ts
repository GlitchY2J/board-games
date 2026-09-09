import type { Card } from '../../../models/Card.ts';

/** Declarative modifiers for rules that remain active while a card is in a zone. */
export interface CardPassive {
  readonly kind: 'modifier';
  readonly handLimitDelta?: number;
  readonly blocksBasicUnicornEntry?: boolean;
  readonly protectsUnicorns?: boolean;
  readonly blocksUnicornEffects?: boolean;
  readonly immuneToDestruction?: boolean;
  readonly immuneToSacrifice?: boolean;
  readonly immuneToUnicornOrUpgradeDestruction?: boolean;
  readonly immuneToMagicDestruction?: boolean;
  readonly blocksUpgradePlay?: boolean;
  readonly requiresDiscardToPlayUnicorn?: boolean;
  readonly stablePowerDelta?: number;
  readonly stablePowerDeltaBlockedByBlindingLight?: boolean;
}

export const passiveModifier: CardPassive = { kind: 'modifier' };

export function getHandLimitDelta(card: Card): number {
  return getCardPassive(card).handLimitDelta ?? 0;
}

const passiveByCardId: Readonly<Record<string, CardPassive>> = {
  queen_bee_unicorn: { kind: 'modifier', blocksBasicUnicornEntry: true },
  pandamonium: { kind: 'modifier', protectsUnicorns: true },
  blinding_light: { kind: 'modifier', blocksUnicornEffects: true },
  broken_stable: { kind: 'modifier', blocksUpgradePlay: true },
  barbed_wire: { kind: 'modifier', requiresDiscardToPlayUnicorn: true },
  the_tiniest_unicorn: {
    kind: 'modifier',
    immuneToDestruction: true,
    immuneToUnicornOrUpgradeDestruction: true,
  },
  unicorn_of_war: { kind: 'modifier', immuneToDestruction: true },
  phantom_unicorn: {
    kind: 'modifier',
    immuneToDestruction: true,
    immuneToSacrifice: true,
    immuneToUnicornOrUpgradeDestruction: true,
  },
  saved_by_the_sigil: {
    kind: 'modifier',
    immuneToDestruction: true,
    immuneToSacrifice: true,
    immuneToUnicornOrUpgradeDestruction: true,
  },
  magical_kittencorn: { kind: 'modifier', immuneToMagicDestruction: true },
  unicorn_of_famine: { kind: 'modifier', handLimitDelta: -5 },
  tiny_hooves: { kind: 'modifier', handLimitDelta: -4 },
  nightmare_exorcise_regimen: { kind: 'modifier', handLimitDelta: -3 },
  ginormous_unicorn: {
    kind: 'modifier',
    stablePowerDelta: 1,
    stablePowerDeltaBlockedByBlindingLight: true,
  },
  sweet_old_ladycorn: { kind: 'modifier', stablePowerDelta: 1 },
};

export const passiveForQueenBee: CardPassive = passiveByCardId.queen_bee_unicorn;
export const passiveForPandamonium: CardPassive = passiveByCardId.pandamonium;
export const passiveForBlindingLight: CardPassive = passiveByCardId.blinding_light;

export function getCardPassive(card: Pick<Card, 'id'>): CardPassive {
  return passiveByCardId[card.id] ?? passiveModifier;
}
