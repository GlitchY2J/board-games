import { useEffect, useState } from 'react';
import { socket } from '../services/socket';
import type { GameState } from '../types/GameState';
import Deck from '../components/game/Deck';
import DiscardPile from '../components/game/DiscardPile';
import Hand from '../components/game/Hand';
import Stable from '../components/game/Stable';

export default function Game() {
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => {
    socket.on('game-started', (state: GameState) => {
      setGame(state);
    });

    return () => {
      socket.off('game-started');
    };
  }, []);

  if (!game) {
    return (
      <div style={{ padding: 40, color: 'white' }}>Esperando partida...</div>
    );
  }

  const me = game.players[0];

  return (
    <div style={{ padding: 30, color: 'white' }}>
      <h1>Unstable Unicorns</h1>
      <h2>Turno {game.turn}</h2>
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Deck remaining={game.deck.drawPile.length} />
        <DiscardPile count={game.deck.discardPile.length} />
      </div>
      <hr />
      <Stable />
      <hr />
      <Hand cards={me.hand} />
    </div>
  );
}
