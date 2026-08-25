export type GameId = string;
export type VersionId = string;
export type ExpansionId = string;

export interface GameVersionDefinition {
  id: VersionId;
  gameId: GameId;
  name: string;
  description: string;
  available: boolean;
}

export interface ExpansionDefinition {
  id: ExpansionId;
  gameId: GameId;
  name: string;
  description: string;
  versionIds?: VersionId[];
  available: boolean;
}

export interface GameDefinition {
  id: GameId;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  available: boolean;
  versions: GameVersionDefinition[];
  expansions: ExpansionDefinition[];
}

export interface RoomSettings {
  gameId: GameId | null;
  versionId: VersionId | null;
  expansionIds: ExpansionId[];
}
