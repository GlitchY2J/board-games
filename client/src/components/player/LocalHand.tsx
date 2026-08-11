import type { GameState } from '../../types/GameState';
import CardFan from '../card/CardFan';
import './LocalHand.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isMyTurn: boolean;
  gamePhase: string;
  actionUsed: boolean;
  pendingPlay: boolean;
  onPlay(cardId: string): void;
}

export default function LocalHand({
  player,
  isMyTurn,
  gamePhase,
  actionUsed,
  pendingPlay,
  onPlay,
}: Props) {
  // const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  return (
    <CardFan
      cards={player.hand}
      isMyTurn={isMyTurn}
      gamePhase={gamePhase}
      actionUsed={actionUsed}
      pendingPlay={pendingPlay}
      onPlay={onPlay}
    />
  );
}
