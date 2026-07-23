import './CenterArea.css';

export default function CenterArea() {
  return (
    <div className="center-area">
      <div className="pile">
        <h3>Nursery</h3>
        <div className="card-placeholder">🍼</div>
      </div>
      <div className="pile">
        <h3>Deck</h3>
        <div className="card-placeholder">🎴</div>
      </div>
      <div className="pile">
        <h3>Discard</h3>
        <div className="card-placeholder">🗑️</div>
      </div>
    </div>
  );
}
