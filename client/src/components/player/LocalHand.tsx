import { useState } from 'react';
import type { GameState } from '../../types/GameState';
import CardFan from '../card/CardFan';
import './LocalHand.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isMyTurn: boolean;
  gamePhase: string;
  onPlay(cardId: string): void;
}

export default function LocalHand({
  player,
  isMyTurn,
  gamePhase,
  onPlay,
}: Props) {
  // const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  return (
    <CardFan
      cards={player.hand}
      isMyTurn={isMyTurn}
      gamePhase={gamePhase}
      onPlay={onPlay}
    />
  );
}
