import Deck from '../components/game/Deck';
import DiscardPile from '../components/game/DiscardPile';
import Hand from '../components/game/Hand';
import Stable from '../components/game/Stable';

export default function Game() {
  return (
    <div style={{ padding: 30, color: 'white' }}>
      <h1>Unstable Unicorns</h1>
      <h2>Turno 1</h2>
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Deck />
        <DiscardPile />
      </div>
      <hr />
      <Stable />
      <hr />
      <Hand />
    </div>
  );
}
