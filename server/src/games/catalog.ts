import type { GameDefinition } from '../../../shared/types/GameDefinition.ts';
import { GameRegistry } from './GameRegistry.ts';
import { unstableUnicornsEngine } from './engines/unstableUnicornsEngine.ts';
import { explodingKittensEngine } from './engines/explodingKittensEngine.ts';

export const unstableUnicorns: GameDefinition = {
  id: 'unstable-unicorns',
  name: 'Unstable Unicorns',
  description: 'Construye tu establo de unicornios y derrota a tus rivales.',
  minPlayers: 2,
  maxPlayers: 8,
  available: true,
  versions: [
    {
      id: 'unstable-unicorns-base',
      gameId: 'unstable-unicorns',
      name: 'Juego base',
      description: 'La edición base de Unstable Unicorns.',
      available: true,
    },
  ],
  expansions: [
    {
      id: 'rainbow_apocalypse',
      gameId: 'unstable-unicorns',
      name: 'Rainbow Apocalypse',
      description: 'Añade las cartas de la expansión Rainbow Apocalypse al mazo.',
      versionIds: ['unstable-unicorns-base'],
      available: true,
    },
  ],
};

export const explodingKittens: GameDefinition = {
  id: 'exploding-kittens',
  name: 'Exploding Kittens',
  description: 'Evita explotar, usa tus cartas y sobrevive hasta el final.',
  minPlayers: 2,
  maxPlayers: 5,
  // Temporarily enabled while the game is being tested and completed.
  available: true,
  versions: [
    {
      id: 'exploding-kittens-base',
      gameId: 'exploding-kittens',
      name: 'Juego base',
      description: 'La edición base de Exploding Kittens.',
      available: true,
    },
  ],
  expansions: [],
};

export const gameRegistry = new GameRegistry();

gameRegistry.register(unstableUnicorns, unstableUnicornsEngine);
gameRegistry.register(explodingKittens, explodingKittensEngine);
