import type { GameState } from '../../types/GameState';
import CardFan from '../card/CardFan';
import './LocalHand.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isMyTurn: boolean;
  onPlay(cardId: string): void;
}

export default function LocalHand({ player, isMyTurn, onPlay }: Props) {
  return <CardFan cards={player.hand} isMyTurn={isMyTurn} onPlay={onPlay} />;
}
