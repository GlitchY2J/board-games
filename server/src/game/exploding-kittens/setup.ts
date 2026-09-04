import type { Card } from '../models/Card.ts';
import type { GameState } from '../models/GameState.ts';
import type { Player } from '../models/Player.ts';
import type { Room } from '../models/Room.ts';
import { DeckManager } from '../DeckManager.ts';

const CARD_PATH = '/cards/exploding-kittens/base';

interface CardSpec {
  id: string;
  name: string;
  cardType: Card['cardType'];
  effect: string;
  description: string;
  copies: number;
  variantCount?: number;
  extension?: 'jpg' | 'png';
  path?: string;
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

const IMPLODING_KITTENS_CARD_SPECS: CardSpec[] = [
  {
    id: 'imploding_kitten',
    name: 'Imploding Kitten',
    cardType: 'action',
    effect: 'reverse',
    description: 'Invierte el orden de los turnos y termina un turno.',
    copies: 1,
    extension: 'jpg',
    path: '/cards/exploding-kittens/imploding kittens',
  },
  {
    id: 'alter_the_future',
    name: 'Alter the Future',
    cardType: 'action',
    effect: 'alter_the_future',
    description: 'Carta de Imploding Kittens. Efecto pendiente de implementación.',
    copies: 4,
    variantCount: 4,
    extension: 'jpg',
    path: '/cards/exploding-kittens/imploding kittens',
  },
  {
    id: 'draw_from_the_bottom',
    name: 'Draw from the Bottom',
    cardType: 'action',
    effect: 'draw_from_the_bottom',
    description: 'Roba la carta del fondo del mazo y termina tu turno.',
    copies: 4,
    variantCount: 4,
    extension: 'png',
    path: '/cards/exploding-kittens/imploding kittens',
  },
  {
    id: 'feral_cat',
    name: 'Feral Cat',
    cardType: 'cat',
    effect: 'cat_pair',
    description: 'Carta de Imploding Kittens. Efecto pendiente de implementación.',
    copies: 4,
    extension: 'jpg',
    path: '/cards/exploding-kittens/imploding kittens',
  },
  {
    id: 'reverse',
    name: 'Reverse',
    cardType: 'action',
    effect: 'reverse',
    description: 'Invierte el orden de los turnos y termina un turno.',
    copies: 4,
    variantCount: 4,
    extension: 'jpg',
    path: '/cards/exploding-kittens/imploding kittens',
  },
  {
    id: 'targeted_attack',
    name: 'Targeted Attack',
    cardType: 'action',
    effect: 'targeted_attack',
    description: 'Elige a un jugador. Ese jugador debe cumplir 2 turnos.',
    copies: 3,
    variantCount: 3,
    extension: 'jpg',
    path: '/cards/exploding-kittens/imploding kittens',
  },
];

function createCards(includeImplodingKittens = false): Card[] {
  const cardSpecs = includeImplodingKittens
    ? [...CARD_SPECS, ...IMPLODING_KITTENS_CARD_SPECS]
    : CARD_SPECS;

  return cardSpecs.flatMap((spec) =>
    Array.from({ length: spec.copies }, (_, index) => {
      const variantNumber = spec.variantCount
        ? (index % spec.variantCount) + 1
        : undefined;
      const variantId = variantNumber ? `${spec.id}_${variantNumber}` : spec.id;
      const extension = spec.extension ?? 'jpg';
      const filename = variantNumber
        ? `${spec.id}_${variantNumber}.${extension}`
        : `${spec.id}.${extension}`;

      return {
        uid: `${spec.id}__${index + 1}`,
        id: spec.id,
        variantId,
        name: spec.name,
        cardType: spec.cardType,
        image: `${spec.path ?? CARD_PATH}/${filename}`,
        description: spec.description,
        effect: spec.effect,
        copies: 1,
        expansion: spec === CARD_SPECS.find((baseSpec) => baseSpec.id === spec.id)
          ? 'exploding-kittens-base'
          : 'imploding-kittens',
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
  const expansions = room.settings?.expansionIds ?? room.expansions ?? [];
  const hasImplodingKittens = expansions.includes('imploding_kittens');
  const allCards = createCards(hasImplodingKittens);
  const kittens = allCards.filter((card) => card.id === 'exploding_kitten');
  const implodingKittens = allCards.filter((card) => card.id === 'imploding_kitten');
  const defuses = allCards.filter((card) => card.id === 'defuse');
  const drawCards = allCards.filter(
    (card) =>
      card.id !== 'exploding_kitten' &&
      card.id !== 'imploding_kitten' &&
      card.id !== 'defuse',
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
       ...kittens.slice(
         0,
         hasImplodingKittens
           ? Math.max(1, players.length - 2)
           : Math.max(0, players.length - 1),
       ),
       ...(hasImplodingKittens ? implodingKittens : []),
   );
  deck.shuffle();

  return {
    roomCode: room.code,
    gameId: 'exploding-kittens',
    started: true,
    turn: 1,
    currentPlayer: 0,
    turnDirection: 1,
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
