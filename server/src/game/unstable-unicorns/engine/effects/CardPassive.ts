/** Metadata for rules that remain active while a card is in a zone. */
export interface CardPassive {
  readonly kind: 'modifier';
}

export const passiveModifier: CardPassive = { kind: 'modifier' };
