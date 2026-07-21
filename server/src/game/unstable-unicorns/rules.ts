export class UnstableUnicornsRules {
  static maxHandSize(): number {
    return 7;
  }

  static unicorsToWin(players: number): number {
    if (players <= 5) return 7;

    return 6;
  }
}
