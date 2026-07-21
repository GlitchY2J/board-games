import { useLocation } from 'react-router-dom';
import type { GameState } from '../types/GameState';
import Deck from '../components/game/Deck';
import DiscardPile from '../components/game/DiscardPile';
import Hand from '../components/game/Hand';
import Stable from '../components/game/Stable';

export default function Game() {
  const location = useLocation();
  const game = location.state?.gameState as GameState | undefined;

  if (!game) {
    return (
      <div style={{ padding: 40, color: 'white' }}>Esperando partida...</div>
    );
  }

  function playCard(cardId: string) {
    if (!game) return;

    const me = game.players[0];

    const index = me.hand.findIndex((c) => c.id === cardId);

    if (index === -1) return;

    const card = me.hand.splice(index, 1)[0];

    me.stable.push(card);

    setGame({ ...game });
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
      <Stable cards={me.stable} />
      <hr />
      <Hand cards={me.hand} onPlay={playCard} />
    </div>
  );
}
