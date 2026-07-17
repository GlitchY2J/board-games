export enum Trigger {
  OnPlay = 'onPlay',
  OnEnterStable = 'onEnterStable',
  OnBeginningTurn = 'onBeginningTurn',
  OnEndTurn = 'onEndTurn',
  OnDestroyed = 'onDestroyed',
  OnSacrificed = 'onSacrificed',
}

export enum Action {
  Draw = 'draw',
  Discard = 'discard',
  Destroy = 'destroy',
  Sacrifice = 'sacrifice',
  Steal = 'steal',
  SearchDeck = 'searchDeck',
  ReturnToHand = 'returnToHand',
  MoveToStable = 'moveToStable',
}

export interface CardEffect {
  trigger: Trigger;
  action: Action;
  value?: number;
}
