import type { GameState } from '../../types/GameState';
import './PlayerInfo.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
}

export default function PlayerInfo({ player }: Props) {
  return (
    <div className="player-info">
      <div>{player.name}</div>
      <div>
        🦄 {player.stable.length} &nbsp;&nbsp; 🃏 {player.hand.length}
      </div>
    </div>
  );
}
