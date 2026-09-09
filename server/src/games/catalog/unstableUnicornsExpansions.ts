import type { ExpansionDefinition } from '../../../../shared/types/GameDefinition.ts';

export const unstableUnicornsExpansions: ExpansionDefinition[] = [
  {
    id: 'rainbow_apocalypse',
    gameId: 'unstable-unicorns',
    name: 'Rainbow Apocalypse',
    description: 'Añade las cartas de la expansión Rainbow Apocalypse al mazo.',
    versionIds: ['unstable-unicorns-base'],
    available: true,
  },
  {
    id: 'nightmares',
    gameId: 'unstable-unicorns',
    name: 'Nightmares',
    description: 'Expansión de Unstable Unicorns actualmente en desarrollo.',
    versionIds: ['unstable-unicorns-base'],
    available: true,
    inProgress: true,
  },
];
