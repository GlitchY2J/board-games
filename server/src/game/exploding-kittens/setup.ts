import type { Card } from '../models/Card.ts';
import type { GameState } from '../models/GameState.ts';
import type { Player } from '../models/Player.ts';
import type { Room } from '../models/Room.ts';
import { DeckManager } from '../DeckManager.ts';

const CARD_PATH = '/cards/exploding-kittens';

interface CardSpec {
  id: string;
  name: string;
  cardType: Card['cardType'];
  effect: string;
  description: string;
  copies: number;
  variantCount?: number;
}

const CARD_SPECS: CardSpec[] = [
  {
    id: 'exploding_kitten',
    name: 'Exploding Kitten',
    cardType: 'exploding_kitten',
    effect: 'explode',
    description: 'Explota si no puedes jugar un Defuse.',
    copies: 4,
    variantCount: 13,
  },
  {
    id: 'defuse',
    name: 'Defuse',
    cardType: 'defuse',
    effect: 'defuse',
    description: 'Evita una explosión.',
    copies: 6,
    variantCount: 18,
  },
  {
    id: 'attack',
    name: 'Attack',
    cardType: 'action',
    effect: 'attack',
    description: 'Termina tu turno y añade dos turnos al siguiente jugador.',
    copies: 4,
    variantCount: 8,
  },
  {
    id: 'nope',
    name: 'Nope',
    cardType: 'action',
    effect: 'nope',
    description: 'Cancela una acción.',
    copies: 5,
    variantCount: 10,
  },
  {
    id: 'skip',
    name: 'Skip',
    cardType: 'action',
    effect: 'skip',
    description: 'Termina tu turno sin robar.',
    copies: 4,
    variantCount: 8,
  },
  {
    id: 'favor',
    name: 'Favor',
    cardType: 'action',
    effect: 'favor',
    description: 'Obliga a otro jugador a darte una carta.',
    copies: 4,
    variantCount: 6,
  },
  {
    id: 'shuffle',
    name: 'Shuffle',
    cardType: 'action',
    effect: 'shuffle',
    description: 'Baraja el mazo de robo.',
    copies: 4,
    variantCount: 8,
  },
  {
    id: 'see_the_future',
    name: 'See the Future',
    cardType: 'action',
    effect: 'see_the_future',
    description: 'Mira las tres cartas superiores del mazo.',
    copies: 5,
    variantCount: 10,
  },
  {
    id: 'cattermelon',
    name: 'Cattermelon',
    cardType: 'cat',
    effect: 'cat_pair',
    description: 'Carta de gato para combinaciones.',
    copies: 4,
  },
  {
    id: 'beard_cat',
    name: 'Beard Cat',
    cardType: 'cat',
    effect: 'cat_pair',
    description: 'Carta de gato para combinaciones.',
    copies: 4,
  },
  {
    id: 'hairy_potato_cat',
    name: 'Hairy Potato Cat',
    cardType: 'cat',
    effect: 'cat_pair',
    description: 'Carta de gato para combinaciones.',
    copies: 4,
  },
  {
    id: 'rainbow_ralphing_cat',
    name: 'Rainbow-Ralphing Cat',
    cardType: 'cat',
    effect: 'cat_pair',
    description: 'Carta de gato para combinaciones.',
    copies: 4,
  },
  {
    id: 'tacocat',
    name: 'Tacocat',
    cardType: 'cat',
    effect: 'cat_pair',
    description: 'Carta de gato para combinaciones.',
    copies: 4,
  },
];

function createCards(): Card[] {
  return CARD_SPECS.flatMap((spec) =>
    Array.from({ length: spec.copies }, (_, index) => {
      const variantNumber = spec.variantCount
        ? (index % spec.variantCount) + 1
        : undefined;
      const variantId = variantNumber ? `${spec.id}_${variantNumber}` : spec.id;
      const filename = variantNumber
        ? `${spec.id}_${variantNumber}.jpg`
        : `${spec.id}.jpg`;

      return {
        uid: `${spec.id}__${index + 1}`,
        id: spec.id,
        variantId,
        name: spec.name,
        cardType: spec.cardType,
        image: `${CARD_PATH}/${filename}`,
        description: spec.description,
        effect: spec.effect,
        copies: 1,
        expansion: 'exploding-kittens-base',
      };
    }),
  );
}

function resetPlayer(player: Player): Player {
  return {
    ...player,
    hand: [],
    stable: [],
    upgrades: [],
    downgrades: [],
  };
}

export function createExplodingKittensState(room: Room): GameState {
  const allCards = createCards();
  const kittens = allCards.filter((card) => card.id === 'exploding_kitten');
  const defuses = allCards.filter((card) => card.id === 'defuse');
  const drawCards = allCards.filter(
    (card) => card.id !== 'exploding_kitten' && card.id !== 'defuse',
  );
  const deck = new DeckManager(drawCards);
  const defuseDeck = new DeckManager(defuses);
  deck.shuffle();
  defuseDeck.shuffle();
  const players = room.players.map(resetPlayer);

  for (const player of players) {
     const defuse = defuseDeck.draw();
    if (defuse) player.hand.push(defuse);

    for (let cardIndex = 0; cardIndex < 7; cardIndex += 1) {
      const card = deck.draw();
      if (card) player.hand.push(card);
    }
  }

   deck.drawPile.push(
     ...defuseDeck.drawPile,
     ...kittens.slice(0, Math.max(0, players.length - 1)),
   );
  deck.shuffle();

  return {
    roomCode: room.code,
    started: true,
    turn: 1,
    currentPlayer: 0,
    players,
    deck: deck.drawPile,
    nursery: [],
    discard: [],
    phase: 'DRAW',
    actionUsed: false,
    turnsRemaining: 1,
    log: [],
    chat: [],
    eliminatedPlayers: [],
  };
}
